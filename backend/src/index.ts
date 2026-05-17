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

  // Bind to 0.0.0.0 explicitly — required for Render's proxy to reach the container.
  // (Express default usually does this, but being explicit prevents surprises.)
  app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`[api] listening on 0.0.0.0:${env.PORT}`);
  });
}

start();
