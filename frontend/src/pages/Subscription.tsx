import { useEffect, useState } from 'react';
import { mockApi } from '../api/mock';
import type { Plan, Subscription } from '../types';
import { CheckCircle2, Crown, Loader2, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [active, setActive] = useState<Subscription | null>(null);
  const [history, setHistory] = useState<Subscription[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function load() {
    const [p, s] = await Promise.all([mockApi.getPlans(), mockApi.getSubscriptions()]);
    setPlans(p);
    setActive(s.active);
    setHistory(s.history);
  }
  useEffect(() => {
    load();
  }, []);

  async function subscribe(id: string) {
    setLoadingId(id);
    try {
      await mockApi.subscribe(id);
      toast.success('สมัครแพ็กเกจเรียบร้อย');
      await load();
    } finally {
      setLoadingId(null);
    }
  }

  const daysLeft = active ? Math.max(0, Math.ceil((new Date(active.expiresAt).getTime() - Date.now()) / 86_400_000)) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">แพ็กเกจของฉัน</h1>
        <p className="mt-1 text-sm text-zinc-500">เลือกแพ็กเกจที่เหมาะกับธุรกิจของคุณ ยิ่งระยะยาว ยิ่งคุ้ม</p>
      </div>

      {active && (
        <div className="card relative overflow-hidden p-6">
          <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-gradient-to-br from-brand-200 to-fuchsia-200 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lift">
                <Crown size={24} />
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">แพ็กเกจปัจจุบัน</div>
                <div className="mt-0.5 text-xl font-bold text-zinc-900">{active.plan.name}</div>
                <div className="text-sm text-zinc-500">หมดอายุ {new Date(active.expiresAt).toLocaleDateString('th-TH')}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-zinc-500">เหลือ</div>
              <div className="text-3xl font-extrabold text-brand-700">{daysLeft} <span className="text-base font-medium text-zinc-500">วัน</span></div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((p, idx) => {
          const featured = idx === 2;
          return (
            <div
              key={p.id}
              className={clsx(
                'relative flex flex-col rounded-2xl border p-6 transition',
                featured
                  ? 'border-brand-500 bg-gradient-to-b from-brand-50/60 to-white shadow-lift'
                  : 'border-zinc-200 bg-white hover:border-brand-300 hover:shadow-soft'
              )}
            >
              {featured && (
                <div className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-gradient-to-r from-brand-600 to-fuchsia-600 px-3 py-1 text-xs font-semibold text-white shadow">
                  <Sparkles size={12} /> คุ้มที่สุด
                </div>
              )}
              {p.savingsPercent > 0 && (
                <div className="self-end rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  ประหยัด {p.savingsPercent}%
                </div>
              )}
              <h3 className="mt-2 text-lg font-bold text-zinc-900">{p.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-zinc-900">฿{p.pricePerMonth.toLocaleString()}</span>
                <span className="text-sm text-zinc-500">/เดือน</span>
              </div>
              <div className="mt-1 text-xs text-zinc-500">รวม ฿{p.price.toLocaleString()} ({p.months} เดือน)</div>
              <ul className="my-5 space-y-2 text-sm text-zinc-600">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="mt-0.5 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => subscribe(p.id)}
                disabled={loadingId !== null}
                className={clsx(
                  'mt-auto flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition disabled:opacity-60',
                  featured
                    ? 'bg-gradient-to-r from-brand-600 to-fuchsia-600 text-white hover:from-brand-700 hover:to-fuchsia-700'
                    : 'border border-zinc-200 text-zinc-700 hover:border-brand-400 hover:text-brand-700'
                )}
              >
                {loadingId === p.id ? <Loader2 size={14} className="animate-spin" /> : null}
                เลือกแพ็กเกจนี้
              </button>
            </div>
          );
        })}
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-zinc-100 px-5 py-3 text-sm font-semibold">ประวัติการชำระเงิน</div>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50/60 text-xs uppercase tracking-wider text-zinc-500">
            <tr className="text-left">
              <th className="px-5 py-3 font-medium">แพ็กเกจ</th>
              <th className="px-5 py-3 font-medium">วันที่เริ่ม</th>
              <th className="px-5 py-3 font-medium">วันที่หมดอายุ</th>
              <th className="px-5 py-3 font-medium">ยอด</th>
              <th className="px-5 py-3 font-medium">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {history.map((h) => (
              <tr key={h.id}>
                <td className="px-5 py-3 font-medium text-zinc-800">{h.plan.name}</td>
                <td className="px-5 py-3 text-zinc-600">{new Date(h.startedAt).toLocaleDateString('th-TH')}</td>
                <td className="px-5 py-3 text-zinc-600">{new Date(h.expiresAt).toLocaleDateString('th-TH')}</td>
                <td className="px-5 py-3 font-semibold">฿{h.amountPaid.toLocaleString()}</td>
                <td className="px-5 py-3">
                  <span
                    className={clsx(
                      'badge',
                      h.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600'
                    )}
                  >
                    {h.status === 'active' ? 'ใช้งานอยู่' : h.status === 'expired' ? 'หมดอายุ' : h.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
