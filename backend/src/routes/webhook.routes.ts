import { Router, raw } from 'express';
import {
  fbConfig,
  verifyWebhookSignature as verifyFbSignature,
} from '../services/facebook';
import {
  waConfig,
  verifyWebhookSignature as verifyWaSignature,
  parseInboundMessages,
} from '../services/whatsapp';
import { Page } from '../models/Page';
import { Customer } from '../models/Customer';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';

export const webhookRouter = Router();

/**
 * Both FB Messenger and WA Cloud webhooks need the *raw* request body for HMAC verification.
 * `express.json()` parses + discards the buffer, so we attach a `raw` middleware on these endpoints
 * and parse JSON ourselves via `JSON.parse(req.body)`.
 */
const rawJson = raw({ type: 'application/json', limit: '5mb' });

// ───────────────────────── Facebook Messenger ─────────────────────────

// Verification handshake — Meta sends this once when you set the webhook URL.
webhookRouter.get('/facebook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === fbConfig().verifyToken) {
    res.status(200).send(String(challenge ?? ''));
    return;
  }
  res.sendStatus(403);
});

webhookRouter.post('/facebook', rawJson, async (req, res) => {
  const raw = (req.body as Buffer).toString('utf8');
  const sig = req.header('x-hub-signature-256');
  if (!verifyFbSignature(raw, sig)) {
    res.sendStatus(401);
    return;
  }
  // ACK immediately — Meta retries delivery if it doesn't see a 200 within ~20 seconds.
  res.sendStatus(200);

  try {
    const payload = JSON.parse(raw) as {
      entry?: Array<{
        id: string;
        messaging?: Array<{
          sender?: { id: string };
          recipient?: { id: string };
          timestamp?: number;
          message?: { mid?: string; text?: string };
        }>;
      }>;
    };
    for (const entry of payload.entry ?? []) {
      const fbPageId = entry.id;
      const page = await Page.findOne({ channel: 'facebook', fbPageId });
      if (!page) continue;
      for (const m of entry.messaging ?? []) {
        if (!m.sender?.id || !m.message?.text) continue;
        const psid = m.sender.id;
        const customer = await Customer.findOneAndUpdate(
          { page: page._id, psid },
          {
            $setOnInsert: { owner: page.owner, page: page._id, psid, name: '' },
            $set: { lastInteractionAt: new Date() },
          },
          { upsert: true, new: true }
        );
        const cv = await Conversation.findOneAndUpdate(
          { page: page._id, customer: customer._id },
          {
            $setOnInsert: { owner: page.owner, channel: 'facebook', page: page._id, customer: customer._id },
            $set: { lastMessage: m.message.text, lastMessageAt: new Date() },
            $inc: { unreadCount: 1 },
          },
          { upsert: true, new: true }
        );
        await Message.create({
          conversation: cv._id,
          direction: 'inbound',
          kind: 'text',
          text: m.message.text,
          sentAt: m.timestamp ? new Date(m.timestamp) : new Date(),
          fbMessageId: m.message.mid ?? null,
        });
      }
    }
  } catch (err) {
    console.error('[webhook/facebook] processing error:', err);
  }
});

// ───────────────────────── WhatsApp Cloud ─────────────────────────

webhookRouter.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === waConfig().verifyToken) {
    res.status(200).send(String(challenge ?? ''));
    return;
  }
  res.sendStatus(403);
});

webhookRouter.post('/whatsapp', rawJson, async (req, res) => {
  const raw = (req.body as Buffer).toString('utf8');
  const sig = req.header('x-hub-signature-256');
  if (!verifyWaSignature(raw, sig)) {
    res.sendStatus(401);
    return;
  }
  res.sendStatus(200);

  try {
    const payload = JSON.parse(raw);
    const messages = parseInboundMessages(payload);
    for (const m of messages) {
      const page = await Page.findOne({ channel: 'whatsapp', fbPageId: m.phoneNumberId });
      if (!page) continue;
      const customer = await Customer.findOneAndUpdate(
        { page: page._id, psid: m.from },
        {
          $setOnInsert: { owner: page.owner, page: page._id, psid: m.from },
          $set: { name: m.name ?? '', lastInteractionAt: m.timestamp },
        },
        { upsert: true, new: true }
      );
      // Reset the 24-hour customer service window on every inbound message.
      const waWindowExpiresAt = new Date(m.timestamp.getTime() + 24 * 3600 * 1000);
      const cv = await Conversation.findOneAndUpdate(
        { page: page._id, customer: customer._id },
        {
          $setOnInsert: { owner: page.owner, channel: 'whatsapp', page: page._id, customer: customer._id },
          $set: { lastMessage: m.text ?? '[image]', lastMessageAt: m.timestamp, waWindowExpiresAt },
          $inc: { unreadCount: 1 },
        },
        { upsert: true, new: true }
      );
      await Message.create({
        conversation: cv._id,
        direction: 'inbound',
        kind: m.text ? 'text' : 'image',
        text: m.text ?? '',
        sentAt: m.timestamp,
        fbMessageId: m.messageId,
      });
    }
  } catch (err) {
    console.error('[webhook/whatsapp] processing error:', err);
  }
});
