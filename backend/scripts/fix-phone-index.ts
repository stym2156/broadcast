/**
 * One-time migration: drop the old broken `phone_1` index on `users`.
 *
 * Background: The old schema declared `phone: { default: null }` plus a `sparse + unique`
 * index. Sparse only skips MISSING fields, not `null` values — so every register that
 * didn't supply a phone wrote `phone: null` into the indexed set, causing the second
 * register to fail with E11000 duplicate key.
 *
 * The fix is in `models/User.ts`: switch to `partialFilterExpression: { phone: $type:'string' }`
 * so only real string phones are indexed. But Mongoose won't replace the existing index
 * with the new spec — we have to drop the old one ourselves once.
 *
 * Run with:  npm run fix:phone-index
 * Safe to run multiple times — uses `try/catch` so a missing index is not fatal.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../src/config/env';
import { User } from '../src/models/User';

async function main() {
  console.log('[fix-phone-index] connecting to', env.MONGODB_URI.replace(/\/\/[^@]+@/, '//****:****@'));
  await mongoose.connect(env.MONGODB_URI);

  const indexes = await User.collection.indexes();
  const phoneIndex = indexes.find((i) => i.name === 'phone_1');

  if (!phoneIndex) {
    console.log('[fix-phone-index] no `phone_1` index found — nothing to drop');
  } else {
    console.log('[fix-phone-index] existing phone_1 index:', JSON.stringify(phoneIndex));
    try {
      await User.collection.dropIndex('phone_1');
      console.log('[fix-phone-index] ✓ dropped old phone_1 index');
    } catch (err) {
      console.error('[fix-phone-index] drop failed (probably already gone):', (err as Error).message);
    }
  }

  // Force Mongoose to (re)create indexes from the current schema spec.
  await User.syncIndexes();
  console.log('[fix-phone-index] ✓ Mongoose syncIndexes complete');

  // Show what's there now.
  const finalIndexes = await User.collection.indexes();
  console.log('[fix-phone-index] final indexes on users:');
  finalIndexes.forEach((i) => console.log('  ', i.name, JSON.stringify(i.key), i.partialFilterExpression ?? ''));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[fix-phone-index] crashed:', err);
  process.exit(1);
});
