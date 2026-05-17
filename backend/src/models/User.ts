import { Schema, model, type InferSchemaType } from 'mongoose';
import { baseSchemaOptions } from '../lib/transform';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    facebookId: { type: String, default: null },
    avatar: { type: String, default: null },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  },
  baseSchemaOptions
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: string };
export const User = model('User', userSchema);
