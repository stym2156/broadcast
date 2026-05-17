import type { Request, Response, NextFunction } from 'express';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ ok: false, error: err.message });
  }
  console.error('[unhandled]', err);
  res.status(500).json({ ok: false, error: 'Internal server error' });
}
