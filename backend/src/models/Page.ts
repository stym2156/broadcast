import { Schema, model, Types } from 'mongoose';
import { baseSchemaOptions } from '../lib/transform';

const pageSchema = new Schema(
  {
    owner: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    channel: { type: String, enum: ['facebook', 'whatsapp'], default: 'facebook', index: true },
    fbPageId: { type: String, required: true },
    name: { type: String, required: true },
    avatar: { type: String, default: null },
    accessToken: { type: String, default: null },
    phoneNumber: { type: String, default: null },
    waBusinessAccountId: { type: String, default: null },
    subscribersCount: { type: Number, default: 0 },
    status: { type: String, enum: ['connected', 'expired', 'disabled'], default: 'connected' },
  },
  baseSchemaOptions
);

pageSchema.index({ owner: 1, channel: 1, fbPageId: 1 }, { unique: true });

export const Page = model('Page', pageSchema);
