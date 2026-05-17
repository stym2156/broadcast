import { useEffect, useState } from 'react';
import { adminApi } from '../api/mock';
import type { AdminBroadcast } from '../types';
import { Search } from 'lucide-react';
import clsx from 'clsx';

const STATUS_LABEL: Record<AdminBroadcast['status'], { label: string; cls: string }> = {
  draft: { label: 'ฉบับร่าง', cls: 'bg-zinc-100 text-zinc-700' },
  scheduled: { label: 'รอส่ง', cls: 'bg-amber-100 text-amber-700' },
  sending: { label: 'กำลังส่ง', cls: 'bg-indigo-100 text-indigo-700' },
  completed: { label: 'เสร็จแล้ว', cls: 'bg-emerald-100 text-emerald-700' },
  failed: { label: 'ล้มเหลว', cls: 'bg-rose-100 text-rose-700' },
};

export default function Broadcasts() {
  const [items, setItems] = useState<AdminBroadcast[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    adminApi.getBroadcasts().then(setItems);
  }, []);

  const filtered = items.filter((i) =>
    !search ||
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    i.ownerEmail.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Broadcast ทั้งหมด</h1>
        <p className="mt-1 text-sm text-zinc-500">ดู broadcast ของผู้ใช้ทั้งหมดในระบบ</p>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input className="input pl-9" placeholder="ค้นหาด้วยหัวข้อ หรืออีเมลผู้ใช้..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50/60 text-xs uppercase tracking-wider text-zinc-500">
            <tr className="text-left">
              <th className="px-5 py-3 font-medium">หัวข้อ</th>
              <th className="px-5 py-3 font-medium">เจ้าของ</th>
              <th className="px-5 py-3 font-medium">สถานะ</th>
              <th className="px-5 py-3 font-medium">ความคืบหน้า</th>
              <th className="px-5 py-3 font-medium">วันที่</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map((b) => {
              const pct = b.totalRecipients > 0 ? Math.round((b.sentCount / b.totalRecipients) * 100) : 0;
              return (
                <tr key={b.id} className="hover:bg-zinc-50/60">
                  <td className="px-5 py-3 font-medium text-zinc-800">{b.title}</td>
                  <td className="px-5 py-3">
                    <div className="text-sm">{b.ownerName}</div>
                    <div className="text-xs text-zinc-500">{b.ownerEmail}</div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={clsx('badge', STATUS_LABEL[b.status].cls)}>{STATUS_LABEL[b.status].label}</span>
                  </td>
                  <td className="px-5 py-3 w-64">
                    <div className="text-xs text-zinc-500">
                      {b.sentCount.toLocaleString()} / {b.totalRecipients.toLocaleString()} ({pct}%)
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                      <div className="h-full rounded-full bg-accent-500" style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-zinc-500">{new Date(b.createdAt).toLocaleString('th-TH')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
