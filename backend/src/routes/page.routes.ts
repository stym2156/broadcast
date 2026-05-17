import { Router } from 'express';
import { z } from 'zod';
import { Page } from '../models/Page';
import { authRequired, type AuthedRequest } from '../middleware/auth';

export const pageRouter = Router();

pageRouter.use(authRequired);

pageRouter.get('/', async (req: AuthedRequest, res, next) => {
  try {
    // Strip access tokens — they're server-only secrets used to call the Graph API.
    // The frontend never needs them; exposing them would let any browser tab impersonate the page.
    const pages = await Page.find({ owner: req.userId })
      .select('-accessToken')
      .sort({ createdAt: -1 });
    res.json({ ok: true, pages });
  } catch (e) {
    next(e);
  }
});

const createPageSchema = z.object({
  name: z.string().min(1),
  channel: z.enum(['facebook', 'whatsapp']).default('facebook'),
  fbPageId: z.string().optional(),
  phoneNumber: z.string().optional(),
  accessToken: z.string().optional(),
  waBusinessAccountId: z.string().optional(),
});

pageRouter.post('/', async (req: AuthedRequest, res, next) => {
  try {
    const data = createPageSchema.parse(req.body);
    const created = await Page.create({
      owner: req.userId,
      channel: data.channel,
      fbPageId: data.fbPageId ?? String(Math.floor(Math.random() * 1_000_000_000)),
      name: data.name,
      phoneNumber: data.phoneNumber ?? null,
      accessToken: data.accessToken ?? null,
      waBusinessAccountId: data.waBusinessAccountId ?? null,
    });
    // Re-fetch with accessToken stripped — never echo a token back to the browser.
    const page = await Page.findById(created._id).select('-accessToken');
    res.json({ ok: true, page });
  } catch (e) {
    next(e);
  }
});

pageRouter.delete('/:id', async (req: AuthedRequest, res, next) => {
  try {
    await Page.deleteOne({ _id: req.params.id, owner: req.userId });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
