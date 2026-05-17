import { Schema, model, type InferSchemaType } from 'mongoose';
import { baseSchemaOptions } from '../lib/transform';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    facebookId: { type: String },
    /**
     * Long-lived Facebook user access token (~60 days). Stored server-side ONLY so we can list
     * the user's managed pages without echoing the token back to the browser. `select: false`
     * means it's never returned unless a query explicitly asks with `.select('+fbUserAccessToken')`.
     * Cleared once pages are connected.
     */
    fbUserAccessToken: { type: String, select: false },
    fbUserAccessTokenExpiresAt: { type: Date },
    /** Normalized E.164 without `+` (e.g. "66812345678") — set when user logs in via WhatsApp OTP. */
    phone: { type: String },
    avatar: { type: String },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  },
  baseSchemaOptions
);

// Unique phone, but only for users that actually have one. `sparse: true` is NOT enough
// here because Mongoose with `default: null` writes `phone: null` into every doc — the
// sparse index then contains a single `null` key and every subsequent insert collides.
// `partialFilterExpression` indexes ONLY docs where phone is a string, so users without
// a phone are completely excluded from the unique constraint.
userSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: 'string' } } }
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: string };
export const User = model('User', userSchema);
