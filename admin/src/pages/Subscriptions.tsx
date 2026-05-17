import { useEffect, useState } from 'react';
import { adminApi } from '../api/mock';
import type { AdminSubscription } from '../types';
import clsx from 'clsx';

const STATUS: Record<AdminSubscription['status'], { label: string; cls: string }> = {
  active: { label: 'ใช้งาน', cls: 'bg-emerald-100 text-emerald-700' },
  trial: { label: 'ทดลอง', cls: 'bg-indigo-100 text-indigo-700' },
  expired: { label: 'หมดอายุ', cls: 'bg-zinc-100 text-zinc-600' },
  cancelled: { label: 'ยกเลิก', cls: 'bg-rose-100 text-rose-700' },
};

export default function Subscriptions() {
  const [items, setItems] = useState<AdminSubscription[]>([]);
  useEffect(() => {
    adminApi.getSubscriptions().then(setItems);
  }, []);

  const total = items.reduce((s, x) => s + x.amount, 0);
  const active = items.filter((x) => x.status === 'active').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">การสมัครสมาชิก</h1>
        <p className="mt-1 text-sm text-zinc-500">ดูประวัติการสมัครและสถานะ subscription ของผู้ใช้ทั้งหมด</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wider text-zinc-500">Subscription ใช้งาน</div>
          <div className="mt-1 text-2xl font-bold">{active.toLocaleString()}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wider text-zinc-500">รายได้รวม</div>
          <div className="mt-1 text-2xl font-bold">฿{total.toLocaleString()}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wider text-zinc-500">เฉลี่ยต่อราย</div>
          <div className="mt-1 text-2xl font-bold">
            ฿{items.length > 0 ? Math.round(total / items.length).toLocaleString() : 0}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50/60 text-xs uppercase tracking-wider text-zinc-500">
            <tr className="text-left">
              <th className="px-5 py-3 font-medium">ผู้ใช้</th>
              <th className="px-5 py-3 font-medium">แพ็กเกจ</th>
              <th className="px-5 py-3 font-medium">ยอด</th>
              <th className="px-5 py-3 font-medium">เริ่ม</th>
              <th className="px-5 py-3 font-medium">หมดอายุ</th>
              <th className="px-5 py-3 font-medium">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {items.map((s) => (
              <tr key={s.id} className="hover:bg-zinc-50/60">
                <td className="px-5 py-3">
                  <div className="font-medium text-zinc-800">{s.userName}</div>
                  <div className="text-xs text-zinc-500">{s.userEmail}</div>
                </td>
                <td className="px-5 py-3 text-zinc-700">{s.planName}</td>
                <td className="px-5 py-3 font-semibold">฿{s.amount.toLocaleString()}</td>
                <td className="px-5 py-3 text-xs text-zinc-500">{new Date(s.startedAt).toLocaleDateString('th-TH')}</td>
                <td className="px-5 py-3 text-xs text-zinc-500">{new Date(s.expiresAt).toLocaleDateString('th-TH')}</td>
                <td className="px-5 py-3">
                  <span className={clsx('badge', STATUS[s.status].cls)}>{STATUS[s.status].label}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
