import mongoose from 'mongoose';
import { app } from './app';
import { env } from './config/env';

async function start() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('[mongo] connected:', env.MONGODB_URI);
  } catch (err) {
    console.error('[mongo] connection failed — starting API anyway for dev:', err);
  }

  app.listen(env.PORT, () => {
    console.log(`[api] listening on http://localhost:${env.PORT}`);
  });
}

start();
