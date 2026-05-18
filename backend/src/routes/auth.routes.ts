import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { User } from '../models/User';
import { OtpAttempt } from '../models/OtpAttempt';
import { HttpError } from '../middleware/error';
import { signToken } from '../utils/jwt';
import { authRequired, type AuthedRequest } from '../middleware/auth';
import { sendText as waSendText, sendTemplate as waSendTemplate, isWaConfigured } from '../services/whatsapp';

/**
 * Normalize a user-typed phone number to E.164 without the leading `+`.
 * Accepts Thai shortcuts: 0812345678 → 66812345678. Otherwise strips non-digits
 * and assumes the caller provided the country code.
 */
function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (/^0\d{8,9}$/.test(digits)) return '66' + digits.slice(1);
  return digits;
}

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

const updateProfileSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    email: z.string().email().max(200).optional(),
  })
  .strict();

/**
 * Update the authenticated user's profile. Strict schema: only `name` and `email` may
 * be changed here. Sensitive fields (role, passwordHash, phone, facebookId,
 * fbUserAccessToken, status) are explicitly NOT allowed — they have dedicated flows
 * (admin endpoints, password change, OAuth, OTP, etc.).
 */
authRouter.patch('/me', authRequired, async (req: AuthedRequest, res, next) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    if (data.email) {
      const taken = await User.findOne({ email: data.email.toLowerCase(), _id: { $ne: req.userId } });
      if (taken) throw new HttpError(409, 'อีเมลนี้มีผู้ใช้แล้ว');
    }
    const user = await User.findByIdAndUpdate(req.userId, data, { new: true, runValidators: true })
      .select('-passwordHash');
    if (!user) throw new HttpError(404, 'User not found');
    res.json({ ok: true, user });
  } catch (e) {
    next(e);
  }
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(200),
});

/**
 * Change password. Requires the current password (so a stolen JWT alone can't lock the
 * real owner out). The new password is bcrypted before storage.
 */
authRouter.post('/me/password', authRequired, async (req: AuthedRequest, res, next) => {
  try {
    const data = changePasswordSchema.parse(req.body);
    const user = await User.findById(req.userId);
    if (!user) throw new HttpError(404, 'User not found');
    const ok = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!ok) throw new HttpError(401, 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
    user.passwordHash = await bcrypt.hash(data.newPassword, 10);
    await user.save();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ───────────────────────── WhatsApp OTP login ─────────────────────────

const sendOtpSchema = z.object({ phone: z.string().min(8).max(20) });

/**
 * Send a 6-digit OTP to the user's WhatsApp number.
 *
 * Delivery is attempted via:
 *   1. Approved Meta authentication template `login_otp` — works outside the 24h window.
 *   2. Free-form text — works only inside the 24h customer-service window (fallback).
 *
 * If BOTH fail, we delete the OTP record (so a retry starts clean) and return an error.
 * The OTP code is NEVER returned to the client — it must arrive via the user's own WhatsApp.
 */
authRouter.post('/wa/send-otp', async (req, res, next) => {
  try {
    const { phone } = sendOtpSchema.parse(req.body);
    const normalized = normalizePhone(phone);
    if (!/^\d{8,15}$/.test(normalized)) {
      throw new HttpError(400, 'รูปแบบเบอร์ไม่ถูกต้อง (ตัวอย่าง: 66812345678)');
    }

    if (!isWaConfigured()) {
      throw new HttpError(503, 'WhatsApp ยังไม่ได้ตั้งค่า — ติดต่อผู้ดูแลระบบ');
    }

    // 6-digit code, hashed before storage so it can't leak from a DB dump.
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, 10);

    // Overwrite any in-flight OTP for this phone — keeps only one valid code at a time.
    await OtpAttempt.deleteMany({ phone: normalized });
    const record = await OtpAttempt.create({
      phone: normalized,
      codeHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    let sentVia: 'template' | 'free-form' | null = null;
    let lastError = '';

    try {
      await waSendTemplate({
        to: normalized,
        templateName: 'login_otp',
        languageCode: 'th',
        bodyParams: [code],
      });
      sentVia = 'template';
    } catch (err) {
      lastError = (err as Error).message;
      // Template missing/not approved — try free-form (works inside 24h window).
      try {
        await waSendText({ to: normalized, text: `รหัสยืนยันของคุณคือ ${code} (หมดอายุใน 5 นาที)` });
        sentVia = 'free-form';
      } catch (err2) {
        lastError = (err2 as Error).message;
      }
    }

    if (!sentVia) {
      // Both delivery paths failed — invalidate the unsent code so the user can retry cleanly.
      await OtpAttempt.deleteOne({ _id: record._id });
      console.error(`[wa-otp] delivery failed for ${normalized}:`, lastError);
      throw new HttpError(
        502,
        'ส่ง OTP ไม่สำเร็จ — กรุณาตรวจสอบว่าเบอร์เปิด WhatsApp และอยู่ใน allow-list ของผู้ให้บริการ'
      );
    }

    res.json({ ok: true, sentVia });
  } catch (e) {
    next(e);
  }
});

const verifyOtpSchema = z.object({
  phone: z.string().min(8).max(20),
  code: z.string().length(6),
});

authRouter.post('/wa/verify', async (req, res, next) => {
  try {
    const { phone, code } = verifyOtpSchema.parse(req.body);
    const normalized = normalizePhone(phone);

    const otp = await OtpAttempt.findOne({ phone: normalized });
    if (!otp) throw new HttpError(400, 'รหัสหมดอายุหรือไม่พบ — กดส่งใหม่');

    if (otp.attempts >= 3) {
      await OtpAttempt.deleteOne({ _id: otp._id });
      throw new HttpError(429, 'ใส่ผิดเกิน 3 ครั้ง — กดส่งรหัสใหม่');
    }

    const ok = await bcrypt.compare(code, otp.codeHash);
    if (!ok) {
      otp.attempts += 1;
      await otp.save();
      throw new HttpError(401, `รหัสไม่ถูกต้อง — เหลือ ${3 - otp.attempts} ครั้ง`);
    }

    // Verified — consume the OTP so it can't be reused.
    await OtpAttempt.deleteOne({ _id: otp._id });

    let user = await User.findOne({ phone: normalized });
    if (!user) {
      // Synthetic email — the User schema requires one. Phone is the real identifier.
      const email = `wa_${normalized}@whatsapp.local`;
      const randomPasswordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
      user = await User.create({
        email,
        name: `+${normalized}`,
        phone: normalized,
        passwordHash: randomPasswordHash,
      });
    }

    const token = signToken({ sub: String(user._id), role: user.role as 'user' | 'admin' });
    res.json({
      ok: true,
      token,
      user: { id: String(user._id), email: user.email, name: user.name, role: user.role },
    });
  } catch (e) {
    next(e);
  }
});
