import { Schema, model } from 'mongoose';
import { baseSchemaOptions } from '../lib/transform';

const planSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    months: { type: Number, required: true },
    price: { type: Number, required: true },
    pricePerMonth: { type: Number, required: true },
    savingsPercent: { type: Number, default: 0 },
    features: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  baseSchemaOptions
);

export const Plan = model('Plan', planSchema);
