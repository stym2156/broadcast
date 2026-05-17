import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { mockApi } from '../../api/mock';
import { useAuth } from '../../store/auth';
import { Facebook, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Register() {
  const nav = useNavigate();
  const setUser = useAuth((s) => s.setUser);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { user } = await mockApi.register(name, email, password);
      setUser(user);
      toast.success('สมัครสมาชิกสำเร็จ! เริ่มทดลองใช้งานฟรี 15 วัน');
      nav('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-fuchsia-700 via-brand-700 to-brand-900 lg:block">
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_70%_20%,white_0%,transparent_40%),radial-gradient(circle_at_20%_80%,white_0%,transparent_30%)]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Logo />
          <div className="space-y-6">
            <h1 className="text-4xl font-extrabold leading-tight">เริ่มต้นใช้งานฟรี 15 วัน</h1>
            <p className="max-w-md text-white/80">
              ไม่ต้องบัตรเครดิต ทดลองส่ง broadcast หาลูกค้าจริงได้ทันที พร้อมระบบจัดการลูกค้า, แท็ก และตั้งเวลาส่งครบในที่เดียว
            </p>
            <ul className="space-y-3 text-sm">
              {[
                'ส่งข้อความไม่จำกัด ไม่จำกัดเพจ',
                'จับกลุ่มเป้าหมายด้วย Tag',
                'ตั้งเวลาส่งได้ล่วงหน้า',
                'รายงานผลการส่งแบบเรียลไทม์',
                'รองรับมือถือ แท็บเล็ต คอม',
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-300" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="text-xs text-white/60">© 2026 BroadCast</div>
        </div>
      </div>

      <div className="flex items-center justify-center bg-white p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo size="lg" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900">สมัครสมาชิก</h2>
          <p className="mt-1 text-sm text-zinc-500">ทดลองใช้ฟรี 15 วัน ไม่ต้องใช้บัตรเครดิต</p>

          <button
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1877F2] py-2.5 text-sm font-semibold text-white hover:bg-[#1567d3]"
            onClick={async () => {
              const { user } = await mockApi.loginWithFacebook();
              setUser(user);
              nav('/dashboard');
            }}
          >
            <Facebook size={18} fill="white" />
            สมัครด้วย Facebook
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-zinc-400">
            <div className="h-px flex-1 bg-zinc-200" />
            หรือใช้อีเมล
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="label">ชื่อ-นามสกุล</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="label">อีเมล</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">รหัสผ่าน</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <p className="mt-1 text-xs text-zinc-400">อย่างน้อย 6 ตัวอักษร</p>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              สมัครและเริ่มใช้งาน
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            มีบัญชีอยู่แล้ว?{' '}
            <Link to="/login" className="font-semibold text-brand-600 hover:underline">
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
