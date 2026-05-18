import { Router } from 'express';
import { z } from 'zod';
import { Broadcast } from '../models/Broadcast';
import { Page } from '../models/Page';
import { Customer } from '../models/Customer';
import { authRequired, type AuthedRequest } from '../middleware/auth';
import { HttpError } from '../middleware/error';
import { sendMessengerMessage, isFbConfigured } from '../services/facebook';
import { sendText as waSendText, isWaConfigured } from '../services/whatsapp';

export const broadcastRouter = Router();

broadcastRouter.use(authRequired);

interface PopulatedPage {
  id?: string;
  _id?: unknown;
  name?: string;
  channel?: 'facebook' | 'whatsapp';
  accessToken?: string;
  phoneNumber?: string;
}

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

/**
 * Background worker that walks every recipient and delivers the broadcast message via the
 * appropriate channel (FB Messenger or WhatsApp Cloud). Updates the Broadcast document's
 * `sentCount` / `failedCount` every 10 sends so the frontend's 5-second polling sees progress.
 *
 * Constraints we respect at runtime (so Meta doesn't reject our app):
 *   - Facebook: messages within the recipient's 24-hour customer-service window use
 *     `messaging_type: 'RESPONSE'`. Outside, we attempt `MESSAGE_TAG: HUMAN_AGENT`, which
 *     requires Meta approval — fails gracefully if not yet granted.
 *   - WhatsApp: free-form text only works inside the 24-hour window. Outside, we skip the
 *     recipient (proper template support is composer-side work — TODO).
 */
async function runBroadcast(broadcastId: string): Promise<void> {
  const broadcast = await Broadcast.findById(broadcastId);
  if (!broadcast) {
    console.warn('[broadcast] runBroadcast: not found', broadcastId);
    return;
  }

  const recipientFilter: Record<string, unknown> = {
    owner: broadcast.owner,
    page: { $in: broadcast.pages },
  };
  if (broadcast.targetTags && broadcast.targetTags.length > 0) {
    recipientFilter.tags = { $in: broadcast.targetTags };
  }

  const customers = await Customer.find(recipientFilter).populate<{ page: PopulatedPage }>(
    'page',
    'channel accessToken phoneNumber name'
  );

  console.log(`[broadcast] sending ${broadcast._id} to ${customers.length} recipients`);

  const WINDOW_MS = 24 * 3600 * 1000;
  let sent = 0;
  let failed = 0;

  for (const customer of customers) {
    const page = customer.page as unknown as PopulatedPage;
    try {
      if (!page || !page.channel) {
        failed++;
        continue;
      }
      const lastInteraction = customer.lastInteractionAt as Date | null;
      const inWindow = lastInteraction && Date.now() - new Date(lastInteraction).getTime() < WINDOW_MS;

      const psid = customer.psid as string | undefined;
      const message = broadcast.message as string;
      if (page.channel === 'facebook') {
        if (!isFbConfigured() || !page.accessToken || !psid) {
          failed++;
          continue;
        }
        await sendMessengerMessage({
          pageAccessToken: page.accessToken,
          recipientPsid: psid,
          text: message,
          messagingType: inWindow ? 'RESPONSE' : 'MESSAGE_TAG',
          tag: inWindow ? undefined : 'HUMAN_AGENT',
        });
        sent++;
      } else if (page.channel === 'whatsapp') {
        if (!isWaConfigured() || !psid) {
          failed++;
          continue;
        }
        if (!inWindow) {
          // Skip rather than fail noisily — template-based outside-window sends need a
          // composer UI for picking the approved template and parameters, which is a
          // separate feature.
          failed++;
          continue;
        }
        await waSendText({ to: psid, text: message, accessToken: page.accessToken });
        sent++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error('[broadcast] send failed for customer', String(customer._id), (err as Error).message);
      failed++;
    }

    // Persist progress every 10 sends + check if the user has cancelled (deleted) the
    // broadcast while it was in flight. If the record is gone, stop immediately so we
    // don't keep spamming customers after the operator hit "หยุดและลบ".
    if ((sent + failed) % 10 === 0) {
      await Broadcast.updateOne({ _id: broadcastId }, { sentCount: sent, failedCount: failed });
      const stillExists = await Broadcast.exists({ _id: broadcastId });
      if (!stillExists) {
        console.log(`[broadcast] ${broadcastId} cancelled mid-send — sent ${sent}, failed ${failed}`);
        return;
      }
    }
  }

  await Broadcast.updateOne(
    { _id: broadcastId },
    {
      sentCount: sent,
      failedCount: failed,
      status: 'completed',
      completedAt: new Date(),
    }
  );
  console.log(`[broadcast] ${broadcastId} done — sent ${sent}, failed ${failed}`);
}

/** Schedule a broadcast to run at `scheduledAt`. Uses setTimeout, so this is best-effort:
 * a process restart loses pending timers. A durable scheduler (Bull/agenda) is a TODO. */
function scheduleBroadcast(broadcastId: string, scheduledAt: Date): void {
  const delayMs = scheduledAt.getTime() - Date.now();
  if (delayMs <= 0) {
    setImmediate(() => runBroadcast(broadcastId).catch((err) => console.error('[broadcast] crashed:', err)));
    return;
  }
  // Cap at 24 days (max setTimeout safe integer is ~24.8 days). Anything further out
  // would silently overflow into Date(NaN) territory.
  if (delayMs > 24 * 24 * 3600 * 1000) {
    console.warn(`[broadcast] ${broadcastId} scheduled too far out (${delayMs}ms) — skipping in-process schedule`);
    return;
  }
  setTimeout(() => {
    Broadcast.updateOne({ _id: broadcastId }, { status: 'sending' })
      .then(() => runBroadcast(broadcastId))
      .catch((err) => console.error('[broadcast] scheduled run crashed:', err));
  }, delayMs);
  console.log(`[broadcast] ${broadcastId} scheduled in ${Math.round(delayMs / 1000)}s`);
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
    const broadcastId = String(item._id);

    // Kick off the actual delivery. We respond to the client immediately — the worker runs
    // detached so the UI's 5s polling will show sentCount climb in real time.
    if (data.scheduledAt) {
      scheduleBroadcast(broadcastId, new Date(data.scheduledAt));
    } else {
      setImmediate(() =>
        runBroadcast(broadcastId).catch((err) => console.error('[broadcast] crashed:', err))
      );
    }

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
    const bc = await Broadcast.findOne({ _id: req.params.id, owner: req.userId });
    if (!bc) throw new HttpError(404, 'Broadcast not found');
    // Completed broadcasts represent messages that real recipients already received.
    // Deleting them would erase the audit trail; refuse the request.
    if (bc.status === 'completed') {
      throw new HttpError(409, 'ลบไม่ได้ — broadcast ที่ส่งสำเร็จแล้วเก็บเป็นประวัติ');
    }
    await Broadcast.deleteOne({ _id: bc._id });
    // The in-process worker (if any) will hit "broadcast not found" on its next
    // checkpoint and stop gracefully — see runBroadcast.
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
