import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User';
import { HttpError } from '../middleware/error';
import { signToken } from '../utils/jwt';
import { authRequired, type AuthedRequest } from '../middleware/auth';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

authRouter.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const exists = await User.findOne({ email: data.email });
    if (exists) throw new HttpError(409, 'Email already registered');
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await User.create({ email: data.email, name: data.name, passwordHash });
    const token = signToken({ sub: String(user._id), role: 'user' });
    res.json({ ok: true, token, user: { id: user._id, email: user.email, name: user.name, role: user.role } });
  } catch (e) {
    next(e);
  }
});

const loginSchema = z.object({ email: z.string().email(), password: z.string() });

authRouter.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await User.findOne({ email: data.email });
    if (!user) throw new HttpError(401, 'Invalid credentials');
    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) throw new HttpError(401, 'Invalid credentials');
    const token = signToken({ sub: String(user._id), role: user.role as 'user' | 'admin' });
    res.json({ ok: true, token, user: { id: user._id, email: user.email, name: user.name, role: user.role } });
  } catch (e) {
    next(e);
  }
});

authRouter.get('/me', authRequired, async (req: AuthedRequest, res, next) => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash');
    res.json({ ok: true, user });
  } catch (e) {
    next(e);
  }
});

authRouter.post('/facebook', async (_req, res) => {
  res.json({ ok: false, error: 'Facebook OAuth not implemented in this scaffold' });
});
