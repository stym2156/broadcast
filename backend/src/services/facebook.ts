import crypto from 'crypto';

/**
 * Facebook Graph API client for Messenger.
 *
 * Required env vars (see .env.example):
 *   FB_APP_ID, FB_APP_SECRET, FB_VERIFY_TOKEN, FB_OAUTH_REDIRECT
 *
 * Operates against Graph API v19.0. All methods accept the *page* access token
 * (not the user token) — exchange via {@link exchangePagesForLongLived} after OAuth.
 */
const GRAPH = 'https://graph.facebook.com/v19.0';

export interface FbPageInfo {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  tasks?: string[];
}

export const fbConfig = () => ({
  appId: process.env.FB_APP_ID ?? '',
  appSecret: process.env.FB_APP_SECRET ?? '',
  verifyToken: process.env.FB_VERIFY_TOKEN ?? '',
  redirect: process.env.FB_OAUTH_REDIRECT ?? 'http://localhost:5173/auth/facebook/callback',
});

export function isFbConfigured(): boolean {
  const cfg = fbConfig();
  return Boolean(cfg.appId && cfg.appSecret);
}

/** Build the Facebook Login dialog URL — frontend redirects the user here. */
export function buildLoginUrl(state: string): string {
  const cfg = fbConfig();
  const scope = [
    'public_profile',
    'email',
    'pages_show_list',
    'pages_messaging',
    'pages_manage_metadata',
    'pages_read_engagement',
  ].join(',');
  const params = new URLSearchParams({
    client_id: cfg.appId,
    redirect_uri: cfg.redirect,
    state,
    scope,
    response_type: 'code',
  });
  return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
}

async function fbFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = (await res.json()) as { error?: { message: string } } & T;
  if (!res.ok || json.error) {
    throw new Error(`Facebook API error: ${json.error?.message ?? res.statusText}`);
  }
  return json;
}

/** Exchange an OAuth `code` for a short-lived user access token, then upgrade to long-lived (~60 days). */
export async function exchangeCodeForToken(code: string): Promise<{ accessToken: string; longLived: string }> {
  const cfg = fbConfig();
  const short = await fbFetch<{ access_token: string }>(
    `${GRAPH}/oauth/access_token?` +
      new URLSearchParams({
        client_id: cfg.appId,
        client_secret: cfg.appSecret,
        redirect_uri: cfg.redirect,
        code,
      }).toString()
  );
  const long = await fbFetch<{ access_token: string }>(
    `${GRAPH}/oauth/access_token?` +
      new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: cfg.appId,
        client_secret: cfg.appSecret,
        fb_exchange_token: short.access_token,
      }).toString()
  );
  return { accessToken: short.access_token, longLived: long.access_token };
}

export async function getMe(userAccessToken: string): Promise<{ id: string; name: string; email?: string }> {
  return fbFetch(`${GRAPH}/me?fields=id,name,email&access_token=${encodeURIComponent(userAccessToken)}`);
}

/** Returns pages the user manages, each with its own non-expiring page access token. */
export async function listManagedPages(userAccessToken: string): Promise<FbPageInfo[]> {
  const res = await fbFetch<{ data: FbPageInfo[] }>(
    `${GRAPH}/me/accounts?fields=id,name,access_token,category,tasks&access_token=${encodeURIComponent(userAccessToken)}`
  );
  return res.data;
}

/** Subscribe a page to messaging webhooks (must run once per page after connection). */
export async function subscribePageWebhook(pageId: string, pageAccessToken: string): Promise<void> {
  await fbFetch(`${GRAPH}/${pageId}/subscribed_apps`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      subscribed_fields: ['messages', 'messaging_postbacks', 'message_deliveries'],
      access_token: pageAccessToken,
    }),
  });
}

export interface SendMessageOptions {
  pageAccessToken: string;
  recipientPsid: string;
  text?: string;
  imageUrl?: string;
  /**
   * One of:
   *   - 'RESPONSE': replying within the 24h window after a user message
   *   - 'UPDATE': non-promotional notification within 24h
   *   - 'MESSAGE_TAG': outside 24h, requires `tag` (HUMAN_AGENT, ACCOUNT_UPDATE, etc.)
   */
  messagingType?: 'RESPONSE' | 'UPDATE' | 'MESSAGE_TAG';
  tag?: string;
}

export async function sendMessengerMessage(opts: SendMessageOptions): Promise<{ message_id: string }> {
  const payload: Record<string, unknown> = {
    recipient: { id: opts.recipientPsid },
    messaging_type: opts.messagingType ?? 'RESPONSE',
  };
  if (opts.tag) payload.tag = opts.tag;
  if (opts.imageUrl) {
    payload.message = {
      attachment: { type: 'image', payload: { url: opts.imageUrl, is_reusable: true } },
    };
  } else {
    payload.message = { text: opts.text ?? '' };
  }
  return fbFetch(`${GRAPH}/me/messages?access_token=${encodeURIComponent(opts.pageAccessToken)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Verify the X-Hub-Signature-256 header Facebook attaches to every webhook delivery.
 * Reject any request whose signature does not match — otherwise an attacker can forge inbound messages.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | undefined): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;
  const expected = crypto
    .createHmac('sha256', fbConfig().appSecret)
    .update(rawBody)
    .digest('hex');
  const provided = signatureHeader.slice(7);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(provided, 'hex'));
  } catch {
    return false;
  }
}

/** Fetch a user's profile by PSID (best-effort — fails silently for users who haven't messaged). */
export async function getUserProfile(
  psid: string,
  pageAccessToken: string
): Promise<{ name?: string; profile_pic?: string } | null> {
  try {
    return await fbFetch(
      `${GRAPH}/${psid}?fields=name,profile_pic&access_token=${encodeURIComponent(pageAccessToken)}`
    );
  } catch {
    return null;
  }
}
