import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env';
import { authRouter } from './routes/auth.routes';
import { oauthRouter } from './routes/oauth.routes';
import { pageRouter } from './routes/page.routes';
import { broadcastRouter } from './routes/broadcast.routes';
import { customerRouter } from './routes/customer.routes';
import { inboxRouter } from './routes/inbox.routes';
import { subscriptionRouter } from './routes/subscription.routes';
import { adminRouter } from './routes/admin.routes';
import { statsRouter } from './routes/stats.routes';
import { webhookRouter } from './routes/webhook.routes';
import { errorHandler } from './middleware/error';

export const app = express();

app.use(
  cors({
    origin: [env.CLIENT_ORIGIN, env.ADMIN_ORIGIN],
    credentials: true,
  })
);

// Webhooks must be mounted BEFORE express.json() so the raw-body middleware inside
// webhook.routes can read req.body as a Buffer for HMAC verification.
app.use('/webhooks', webhookRouter);

app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/auth', authRouter);
app.use('/api/oauth', oauthRouter);
app.use('/api/pages', pageRouter);
app.use('/api/broadcasts', broadcastRouter);
app.use('/api/customers', customerRouter);
app.use('/api/inbox', inboxRouter);
app.use('/api/subscriptions', subscriptionRouter);
app.use('/api/stats', statsRouter);
app.use('/api/admin', adminRouter);

app.use(errorHandler);
