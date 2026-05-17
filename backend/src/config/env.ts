import dotenv from 'dotenv';
dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

/**
 * Read an env var. In production, missing is fatal — no silent fallback.
 * In dev, fall back to the provided default so `npm run dev` works without a .env.
 */
const readEnv = (key: string, devFallback?: string): string => {
  const value = process.env[key];
  if (value && value.trim() !== '') return value;
  if (isProd) {
    throw new Error(
      `[env] Missing required env var ${key} in production. ` +
        `Set it in your hosting dashboard (Render → Environment) before redeploying.`
    );
  }
  if (devFallback === undefined) {
    throw new Error(`[env] Missing env var ${key} and no dev fallback provided.`);
  }
  return devFallback;
};

/**
 * Comma-separated origins are also supported so Vercel preview URLs can be added
 * without redeploying every time, e.g. CLIENT_ORIGIN="https://app.vercel.app,https://app-git-dev.vercel.app".
 */
const parseOrigins = (raw: string): string[] =>
  raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  // Empty string from a misconfigured dashboard would be Number('') === 0; '|| 4000'
  // guards against that. In production Render also injects its own PORT, which wins.
  PORT: Number(process.env.PORT) || 4000,

  MONGODB_URI: readEnv('MONGODB_URI', 'mongodb://127.0.0.1:27017/broadcast'),
  JWT_SECRET: readEnv('JWT_SECRET', 'dev-only-secret-change-me'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',

  CLIENT_ORIGINS: parseOrigins(process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'),
  ADMIN_ORIGINS: parseOrigins(process.env.ADMIN_ORIGIN ?? 'http://localhost:5174'),

  // Convenience flags used elsewhere
  isProd,
};
