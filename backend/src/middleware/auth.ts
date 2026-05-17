import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from './error';

export interface AuthedRequest extends Request {
  userId?: string;
  role?: 'user' | 'admin';
}

export function authRequired(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new HttpError(401, 'Missing token'));
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET) as { sub: string; role: 'user' | 'admin' };
    req.userId = payload.sub;
    req.role = payload.role;
    next();
  } catch {
    next(new HttpError(401, 'Invalid token'));
  }
}

export function adminRequired(req: AuthedRequest, _res: Response, next: NextFunction) {
  if (req.role !== 'admin') return next(new HttpError(403, 'Admin only'));
  next();
}
