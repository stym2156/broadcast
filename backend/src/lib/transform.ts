import type { SchemaOptions } from 'mongoose';

/**
 * Mongoose serialization transform shared across all models.
 *
 * - Renames `_id` to `id` so frontend clients don't have to handle Mongo-specific shapes.
 * - Drops `__v` and `passwordHash` from JSON output unconditionally — never leak password hashes.
 */
export const baseToJSON: NonNullable<SchemaOptions['toJSON']> = {
  virtuals: false,
  versionKey: false,
  transform(_doc, ret) {
    const r = ret as Record<string, unknown> & { _id?: { toString(): string } };
    if (r._id) r.id = r._id.toString();
    delete r._id;
    delete r.passwordHash;
    return r;
  },
};

export const baseSchemaOptions = {
  timestamps: true,
  toJSON: baseToJSON,
  toObject: baseToJSON,
} satisfies SchemaOptions;
