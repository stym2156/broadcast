import { Schema, model, Types } from 'mongoose';
import { baseSchemaOptions } from '../lib/transform';

const broadcastSchema = new Schema(
  {
    owner: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    pages: [{ type: Types.ObjectId, ref: 'Page' }],
    title: { type: String, required: true },
    message: { type: String, required: true },
    imageUrl: { type: String, default: null },
    targetTags: [{ type: String }],
    scheduledAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sending', 'completed', 'failed'],
      default: 'draft',
    },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    totalRecipients: { type: Number, default: 0 },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  baseSchemaOptions
);

export const Broadcast = model('Broadcast', broadcastSchema);
