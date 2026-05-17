import { Router } from 'express';
import { z } from 'zod';
import { Broadcast } from '../models/Broadcast';
import { Page } from '../models/Page';
import { Customer } from '../models/Customer';
import { authRequired, type AuthedRequest } from '../middleware/auth';
import { HttpError } from '../middleware/error';

export const broadcastRouter = Router();

broadcastRouter.use(authRequired);

interface PopulatedPage { id?: string; _id?: unknown; name?: string }

function serialize(b: Record<string, unknown>) {
  const pages = (b.pages ?? []) as Array<PopulatedPage | string>;
  return {
    id: b.id ?? String(b._id),
    title: b.title,
    message: b.message,
    imageUrl: b.imageUrl ?? null,
    pages: pages.map((p) => (typeof p === 'string' ? p : String(p.id ?? p._id))),
    pageNames: pages.map((p) => (typeof p === 'string' ? '' : (p.name ?? ''))),
    targetTags: b.targetTags ?? [],
    scheduledAt: b.scheduledAt,
    status: b.status,
    sentCount: b.sentCount ?? 0,
    failedCount: b.failedCount ?? 0,
    totalRecipients: b.totalRecipients ?? 0,
    createdAt: b.createdAt,
    completedAt: b.completedAt ?? null,
  };
}

broadcastRouter.get('/', async (req: AuthedRequest, res, next) => {
  try {
    const items = await Broadcast.find({ owner: req.userId })
      .populate('pages', 'name')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean({ virtuals: false });
    res.json({ ok: true, broadcasts: items.map(serialize) });
  } catch (e) {
    next(e);
  }
});

const createSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  pages: z.array(z.string()).min(1),
  targetTags: z.array(z.string()).default([]),
  scheduledAt: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
});

broadcastRouter.post('/', async (req: AuthedRequest, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const ownedPages = await Page.find({ _id: { $in: data.pages }, owner: req.userId }).select('_id');
    if (ownedPages.length !== data.pages.length) throw new HttpError(400, 'Some pages do not belong to you');
    const recipientFilter: Record<string, unknown> = { owner: req.userId, page: { $in: data.pages } };
    if (data.targetTags.length > 0) recipientFilter.tags = { $in: data.targetTags };
    const totalRecipients = await Customer.countDocuments(recipientFilter);
    const item = await Broadcast.create({
      owner: req.userId,
      pages: data.pages,
      title: data.title,
      message: data.message,
      imageUrl: data.imageUrl ?? null,
      targetTags: data.targetTags,
      scheduledAt: data.scheduledAt ?? null,
      status: data.scheduledAt ? 'scheduled' : 'sending',
      totalRecipients,
    });
    const populated = await Broadcast.findById(item._id).populate('pages', 'name').lean({ virtuals: false });
    res.json({ ok: true, broadcast: populated ? serialize(populated) : null });
  } catch (e) {
    next(e);
  }
});

broadcastRouter.get('/:id', async (req: AuthedRequest, res, next) => {
  try {
    const item = await Broadcast.findOne({ _id: req.params.id, owner: req.userId })
      .populate('pages', 'name')
      .lean({ virtuals: false });
    res.json({ ok: true, broadcast: item ? serialize(item) : null });
  } catch (e) {
    next(e);
  }
});

broadcastRouter.delete('/:id', async (req: AuthedRequest, res, next) => {
  try {
    await Broadcast.deleteOne({ _id: req.params.id, owner: req.userId });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
