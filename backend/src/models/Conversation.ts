import { Schema, model, Types } from 'mongoose';
import { baseSchemaOptions } from '../lib/transform';

const conversationSchema = new Schema(
  {
    owner: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    channel: { type: String, enum: ['facebook', 'whatsapp'], default: 'facebook', index: true },
    page: { type: Types.ObjectId, ref: 'Page', required: true, index: true },
    customer: { type: Types.ObjectId, ref: 'Customer', required: true, index: true },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    unreadCount: { type: Number, default: 0 },
    tags: [{ type: String }],
    status: { type: String, enum: ['open', 'pending', 'closed'], default: 'open' },
    assignedTo: { type: Types.ObjectId, ref: 'User', default: null },
    /** WhatsApp Cloud API 24-hour customer-service window expiry. Outside this window only approved
     * template messages may be sent. Updated each time the customer sends an inbound message. */
    waWindowExpiresAt: { type: Date, default: null },
  },
  baseSchemaOptions
);

conversationSchema.index({ page: 1, customer: 1 }, { unique: true });

export const Conversation = model('Conversation', conversationSchema);
