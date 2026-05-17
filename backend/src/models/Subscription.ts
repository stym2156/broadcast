import { Schema, model, Types } from 'mongoose';
import { baseSchemaOptions } from '../lib/transform';

const subscriptionSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: Types.ObjectId, ref: 'Plan', required: true },
    startedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['trial', 'active', 'expired', 'cancelled'],
      default: 'active',
    },
    amountPaid: { type: Number, default: 0 },
    autoRenew: { type: Boolean, default: false },
    paymentRef: { type: String, default: null },
  },
  baseSchemaOptions
);

export const Subscription = model('Subscription', subscriptionSchema);
