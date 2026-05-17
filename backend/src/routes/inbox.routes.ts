import { Router } from 'express';
import { z } from 'zod';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { QuickReply } from '../models/QuickReply';
import { authRequired, type AuthedRequest } from '../middleware/auth';
import { HttpError } from '../middleware/error';
import { sendMessengerMessage, isFbConfigured } from '../services/facebook';
import { sendText as waSendText, sendTemplate as waSendTemplate, isWaConfigured } from '../services/whatsapp';

export const inboxRouter = Router();

inboxRouter.use(authRequired);

interface Populated { id?: string; _id?: unknown; name?: string; psid?: string; avatar?: string | null }

function serializeConversation(c: Record<string, unknown>) {
  const page = c.page as Populated | string | undefined;
  const customer = c.customer as (Populated & { phoneNumber?: string }) | string | undefined;
  return {
    id: c.id ?? String(c._id),
    channel: c.channel ?? 'facebook',
    pageId: typeof page === 'string' ? page : String(page?.id ?? page?._id ?? ''),
    pageName: typeof page === 'object' && page !== null ? page.name ?? '' : '',
    customerId: typeof customer === 'string' ? customer : String(customer?.id ?? customer?._id ?? ''),
    customerName: typeof customer === 'object' && customer !== null ? customer.name ?? '' : '',
    customerAvatar: typeof customer === 'object' && customer !== null ? customer.avatar ?? null : null,
    customerPhone:
      typeof customer === 'object' && customer !== null && 'psid' in customer
        ? (customer as { psid?: string }).psid ?? null
        : null,
    lastMessage: c.lastMessage ?? '',
    lastMessageAt: c.lastMessageAt,
    unreadCount: c.unreadCount ?? 0,
    tags: c.tags ?? [],
    status: c.status ?? 'open',
    assignedTo: c.assignedTo ?? null,
    waWindowExpiresAt: c.waWindowExpiresAt ?? null,
  };
}

function serializeMessage(m: Record<string, unknown>) {
  return {
    id: m.id ?? String(m._id),
    conversationId: String(m.conversation ?? ''),
    direction: m.direction,
    kind: m.kind,
    text: m.text ?? '',
    imageUrl: m.imageUrl ?? null,
    sentAt: m.sentAt,
    senderName: m.senderName ?? '',
  };
}

inboxRouter.get('/conversations', async (req: AuthedRequest, res, next) => {
  try {
    const filter: Record<string, unknown> = { owner: req.userId };
    if (req.query.pageId) filter.page = String(req.query.pageId);
    if (req.query.channel) filter.channel = String(req.query.channel);
    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.tag) filter.tags = String(req.query.tag);
    const items = await Conversation.find(filter)
      .populate('page', 'name channel')
      .populate('customer', 'name avatar psid')
      .sort({ lastMessageAt: -1 })
      .limit(200)
      .lean({ virtuals: false });
    let conversations = items.map(serializeConversation);
    if (req.query.q) {
      const q = String(req.query.q).toLowerCase();
      conversations = conversations.filter(
        (c) =>
          (typeof c.customerName === 'string' && c.customerName.toLowerCase().includes(q)) ||
          (typeof c.lastMessage === 'string' && c.lastMessage.toLowerCase().includes(q))
      );
    }
    res.json({ ok: true, conversations });
  } catch (e) {
    next(e);
  }
});

inboxRouter.get('/conversations/:id/messages', async (req: AuthedRequest, res, next) => {
  try {
    const cv = await Conversation.findOne({ _id: req.params.id, owner: req.userId });
    if (!cv) throw new HttpError(404, 'Conversation not found');
    const messages = await Message.find({ conversation: cv._id })
      .sort({ sentAt: 1 })
      .limit(200)
      .lean({ virtuals: false });
    if (cv.unreadCount > 0) {
      cv.unreadCount = 0;
      await cv.save();
    }
    res.json({ ok: true, messages: messages.map(serializeMessage) });
  } catch (e) {
    next(e);
  }
});

const sendSchema = z.object({
  text: z.string().min(1).max(4000),
  /** WhatsApp template name (only used when sending to a WA conversation outside the 24h window). */
  templateName: z.string().optional(),
  templateLanguage: z.string().optional(),
  templateParams: z.array(z.string()).optional(),
});

