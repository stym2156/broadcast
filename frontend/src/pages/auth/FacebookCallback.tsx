import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../store/auth';
import type { User } from '../../types';

/**
 * Facebook redirects here after the OAuth dialog with `?code=...&state=...`.
 * We exchange the code for our JWT, persist auth, then send the user on to
 * the page-picker (or dashboard if they've already connected pages once).
 */
export default function FacebookCallback() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const setUser = useAuth((s) => s.setUser);
  const [error, setError] = useState<string | null>(null);
  /** Strict-mode runs effects twice in dev — guard so we don't exchange the code twice. */
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = params.get('code');
    const fbError = params.get('error_description') ?? params.get('error');

    if (fbError) {
      setError(fbError);
      return;
    }
    if (!code) {
      setError('ไม่พบ code จาก Facebook');
      return;
    }

    (async () => {
      try {
        const { data } = await api.post<{
          ok: boolean;
          token: string;
          user: User;
          fbAccessToken: string;
        }>('/oauth/facebook/callback', { code });
        localStorage.setItem('bc_token', data.token);
        localStorage.setItem('bc_user', JSON.stringify(data.user));
        // Stash the FB access token so the next screen can list the user's managed pages.
        sessionStorage.setItem('fb_access_token', data.fbAccessToken);
        setUser(data.user);
        nav('/connect-pages', { replace: true });
      } catch (err) {
        const msg = (err as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error
          ?? (err as Error).message
          ?? 'เกิดข้อผิดพลาด';
        setError(msg);
      }
    })();
  }, [params, nav, setUser]);

  return (
    <div className="grid min-h-screen place-items-center bg-zinc-50 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-soft">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        {error ? (
          <div className="text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-rose-100 text-rose-600">
              <AlertTriangle size={20} />
            </div>
            <h2 className="mt-3 text-base font-semibold text-zinc-900">เข้าสู่ระบบไม่สำเร็จ</h2>
            <p className="mt-1 text-sm text-zinc-500 break-words">{error}</p>
            <button onClick={() => nav('/login', { replace: true })} className="btn-outline mt-5 w-full">
              กลับไปหน้า login
            </button>
          </div>
        ) : (
          <div className="text-center">
            <Loader2 size={24} className="mx-auto animate-spin text-brand-600" />
            <h2 className="mt-3 text-base font-semibold text-zinc-900">กำลังเข้าสู่ระบบ...</h2>
            <p className="mt-1 text-sm text-zinc-500">กำลังแลก token กับ Facebook</p>
          </div>
        )}
      </div>
    </div>
  );
}
