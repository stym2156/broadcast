import { Schema, model, Types } from 'mongoose';
import { baseSchemaOptions } from '../lib/transform';

const quickReplySchema = new Schema(
  {
    owner: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    text: { type: String, required: true },
    sortOrder: { type: Number, default: 0 },
  },
  baseSchemaOptions
);

export const QuickReply = model('QuickReply', quickReplySchema);