inboxRouter.post('/conversations/:id/messages', async (req: AuthedRequest, res, next) => {
  try {
    const data = sendSchema.parse(req.body);
    const cv = await Conversation.findOne({ _id: req.params.id, owner: req.userId })
      .populate<{ page: { id: string; channel: string; accessToken?: string; phoneNumber?: string } }>(
        'page',
        'channel accessToken phoneNumber'
      )
      .populate<{ customer: { psid?: string } }>('customer', 'psid');
    if (!cv) throw new HttpError(404, 'Conversation not found');

    const page = cv.page as unknown as { channel: 'facebook' | 'whatsapp'; accessToken?: string; phoneNumber?: string };
    const customer = cv.customer as unknown as { psid?: string };
    let providerMessageId: string | null = null;

    try {
      if (page.channel === 'facebook') {
        if (!isFbConfigured()) {
          // Soft mode: no FB credentials configured — store message anyway so the UI flow works.
          console.warn('[inbox] FB not configured — storing message without sending');
        } else if (!page.accessToken || !customer.psid) {
          throw new HttpError(400, 'Page or customer missing access token / PSID');
        } else {
          const result = await sendMessengerMessage({
            pageAccessToken: page.accessToken,
            recipientPsid: customer.psid,
            text: data.text,
            messagingType: 'RESPONSE',
          });
          providerMessageId = result.message_id;
        }
      } else if (page.channel === 'whatsapp') {
        if (!isWaConfigured()) {
          console.warn('[inbox] WhatsApp not configured — storing message without sending');
        } else if (!customer.psid) {
          throw new HttpError(400, 'Customer missing WhatsApp ID');
        } else {
          // If outside the 24h window, the caller must provide a template.
          const inWindow = cv.waWindowExpiresAt && cv.waWindowExpiresAt.getTime() > Date.now();
          if (!inWindow && !data.templateName) {
            throw new HttpError(400, 'Outside 24h window — templateName required');
          }
          if (data.templateName) {
            const result = await waSendTemplate({
              to: customer.psid,
              templateName: data.templateName,
              languageCode: data.templateLanguage ?? 'th',
              bodyParams: data.templateParams,
              accessToken: page.accessToken,
            });
            providerMessageId = result.messages[0]?.id ?? null;
          } else {
            const result = await waSendText({ to: customer.psid, text: data.text, accessToken: page.accessToken });
            providerMessageId = result.messages[0]?.id ?? null;
          }
        }
      }
    } catch (err) {
      if (err instanceof HttpError) throw err;
      throw new HttpError(502, `Provider send failed: ${(err as Error).message}`);
    }

    const msg = await Message.create({
      conversation: cv._id,
      direction: 'outbound',
      kind: 'text',
      text: data.text,
      sentAt: new Date(),
      fbMessageId: providerMessageId,
    });
    cv.lastMessage = data.text;
    cv.lastMessageAt = new Date();
    await cv.save();
    res.json({ ok: true, message: serializeMessage(msg.toJSON() as Record<string, unknown>) });
  } catch (e) {
    next(e);
  }
});

const patchSchema = z.object({
  tags: z.array(z.string()).optional(),
  status: z.enum(['open', 'pending', 'closed']).optional(),
  assignedTo: z.string().nullable().optional(),
});

inboxRouter.patch('/conversations/:id', async (req: AuthedRequest, res, next) => {
  try {
    const patch = patchSchema.parse(req.body);
    const cv = await Conversation.findOneAndUpdate({ _id: req.params.id, owner: req.userId }, patch, { new: true })
      .populate('page', 'name channel')
      .populate('customer', 'name avatar psid')
      .lean({ virtuals: false });
    if (!cv) throw new HttpError(404, 'Conversation not found');
    res.json({ ok: true, conversation: serializeConversation(cv) });
  } catch (e) {
    next(e);
  }
});

inboxRouter.get('/quick-replies', async (req: AuthedRequest, res, next) => {
  try {
    const items = await QuickReply.find({ owner: req.userId }).sort({ sortOrder: 1, createdAt: -1 });
    res.json({ ok: true, quickReplies: items });
  } catch (e) {
    next(e);
  }
});

const quickReplySchema = z.object({
  title: z.string().min(1).max(100),
  text: z.string().min(1).max(2000),
  sortOrder: z.number().int().optional(),
});

inboxRouter.post('/quick-replies', async (req: AuthedRequest, res, next) => {
  try {
    const data = quickReplySchema.parse(req.body);
    const qr = await QuickReply.create({ ...data, owner: req.userId });
    res.json({ ok: true, quickReply: qr });
  } catch (e) {
    next(e);
  }
});

inboxRouter.delete('/quick-replies/:id', async (req: AuthedRequest, res, next) => {
  try {
    await QuickReply.deleteOne({ _id: req.params.id, owner: req.userId });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

