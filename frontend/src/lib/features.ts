/**
 * Frontend feature flags.
 *
 * Single source of truth for toggling channel surfaces on/off in the UI.
 * Backend code, mock data, types, and API endpoints are intentionally left intact —
 * flipping a flag back to `true` re-enables the entire feature without re-implementation.
 */
export const FEATURES = {
  /**
   * WhatsApp channel — all UI surfaces (connect button, filter tabs, conversation cards,
   * dedicated login flow). Hidden until the Meta Business Account is verified and the
   * `login_otp` authentication template is approved.
   *
   * What's still wired up when this is `false`:
   *   - /login/whatsapp route + WhatsAppLogin page component
   *   - mockApi.sendWaOtp / verifyWaOtp / addPage(channel: 'whatsapp')
   *   - Backend: /api/auth/wa/*, /api/pages (accepts channel), webhook /webhooks/whatsapp,
   *     OtpAttempt model, User.phone field, services/whatsapp.ts
   *   - Seed data still creates WhatsApp pages/conversations in MongoDB
   *
   * To re-enable: flip to `true`, re-add the WA login button in pages/auth/Login.tsx.
   */
  whatsapp: false,
} as const;
