import { Router } from 'express';
import { User } from '../models/User';
import { Page } from '../models/Page';
import { Broadcast } from '../models/Broadcast';
import { Subscription } from '../models/Subscription';
import { Plan } from '../models/Plan';
import { authRequired, adminRequired } from '../middleware/auth';

export const adminRouter = Router();

adminRouter.use(authRequired, adminRequired);

adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const [users, activeUsers, broadcasts, activeSubs, revenueAgg, planAgg, recentUsers, recentBroadcasts] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ status: 'active' }),
        Broadcast.countDocuments(),
        Subscription.countDocuments({ status: 'active' }),
        Subscription.aggregate([{ $group: { _id: null, total: { $sum: '$amountPaid' } } }]),
        Subscription.aggregate([
          { $group: { _id: '$plan', count: { $sum: 1 } } },
          { $lookup: { from: 'plans', localField: '_id', foreignField: '_id', as: 'plan' } },
          { $unwind: '$plan' },
          { $project: { name: '$plan.name', value: '$count' } },
        ]),
        User.find().select('-passwordHash').sort({ createdAt: -1 }).limit(5).lean({ virtuals: false }),
        Broadcast.find().populate('owner', 'name email').sort({ createdAt: -1 }).limit(5).lean({ virtuals: false }),
      ]);

    // Build a 7-day revenue series (based on subscriptions created in the last 7 days).
    const sinceMs = Date.now() - 7 * 86_400_000;
    const recentSubs = await Subscription.find({ createdAt: { $gte: new Date(sinceMs) } })
      .select('amountPaid createdAt')
      .lean();
    const dayLabels = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
    const buckets = new Array(7).fill(0);
    for (const s of recentSubs) {
      const age = Math.floor((Date.now() - new Date(s.createdAt as Date).getTime()) / 86_400_000);
      if (age >= 0 && age < 7) buckets[6 - age] += (s as { amountPaid?: number }).amountPaid ?? 0;
    }
    const today = new Date().getDay();
    const revenueWeek = buckets.map((revenue, i) => ({ day: dayLabels[(today - 6 + i + 7) % 7], revenue }));

    res.json({
      ok: true,
      stats: {
        users,
        activeUsers,
        broadcasts,
        sentToday: 0,
        activeSubscriptions: activeSubs,
        mrr: 0,
        revenueTotal: revenueAgg[0]?.total ?? 0,
        revenueWeek,
        planDistribution: planAgg.map((p: { name: string; value: number }) => ({ name: p.name, value: p.value })),
        recentUsers: recentUsers.map((u: Record<string, unknown>) => ({
          id: String((u as { id?: string; _id?: unknown }).id ?? u._id),
          email: u.email,
          name: u.name,
          role: u.role,
          status: u.status,
          plan: '-',
          pages: 0,
          joinedAt: u.createdAt,
          lastLoginAt: u.updatedAt,
        })),
        recentBroadcasts: recentBroadcasts.map((b: Record<string, unknown>) => {
          const owner = b.owner as { name?: string; email?: string } | undefined;
          return {
            id: String((b as { id?: string; _id?: unknown }).id ?? b._id),
            ownerName: owner?.name ?? '',
            ownerEmail: owner?.email ?? '',
            title: b.title,
            status: b.status,
            sentCount: b.sentCount ?? 0,
            totalRecipients: b.totalRecipients ?? 0,
            createdAt: b.createdAt,
          };
        }),
      },
    });
  } catch (e) {
    next(e);
  }
});

adminRouter.get('/users', async (_req, res, next) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 }).limit(200).lean({ virtuals: false });
    // Attach quick page count per user.
    const out = await Promise.all(
      users.map(async (u: Record<string, unknown>) => {
        const pages = await Page.countDocuments({ owner: u._id });
        return {
          id: String((u as { id?: string; _id?: unknown }).id ?? u._id),
          email: u.email,
          name: u.name,
          role: u.role,
          status: u.status,
          plan: '-',
          pages,
          joinedAt: u.createdAt,
          lastLoginAt: u.updatedAt,
        };
      })
    );
    res.json({ ok: true, users: out });
  } catch (e) {
    next(e);
  }
});

adminRouter.patch('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-passwordHash');
    res.json({ ok: true, user });
  } catch (e) {
    next(e);
  }
});

adminRouter.get('/subscriptions', async (_req, res, next) => {
  try {
    const subs = await Subscription.find()
      .populate('user', 'email name')
      .populate('plan')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean({ virtuals: false });
    res.json({
      ok: true,
      subscriptions: subs.map((s: Record<string, unknown>) => {
        const user = s.user as { name?: string; email?: string } | undefined;
        const plan = s.plan as { name?: string } | undefined;
        return {
          id: String((s as { id?: string; _id?: unknown }).id ?? s._id),
          userName: user?.name ?? '',
          userEmail: user?.email ?? '',
          planName: plan?.name ?? '',
          amount: s.amountPaid ?? 0,
          status: s.status,
          startedAt: s.startedAt,
          expiresAt: s.expiresAt,
        };
      }),
    });
  } catch (e) {
    next(e);
  }
});

adminRouter.get('/broadcasts', async (_req, res, next) => {
  try {
    const items = await Broadcast.find()
      .populate('owner', 'email name')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean({ virtuals: false });
    res.json({
      ok: true,
      broadcasts: items.map((b: Record<string, unknown>) => {
        const owner = b.owner as { name?: string; email?: string } | undefined;
        return {
          id: String((b as { id?: string; _id?: unknown }).id ?? b._id),
          ownerName: owner?.name ?? '',
          ownerEmail: owner?.email ?? '',
          title: b.title,
          status: b.status,
          sentCount: b.sentCount ?? 0,
          totalRecipients: b.totalRecipients ?? 0,
          createdAt: b.createdAt,
        };
      }),
    });
  } catch (e) {
    next(e);
  }
});

adminRouter.get('/plans', async (_req, res, next) => {
  try {
    const plans = await Plan.find().sort({ months: 1 }).lean({ virtuals: false });
    const subs = await Subscription.aggregate([{ $group: { _id: '$plan', count: { $sum: 1 } } }]);
    const subCount = new Map(subs.map((s: { _id: unknown; count: number }) => [String(s._id), s.count]));
    res.json({
      ok: true,
      plans: plans.map((p: Record<string, unknown>) => ({
        id: String((p as { id?: string; _id?: unknown }).id ?? p._id),
        name: p.name,
        months: p.months,
        price: p.price,
        pricePerMonth: p.pricePerMonth,
        savingsPercent: p.savingsPercent ?? 0,
        isActive: p.isActive ?? true,
        subscribers: subCount.get(String((p as { _id?: unknown })._id)) ?? 0,
      })),
    });
  } catch (e) {
    next(e);
  }
});

adminRouter.post('/plans', async (req, res, next) => {
  try {
    const plan = await Plan.create(req.body);
    res.json({ ok: true, plan });
  } catch (e) {
    next(e);
  }
});

adminRouter.patch('/plans/:id', async (req, res, next) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ ok: true, plan });
  } catch (e) {
    next(e);
  }
});
