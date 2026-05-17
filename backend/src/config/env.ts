import dotenv from 'dotenv';
dotenv.config();

const required = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
};

export const env = {
  PORT: Number(process.env.PORT) || 4000,
  MONGODB_URI: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/broadcast'),
  JWT_SECRET: required('JWT_SECRET', 'dev-only-secret-change-me'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  ADMIN_ORIGIN: process.env.ADMIN_ORIGIN ?? 'http://localhost:5174',
};
