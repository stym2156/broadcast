import { Router } from 'express';
import { Customer } from '../models/Customer';
import { authRequired, type AuthedRequest } from '../middleware/auth';

export const customerRouter = Router();

customerRouter.use(authRequired);

interface PopulatedPage { id?: string; _id?: unknown; name?: string }

function serialize(c: Record<string, unknown>) {
  const page = c.page as PopulatedPage | string | undefined;
  return {
    id: c.id ?? String(c._id),
    pageId: typeof page === 'string' ? page : String(page?.id ?? page?._id ?? ''),
    pageName: typeof page === 'object' && page !== null ? page.name ?? '' : '',
    psid: c.psid,
    name: c.name ?? '',
    avatar: c.avatar ?? null,
    tags: c.tags ?? [],
    lastInteractionAt: c.lastInteractionAt,
  };
}

customerRouter.get('/', async (req: AuthedRequest, res, next) => {
  try {
    const filter: Record<string, unknown> = { owner: req.userId };
    if (req.query.tag) filter.tags = String(req.query.tag);
    if (req.query.page) filter.page = String(req.query.page);
    const customers = await Customer.find(filter)
      .populate('page', 'name')
      .sort({ lastInteractionAt: -1 })
      .limit(500)
      .lean({ virtuals: false });
    res.json({ ok: true, customers: customers.map(serialize) });
  } catch (e) {
    next(e);
  }
});

customerRouter.patch('/:id/tags', async (req: AuthedRequest, res, next) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      { tags: req.body.tags ?? [] },
      { new: true }
    );
    res.json({ ok: true, customer });
  } catch (e) {
    next(e);
  }
});
