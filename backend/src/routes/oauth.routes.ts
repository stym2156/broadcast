import { Router } from 'express';
import bcrypt from 'bcryptjs';
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
import { authRequired, type AuthedRequest } from '../middleware/auth';
import crypto from 'crypto';

export const oauthRouter = Router();

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
 * We exchange it for a long-lived user token, upsert the user, and return our JWT.
 */
oauthRouter.post('/facebook/callback', async (req, res, next) => {
  try {
    const code = String(req.body.code ?? '');
    if (!code) return res.status(400).json({ ok: false, error: 'Missing code' });
    if (!isFbConfigured()) return res.status(503).json({ ok: false, error: 'Facebook not configured' });

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
      await user.save();
    }

    const token = signToken({ sub: String(user._id), role: user.role as 'user' | 'admin' });
    res.json({
      ok: true,
      token,
      user: { id: String(user._id), email: user.email, name: user.name, role: user.role },
      /** Frontend can immediately call /api/oauth/facebook/pages with this token to import pages. */
      fbAccessToken: longLived,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * Step 3 (after login): user picks which managed pages to connect.
 * Frontend passes the user's `fbAccessToken` back in the body.
 */
oauthRouter.post('/facebook/pages', authRequired, async (req: AuthedRequest, res, next) => {
  try {
    const fbAccessToken = String(req.body.fbAccessToken ?? '');
    if (!fbAccessToken) return res.status(400).json({ ok: false, error: 'Missing fbAccessToken' });
    const pages = await listManagedPages(fbAccessToken);
    res.json({ ok: true, pages });
  } catch (e) {
    next(e);
  }
});

oauthRouter.post('/facebook/pages/connect', authRequired, async (req: AuthedRequest, res, next) => {
  try {
    const { pageId, name, accessToken } = req.body as { pageId: string; name: string; accessToken: string };
    if (!pageId || !accessToken) return res.status(400).json({ ok: false, error: 'Missing fields' });

    const page = await Page.findOneAndUpdate(
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

    res.json({ ok: true, page });
  } catch (e) {
    next(e);
  }
});
