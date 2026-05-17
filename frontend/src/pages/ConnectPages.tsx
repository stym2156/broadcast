import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Facebook, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface ManagedPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
}

/**
 * Step after FacebookCallback — show the user their managed pages and let them
 * pick which ones to connect. Each pick POSTs to /api/oauth/facebook/pages/connect
 * which subscribes the page to webhooks too.
 */
export default function ConnectPages() {
  const nav = useNavigate();
  const [pages, setPages] = useState<ManagedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem('fb_access_token');
    if (!token) {
      nav('/login', { replace: true });
      return;
    }
    (async () => {
      try {
        const { data } = await api.post<{ ok: boolean; pages: ManagedPage[] }>('/oauth/facebook/pages', {
          fbAccessToken: token,
        });
        setPages(data.pages);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [nav]);

  async function connect(page: ManagedPage) {
    setConnecting(page.id);
    try {
      await api.post('/oauth/facebook/pages/connect', {
        pageId: page.id,
        name: page.name,
        accessToken: page.access_token,
      });
      setConnected((s) => new Set(s).add(page.id));
      toast.success(`เชื่อมเพจ "${page.name}" สำเร็จ`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setConnecting(null);
    }
  }

  function finish() {
    sessionStorage.removeItem('fb_access_token');
    nav('/dashboard', { replace: true });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-zinc-50 px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-soft sm:p-8">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#1877F2] text-white">
            <Facebook size={22} fill="white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">เชื่อมเพจ Facebook</h1>
            <p className="text-sm text-zinc-500">เลือกเพจที่ต้องการให้ระบบส่ง broadcast และรับข้อความ</p>
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="flex flex-col items-center py-10 text-zinc-400">
              <Loader2 size={24} className="animate-spin" />
              <p className="mt-2 text-sm">กำลังโหลดเพจของคุณ...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : pages.length === 0 ? (
            <div className="rounded-xl bg-amber-50 px-4 py-4 text-sm text-amber-800">
              ไม่พบเพจที่คุณเป็นแอดมิน — ตรวจสอบสิทธิ์ใน Facebook ของคุณว่ามี <strong>pages_show_list</strong> ให้ app นี้
            </div>
          ) : (
            <ul className="space-y-2">
              {pages.map((p) => {
                const isConnected = connected.has(p.id);
                return (
                  <li
                    key={p.id}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 transition ${
                      isConnected ? 'border-emerald-300 bg-emerald-50/50' : 'border-zinc-200'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-zinc-900">{p.name}</div>
                      <div className="text-xs text-zinc-500">{p.category ?? `ID: ${p.id}`}</div>
                    </div>
                    {isConnected ? (
                      <span className="badge bg-emerald-100 text-emerald-700">
                        <CheckCircle2 size={12} /> เชื่อมแล้ว
                      </span>
                    ) : (
                      <button
                        onClick={() => connect(p)}
                        disabled={connecting === p.id}
                        className="btn-primary py-1.5 text-xs"
                      >
                        {connecting === p.id ? <Loader2 size={12} className="animate-spin" /> : null}
                        เชื่อม
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-6 flex justify-between">
          <button onClick={finish} className="btn-ghost">
            ข้าม (เชื่อมภายหลังได้)
          </button>
          <button onClick={finish} className="btn-primary">
            เสร็จสิ้น <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
