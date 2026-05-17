import { Schema, model, Types } from 'mongoose';
import { baseSchemaOptions } from '../lib/transform';

const customerSchema = new Schema(
  {
    owner: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    page: { type: Types.ObjectId, ref: 'Page', required: true, index: true },
    psid: { type: String, required: true },
    name: { type: String, default: '' },
    avatar: { type: String, default: null },
    tags: [{ type: String, index: true }],
    lastInteractionAt: { type: Date, default: null },
  },
  baseSchemaOptions
);

customerSchema.index({ page: 1, psid: 1 }, { unique: true });

export const Customer = model('Customer', customerSchema);
