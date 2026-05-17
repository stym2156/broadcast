import { Schema, model, Types } from 'mongoose';
import { baseSchemaOptions } from '../lib/transform';

const messageSchema = new Schema(
  {
    conversation: { type: Types.ObjectId, ref: 'Conversation', required: true, index: true },
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    kind: { type: String, enum: ['text', 'image', 'sticker'], default: 'text' },
    text: { type: String, default: '' },
    imageUrl: { type: String, default: null },
    sentAt: { type: Date, default: Date.now, index: true },
    senderName: { type: String, default: '' },
    fbMessageId: { type: String, default: null },
  },
  baseSchemaOptions
);

export const Message = model('Message', messageSchema);
