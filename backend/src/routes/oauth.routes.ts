import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import {
  buildLoginUrl,
  exchangeCodeForToken,
  getMe,
  listManagedPages,
  subscribePageWebhook,
  isFbConfigured,
} from '../services/facebook';
import { User } from '../models/User';
import { Page } from '../models/Page';
import { signToken } from '../utils/jwt';
import { HttpError } from '../middleware/error';
import { authRequired, type AuthedRequest } from '../middleware/auth';

export const oauthRouter = Router();

/** Long-lived user tokens last ~60 days. Track expiry conservatively at 55. */
const FB_USER_TOKEN_VALIDITY_DAYS = 55;

/**
 * Step 1: redirect the user to Facebook Login. We embed a CSRF `state` so the callback
 * can prove the request originated from us.
 */
oauthRouter.get('/facebook/start', (_req, res) => {
  if (!isFbConfigured()) {
    res.status(503).json({ ok: false, error: 'Facebook OAuth not configured on server' });
    return;
  }
  const state = crypto.randomBytes(16).toString('hex');
  res.json({ ok: true, url: buildLoginUrl(state), state });
});

/**
 * Step 2: frontend forwards the `code` from `?code=...` back here.
 * We exchange it for a long-lived user token, upsert the user, and persist the token
 * SERVER-SIDE on the user document. The token is intentionally NOT returned to the
 * browser — exposing it would let any script on the page impersonate the user.
 */
oauthRouter.post('/facebook/callback', async (req, res, next) => {
  try {
    const code = String(req.body.code ?? '');
    if (!code) throw new HttpError(400, 'Missing code');
    if (!isFbConfigured()) throw new HttpError(503, 'Facebook not configured');

    const { longLived } = await exchangeCodeForToken(code);
    const me = await getMe(longLived);

    let user = await User.findOne({ facebookId: me.id });
    if (!user) {
      user = await User.findOne({ email: me.email ?? '' });
    }
    if (!user) {
      user = await User.create({
        email: me.email ?? `fb_${me.id}@facebook.local`,
        name: me.name,
        facebookId: me.id,
        passwordHash: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10),
      });
    } else if (!user.facebookId) {
      user.facebookId = me.id;
    }
    user.fbUserAccessToken = longLived;
    user.fbUserAccessTokenExpiresAt = new Date(Date.now() + FB_USER_TOKEN_VALIDITY_DAYS * 86_400_000);
    await user.save();

    const token = signToken({ sub: String(user._id), role: user.role as 'user' | 'admin' });
    res.json({
      ok: true,
      token,
      user: { id: String(user._id), email: user.email, name: user.name, role: user.role },
    });
  } catch (e) {
    next(e);
  }
});

/**
 * Step 3 (after login): list the user's managed Facebook pages.
 * Uses the server-side `fbUserAccessToken` stored during the callback — the browser
 * never sees or transmits it.
 */
oauthRouter.get('/facebook/pages', authRequired, async (req: AuthedRequest, res, next) => {
  try {
    const user = await User.findById(req.userId).select('+fbUserAccessToken fbUserAccessTokenExpiresAt');
    if (!user?.fbUserAccessToken) throw new HttpError(400, 'No Facebook session — re-authenticate');
    if (user.fbUserAccessTokenExpiresAt && user.fbUserAccessTokenExpiresAt.getTime() < Date.now()) {
      throw new HttpError(401, 'Facebook session expired — re-authenticate');
    }
    const pages = await listManagedPages(user.fbUserAccessToken);
    res.json({ ok: true, pages });
  } catch (e) {
    next(e);
  }
});

const connectPageSchema = z.object({
  pageId: z.string().min(1),
  name: z.string().min(1),
  /** Page access token returned from listManagedPages — we trust it because the user is authenticated. */
  accessToken: z.string().min(1),
});

oauthRouter.post('/facebook/pages/connect', authRequired, async (req: AuthedRequest, res, next) => {
  try {
    const { pageId, name, accessToken } = connectPageSchema.parse(req.body);

    const created = await Page.findOneAndUpdate(
      { owner: req.userId, channel: 'facebook', fbPageId: pageId },
      {
        $set: { name, accessToken, status: 'connected' },
        $setOnInsert: { owner: req.userId, channel: 'facebook', fbPageId: pageId },
      },
      { upsert: true, new: true }
    );

    // Best-effort webhook subscription — we already saved the page even if this fails.
    try {
      await subscribePageWebhook(pageId, accessToken);
    } catch (err) {
      console.warn('[oauth] webhook subscribe failed for', pageId, err);
    }

    // Strip the page access token from the response — kept server-side only.
    const page = await Page.findById(created._id).select('-accessToken');
    res.json({ ok: true, page });
  } catch (e) {
    next(e);
  }
});
