import mongoose from 'mongoose';
import { app } from './app';
import { env } from './config/env';

async function start() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('[mongo] connected');
  } catch (err) {
    // In production, refuse to start. Render will mark the deploy unhealthy and the
    // operator gets a clear signal that MONGODB_URI is wrong / Atlas IP allow-list
    // blocks Render / the DB is down. In dev, fall through so the API still boots
    // for offline frontend work.
    if (env.isProd) {
      console.error('[mongo] connection failed in production — refusing to start:', err);
      process.exit(1);
    }
    console.error('[mongo] connection failed — starting API anyway for dev:', err);
  }

  // Bind to 0.0.0.0 explicitly — required for Render's proxy to reach the container.
  app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`[api] listening on 0.0.0.0:${env.PORT}`);
  });
}

start();
