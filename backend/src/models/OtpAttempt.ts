import { Schema, model } from 'mongoose';
import { baseSchemaOptions } from '../lib/transform';

/**
 * One-time-password attempt for WhatsApp OTP login.
 *
 * The `expiresAt` field has a TTL index: MongoDB auto-deletes the document the moment
 * `expiresAt` passes (granularity ~60 seconds). No cleanup job needed.
 */
const otpSchema = new Schema(
  {
    phone: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  baseSchemaOptions
);

// TTL index — MongoDB deletes the doc when `expiresAt` <= now.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpAttempt = model('OtpAttempt', otpSchema);
