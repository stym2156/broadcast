import { Router } from 'express';
import { Types } from 'mongoose';
import { Broadcast } from '../models/Broadcast';
import { Page } from '../models/Page';
import { Customer } from '../models/Customer';
import { Conversation } from '../models/Conversation';
import { authRequired, type AuthedRequest } from '../middleware/auth';

export const statsRouter = Router();

statsRouter.use(authRequired);

statsRouter.get('/user-dashboard', async (req: AuthedRequest, res, next) => {
  try {
    const owner = req.userId;
    if (!owner) return res.json({ ok: false, error: 'No user' });
    const ownerObjectId = new Types.ObjectId(owner);

    const [totalSentAgg, pages, customers, activeBroadcasts, unreadAgg, recent, recentBroadcasts] = await Promise.all([
      Broadcast.aggregate([{ $match: { owner: ownerObjectId } }, { $group: { _id: null, total: { $sum: '$sentCount' } } }]),
      Page.countDocuments({ owner }),
      Customer.countDocuments({ owner }),
      Broadcast.countDocuments({ owner, status: { $in: ['scheduled', 'sending'] } }),
      Conversation.aggregate([{ $match: { owner: ownerObjectId } }, { $group: { _id: null, total: { $sum: '$unreadCount' } } }]),
      Broadcast.find({ owner }).populate('pages', 'name').sort({ createdAt: -1 }).limit(5).lean({ virtuals: false }),
      Broadcast.find({ owner, createdAt: { $gte: new Date(Date.now() - 7 * 86_400_000) } })
        .select('sentCount createdAt')
        .lean(),
    ]);

    // 7-day sent-count buckets (newest is rightmost).
    const buckets = new Array(7).fill(0);
    const dayLabels = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
    for (const b of recentBroadcasts) {
      const ageDays = Math.floor((Date.now() - new Date(b.createdAt as Date).getTime()) / 86_400_000);
      if (ageDays >= 0 && ageDays < 7) buckets[6 - ageDays] += (b as { sentCount?: number }).sentCount ?? 0;
    }
    const today = new Date().getDay();
    const weekly = buckets.map((sent, i) => ({ day: dayLabels[(today - 6 + i + 7) % 7], sent }));

    res.json({
      ok: true,
      stats: {
        totalSent: totalSentAgg[0]?.total ?? 0,
        pages,
        customers,
        activeBroadcasts,
        unreadMessages: unreadAgg[0]?.total ?? 0,
        weekly,
        recent: recent.map((b: Record<string, unknown>) => {
          const pgs = (b.pages ?? []) as Array<{ id?: string; _id?: unknown; name?: string }>;
          return {
            id: String((b as { id?: string; _id?: unknown }).id ?? (b as { _id?: unknown })._id),
            title: b.title,
            message: b.message,
            imageUrl: b.imageUrl ?? null,
            pages: pgs.map((p) => String(p.id ?? p._id)),
            pageNames: pgs.map((p) => p.name ?? ''),
            targetTags: b.targetTags ?? [],
            scheduledAt: b.scheduledAt ?? null,
            status: b.status,
            sentCount: b.sentCount ?? 0,
            failedCount: b.failedCount ?? 0,
            totalRecipients: b.totalRecipients ?? 0,
            createdAt: b.createdAt,
            completedAt: b.completedAt ?? null,
          };
        }),
      },
    });
  } catch (e) {
    next(e);
  }
});
