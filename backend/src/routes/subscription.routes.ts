import { Router } from 'express';
import { Subscription } from '../models/Subscription';
import { Plan } from '../models/Plan';
import { authRequired, type AuthedRequest } from '../middleware/auth';
import { HttpError } from '../middleware/error';

export const subscriptionRouter = Router();

interface PopulatedPlan {
  id?: string;
  _id?: unknown;
  code?: string;
  name?: string;
  months?: number;
  price?: number;
  pricePerMonth?: number;
  savingsPercent?: number;
  features?: string[];
}

function serializePlan(p: PopulatedPlan) {
  return {
    id: String(p.id ?? p._id ?? ''),
    code: p.code ?? '',
    name: p.name ?? '',
    months: p.months ?? 0,
    price: p.price ?? 0,
    pricePerMonth: p.pricePerMonth ?? 0,
    savingsPercent: p.savingsPercent ?? 0,
    features: p.features ?? [],
  };
}

function serializeSubscription(s: Record<string, unknown>) {
  const plan = s.plan as PopulatedPlan | string | undefined;
  return {
    id: String((s as { id?: string; _id?: unknown }).id ?? s._id),
    plan: plan && typeof plan === 'object' ? serializePlan(plan) : null,
    startedAt: s.startedAt,
    expiresAt: s.expiresAt,
    status: s.status,
    amountPaid: s.amountPaid ?? 0,
    autoRenew: s.autoRenew ?? false,
  };
}

subscriptionRouter.get('/plans', async (_req, res, next) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ months: 1 }).lean({ virtuals: false });
    res.json({ ok: true, plans: plans.map(serializePlan) });
  } catch (e) {
    next(e);
  }
});

subscriptionRouter.use(authRequired);

subscriptionRouter.get('/me', async (req: AuthedRequest, res, next) => {
  try {
    const active = await Subscription.findOne({ user: req.userId, status: { $in: ['trial', 'active'] } })
      .populate('plan')
      .sort({ expiresAt: -1 })
      .lean({ virtuals: false });
    const history = await Subscription.find({ user: req.userId })
      .populate('plan')
      .sort({ createdAt: -1 })
      .lean({ virtuals: false });
    res.json({
      ok: true,
      active: active ? serializeSubscription(active) : null,
      history: history.map(serializeSubscription),
    });
  } catch (e) {
    next(e);
  }
});

subscriptionRouter.post('/subscribe', async (req: AuthedRequest, res, next) => {
  try {
    const plan = await Plan.findById(req.body.planId);
    if (!plan) throw new HttpError(404, 'Plan not found');
    const startedAt = new Date();
    const expiresAt = new Date(startedAt);
    expiresAt.setMonth(expiresAt.getMonth() + plan.months);
    const sub = await Subscription.create({
      user: req.userId,
      plan: plan._id,
      startedAt,
      expiresAt,
      status: 'active',
      amountPaid: plan.price,
      paymentRef: 'mock-' + Date.now(),
    });
    const populated = await Subscription.findById(sub._id).populate('plan').lean({ virtuals: false });
    res.json({ ok: true, subscription: populated ? serializeSubscription(populated) : null });
  } catch (e) {
    next(e);
  }
});
