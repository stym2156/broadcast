import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { adminApi } from '../api/mock';
import { useAuth } from '../store/auth';
import { Loader2, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const nav = useNavigate();
  const setUser = useAuth((s) => s.setUser);
  const [email, setEmail] = useState('admin@broadcast.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await adminApi.login(email, password);
      setUser(u);
      toast.success('เข้าสู่ระบบสำเร็จ');
      nav('/dashboard');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink-900 px-4">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(16,185,129,.4), transparent 30%), radial-gradient(circle at 80% 70%, rgba(99,102,241,.3), transparent 30%)',
        }}
      />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo inverse />
        </div>
        <div className="rounded-2xl border border-white/10 bg-ink-800/70 p-8 shadow-2xl backdrop-blur">
          <div className="mb-6 flex items-center gap-2 text-white">
            <Lock size={18} className="text-accent-500" />
            <h1 className="text-lg font-bold">เข้าสู่ระบบผู้ดูแล</h1>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">อีเมล</label>
              <input
                type="email"
                className="w-full rounded-lg border border-white/10 bg-ink-700 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/20"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">รหัสผ่าน</label>
              <input
                type="password"
                className="w-full rounded-lg border border-white/10 bg-ink-700 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/20"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-accent-500 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              เข้าสู่ระบบ
            </button>
          </form>
          <div className="mt-6 rounded-lg border border-white/5 bg-ink-900/40 p-3 text-xs text-zinc-400">
            <strong className="text-zinc-300">บัญชีทดลอง:</strong> admin@broadcast.com / admin123
          </div>
        </div>
      </div>
    </div>
  );
}
