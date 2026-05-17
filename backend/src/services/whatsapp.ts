import crypto from 'crypto';

/**
 * WhatsApp Cloud API client (via Meta Graph API).
 *
 * Required env vars (see .env.example):
 *   WA_PHONE_NUMBER_ID, WA_BUSINESS_ACCOUNT_ID, WA_ACCESS_TOKEN, WA_VERIFY_TOKEN
 *
 * Important — WhatsApp messaging windows:
 *   • Inside the 24-hour customer service window (since the last inbound message from the user):
 *     free-form text/image messages are allowed.
 *   • Outside the window: ONLY approved template messages can be sent.
 */
const GRAPH = 'https://graph.facebook.com/v19.0';

export const waConfig = () => ({
  phoneNumberId: process.env.WA_PHONE_NUMBER_ID ?? '',
  businessAccountId: process.env.WA_BUSINESS_ACCOUNT_ID ?? '',
  accessToken: process.env.WA_ACCESS_TOKEN ?? '',
  verifyToken: process.env.WA_VERIFY_TOKEN ?? '',
  appSecret: process.env.FB_APP_SECRET ?? '', // WA webhooks are signed with the FB App secret
});

export function isWaConfigured(): boolean {
  const cfg = waConfig();
  return Boolean(cfg.phoneNumberId && cfg.accessToken);
}

async function waFetch<T>(path: string, init?: RequestInit & { accessToken?: string }): Promise<T> {
  const token = init?.accessToken ?? waConfig().accessToken;
  const res = await fetch(`${GRAPH}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json()) as { error?: { message: string } } & T;
  if (!res.ok || json.error) {
    throw new Error(`WhatsApp API error: ${json.error?.message ?? res.statusText}`);
  }
  return json;
}

export interface SendTextOptions {
  /** WhatsApp Cloud phone number ID (the *from* number registered with Meta). */
  phoneNumberId?: string;
  accessToken?: string;
  /** Customer's WhatsApp number in E.164 format (e.g. "66812345678" — no plus, no dashes). */
  to: string;
  text: string;
}

/** Send a free-form text — only valid inside the 24-hour customer service window. */
export async function sendText(opts: SendTextOptions): Promise<{ messages: { id: string }[] }> {
  const phoneId = opts.phoneNumberId ?? waConfig().phoneNumberId;
  return waFetch(`/${phoneId}/messages`, {
    method: 'POST',
    accessToken: opts.accessToken,
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: opts.to,
      type: 'text',
      text: { body: opts.text, preview_url: false },
    }),
  });
}

export interface SendImageOptions extends Omit<SendTextOptions, 'text'> {
  imageUrl: string;
  caption?: string;
}

export async function sendImage(opts: SendImageOptions): Promise<{ messages: { id: string }[] }> {
  const phoneId = opts.phoneNumberId ?? waConfig().phoneNumberId;
  return waFetch(`/${phoneId}/messages`, {
    method: 'POST',
    accessToken: opts.accessToken,
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: opts.to,
      type: 'image',
      image: { link: opts.imageUrl, caption: opts.caption },
    }),
  });
}

export interface SendTemplateOptions {
  phoneNumberId?: string;
  accessToken?: string;
  to: string;
  /** Template name as registered in WhatsApp Manager (must be approved). */
  templateName: string;
  languageCode: string;
  /** Body parameters in the order they appear in the template. */
  bodyParams?: string[];
}

/** Send an approved template message — required outside the 24-hour window. */
export async function sendTemplate(opts: SendTemplateOptions): Promise<{ messages: { id: string }[] }> {
  const phoneId = opts.phoneNumberId ?? waConfig().phoneNumberId;
  const components = opts.bodyParams
    ? [{ type: 'body', parameters: opts.bodyParams.map((p) => ({ type: 'text', text: p })) }]
    : [];
  return waFetch(`/${phoneId}/messages`, {
    method: 'POST',
    accessToken: opts.accessToken,
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: opts.to,
      type: 'template',
      template: {
        name: opts.templateName,
        language: { code: opts.languageCode },
        components,
      },
    }),
  });
}

/** WhatsApp webhook signature verification (HMAC-SHA256 with the Meta App secret). */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | undefined): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', waConfig().appSecret).update(rawBody).digest('hex');
  const provided = signatureHeader.slice(7);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(provided, 'hex'));
  } catch {
    return false;
  }
}

/** Parsed inbound WhatsApp message — extracted from a webhook event payload. */
export interface ParsedWaMessage {
  phoneNumberId: string;
  from: string;
  name?: string;
  messageId: string;
  text?: string;
  imageId?: string;
  timestamp: Date;
}

/**
 * Extract the messages array from a WhatsApp webhook event. A single delivery can carry multiple
 * messages across multiple business accounts, so this returns a flat array.
 */
export function parseInboundMessages(body: unknown): ParsedWaMessage[] {
  const events = (body as { entry?: Array<{ changes?: Array<{ value?: unknown }> }> }).entry ?? [];
  const out: ParsedWaMessage[] = [];
  for (const entry of events) {
    for (const change of entry.changes ?? []) {
      const value = change.value as {
        metadata?: { phone_number_id?: string };
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: Array<{
          from?: string;
          id?: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
          image?: { id?: string };
        }>;
      } | undefined;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!phoneNumberId || !value?.messages) continue;
      for (const m of value.messages) {
        if (!m.from || !m.id) continue;
        const contact = value.contacts?.find((c) => c.wa_id === m.from);
        out.push({
          phoneNumberId,
          from: m.from,
          name: contact?.profile?.name,
          messageId: m.id,
          text: m.text?.body,
          imageId: m.image?.id,
          timestamp: m.timestamp ? new Date(Number(m.timestamp) * 1000) : new Date(),
        });
      }
    }
  }
  return out;
}
