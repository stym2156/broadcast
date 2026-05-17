import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { mockApi } from '../../api/mock';
import { useAuth } from '../../store/auth';
import { ArrowLeft, Loader2, MessageCircle, Phone, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

const WhatsAppIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.5 14.4c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.7.1-.1.3-.4.5-.6.1-.2.2-.3.3-.6.1-.2 0-.4 0-.6-.1-.2-.7-1.7-.9-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.5 1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2.5C6.8 2.5 2.5 6.8 2.5 12c0 1.7.4 3.3 1.3 4.7L2.5 21.5l4.9-1.3c1.4.8 2.9 1.2 4.6 1.2 5.2 0 9.5-4.3 9.5-9.5S17.2 2.5 12 2.5z" />
  </svg>
);

type Step = 'phone' | 'otp';

export default function WhatsAppLogin() {
  const nav = useNavigate();
  const setUser = useAuth((s) => s.setUser);

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Countdown for resend button
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  useEffect(() => {
    if (step === 'otp') otpInputRef.current?.focus();
  }, [step]);

  async function sendOtp() {
    if (!phone.trim()) return;
    setSending(true);
    try {
      await mockApi.sendWaOtp(phone.trim());
      setStep('otp');
      setResendIn(60);
      setCode('');
      toast.success('ส่งรหัสไปยัง WhatsApp ของคุณแล้ว');
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error
        ?? (err as Error).message;
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  async function verify() {
    if (code.length !== 6) return;
    setVerifying(true);
    try {
      const { user } = await mockApi.verifyWaOtp(phone.trim(), code);
      setUser(user);
      toast.success('เข้าสู่ระบบสำเร็จ');
      nav('/dashboard', { replace: true });
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error
        ?? (err as Error).message;
      toast.error(msg);
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#0b3d2e] via-[#128C7E] to-[#25D366] lg:block">
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_30%_20%,white_0%,transparent_40%),radial-gradient(circle_at_80%_80%,white_0%,transparent_30%)]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Logo />
          <div className="space-y-6">
            <h1 className="text-4xl font-extrabold leading-tight">
              เข้าระบบด้วย<br />
              <span className="text-amber-300">WhatsApp</span> ของคุณ
            </h1>
            <p className="max-w-md text-white/80">
              ไม่ต้องสมัครสมาชิก ไม่ต้องจำรหัสผ่าน — แค่กรอกเบอร์โทร เราจะส่งรหัสยืนยัน 6 หลักไปที่ WhatsApp ของคุณ
            </p>
            <ul className="space-y-3 text-sm">
              {[
                { Icon: MessageCircle, text: 'รหัสส่งผ่าน WhatsApp ทันที' },
                { Icon: Shield, text: 'ปลอดภัย — รหัสหมดอายุใน 5 นาที' },
                { Icon: Phone, text: 'ใช้ได้ทุกประเทศที่มี WhatsApp' },
              ].map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-2">
                  <Icon size={18} className="text-white/80" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <div className="text-xs text-white/60">© 2026 BroadCast</div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center bg-white p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <Link to="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700">
            <ArrowLeft size={14} /> กลับไปเลือกวิธี login
          </Link>
          <div className="mb-8 lg:hidden">
            <Logo size="lg" />
          </div>

          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#25D366] text-white">
              <WhatsAppIcon size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900">เข้าด้วย WhatsApp</h2>
              <p className="text-sm text-zinc-500">
                {step === 'phone' ? 'กรอกเบอร์โทรเพื่อรับรหัส' : 'กรอกรหัส 6 หลัก'}
              </p>
            </div>
          </div>

          {step === 'phone' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendOtp();
              }}
              className="space-y-4"
            >
              <div>
                <label className="label">เบอร์โทรศัพท์</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="tel"
                    className="input pl-9"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0812345678 หรือ 66812345678"
                    autoFocus
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  เลข 0 นำหน้า ระบบจะแทนด้วย +66 ให้อัตโนมัติ
                </p>
              </div>
              <button
                type="submit"
                disabled={sending || !phone.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-sm font-semibold text-white hover:bg-[#1ebe5d] disabled:opacity-60"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <WhatsAppIcon size={16} />}
                ส่งรหัสไปที่ WhatsApp
              </button>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                verify();
              }}
              className="space-y-4"
            >
              <div>
                <label className="label">รหัส 6 หลัก</label>
                <input
                  ref={otpInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  className="input text-center text-2xl font-mono tracking-[0.5em]"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="• • • • • •"
                  required
                />
                <p className="mt-2 text-xs text-zinc-500">
                  ส่งไปที่ <strong>{phone}</strong> ทาง WhatsApp — รหัสหมดอายุใน 5 นาที
                </p>
              </div>
              <button
                type="submit"
                disabled={verifying || code.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-sm font-semibold text-white hover:bg-[#1ebe5d] disabled:opacity-60"
              >
                {verifying ? <Loader2 size={16} className="animate-spin" /> : null}
                ยืนยันและเข้าสู่ระบบ
              </button>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-zinc-500 hover:text-zinc-700"
                >
                  แก้เบอร์
                </button>
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={resendIn > 0 || sending}
                  className="font-medium text-[#25D366] hover:underline disabled:cursor-not-allowed disabled:text-zinc-400 disabled:no-underline"
                >
                  {resendIn > 0 ? `ส่งใหม่ใน ${resendIn}s` : 'ส่งรหัสใหม่'}
                </button>
              </div>
            </form>
          )}

          <p className="mt-8 text-center text-xs text-zinc-400">
            การกดส่งรหัสถือว่ายอมรับ <a className="underline">เงื่อนไขการใช้งาน</a>
          </p>
        </div>
      </div>
    </div>
  );
}
