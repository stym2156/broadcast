import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { mockApi } from '../../api/mock';
import { useAuth } from '../../store/auth';
import { Eye, EyeOff, Facebook, Loader2, ShieldCheck, Zap, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const nav = useNavigate();
  const setUser = useAuth((s) => s.setUser);
  const [email, setEmail] = useState('demo@user.com');
  const [password, setPassword] = useState('123456');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { user } = await mockApi.login(email, password);
      setUser(user);
      toast.success('ยินดีต้อนรับกลับมา!');
      nav('/dashboard');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function loginFb() {
    setLoading(true);
    try {
      const { user } = await mockApi.loginWithFacebook();
      setUser(user);
      toast.success('เข้าสู่ระบบด้วย Facebook สำเร็จ');
      nav('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-fuchsia-700 lg:block">
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_30%_20%,white_0%,transparent_40%),radial-gradient(circle_at_80%_80%,white_0%,transparent_30%)]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Logo />
          <div className="space-y-6">
            <h1 className="text-4xl font-extrabold leading-tight">
              ส่งข้อความหาลูกค้าเก่า<br />
              ผ่าน Messenger <span className="text-amber-300">ไม่จำกัด</span>
            </h1>
            <p className="max-w-md text-white/80">
              ระบบ broadcast อัตโนมัติสำหรับเพจ Facebook ของคุณ ไม่จำกัดเพจ ไม่จำกัดข้อความ ตั้งเวลาได้ จับกลุ่มเป้าหมายด้วย Tag
            </p>
            <div className="grid max-w-md grid-cols-3 gap-3 pt-2">
              {[
                { Icon: Zap, label: 'ส่งเร็ว' },
                { Icon: ShieldCheck, label: 'ปลอดภัย' },
                { Icon: BarChart3, label: 'วัดผลได้' },
              ].map(({ Icon, label }) => (
                <div key={label} className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <Icon size={20} />
                  <div className="mt-2 text-sm font-medium">{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-xs text-white/60">© 2026 BroadCast — ระบบ broadcast สำหรับธุรกิจไทย</div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center bg-white p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo size="lg" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900">เข้าสู่ระบบ</h2>
          <p className="mt-1 text-sm text-zinc-500">ยินดีต้อนรับกลับ! กรุณากรอกข้อมูลด้านล่าง</p>

          {/*
            WhatsApp OTP login is intentionally hidden from the UI pending Meta Business
            Verification (required to create the `login_otp` authentication template).
            The route /login/whatsapp, the WhatsAppLogin page, the /api/auth/wa/* endpoints,
            and the OtpAttempt model are all still wired up — re-add the <Link> below to
            expose it once Meta approves the business + auth template.
          */}
          <button
            onClick={loginFb}
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1877F2] py-2.5 text-sm font-semibold text-white hover:bg-[#1567d3] disabled:opacity-60"
          >
            <Facebook size={18} fill="white" />
            ดำเนินการต่อด้วย Facebook
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-zinc-400">
            <div className="h-px flex-1 bg-zinc-200" />
            หรือเข้าด้วยอีเมล
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="label">อีเมล</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <label className="label">รหัสผ่าน</label>
                <a className="text-xs font-medium text-brand-600 hover:underline">ลืมรหัสผ่าน?</a>
              </div>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  className="input pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100"
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              เข้าสู่ระบบ
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            ยังไม่มีบัญชี?{' '}
            <Link to="/register" className="font-semibold text-brand-600 hover:underline">
              สมัครฟรี 15 วัน
            </Link>
          </p>

          <div className="mt-8 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-500">
            <strong className="text-zinc-700">บัญชีทดลอง:</strong> demo@user.com / 123456
          </div>
        </div>
      </div>
    </div>
  );
}
