import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export function signToken(payload: { sub: string; role: 'user' | 'admin' }) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
}
