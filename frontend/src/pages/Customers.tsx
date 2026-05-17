import { useEffect, useMemo, useState } from 'react';
import { mockApi } from '../api/mock';
import type { Customer } from '../types';
import { Search, Tag as TagIcon, Users } from 'lucide-react';
import { Empty } from '../components/Empty';

const ALL_TAGS = ['ลูกค้าเก่า', 'ลูกค้าใหม่', 'VIP', 'สนใจสินค้า A', 'สนใจสินค้า B'];

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tag, setTag] = useState<string>('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    mockApi.getCustomers().then(setCustomers);
  }, []);

  const filtered = useMemo(
    () =>
      customers.filter((c) => {
        if (tag && !c.tags.includes(tag)) return false;
        if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [customers, tag, search]
  );

  const stats = useMemo(() => {
    const byTag: Record<string, number> = {};
    customers.forEach((c) => c.tags.forEach((t) => (byTag[t] = (byTag[t] ?? 0) + 1)));
    return byTag;
  }, [customers]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">ลูกค้า / Tag</h1>
        <p className="mt-1 text-sm text-zinc-500">จัดการรายชื่อลูกค้าและแท็กกลุ่มเป้าหมายสำหรับ broadcast</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card flex items-center gap-3 p-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-600"><Users size={18} /></div>
          <div>
            <div className="text-xs text-zinc-500">ลูกค้าทั้งหมด</div>
            <div className="text-lg font-bold">{customers.length.toLocaleString()}</div>
          </div>
        </div>
        {ALL_TAGS.slice(0, 3).map((t) => (
          <div key={t} className="card flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-fuchsia-100 text-fuchsia-600"><TagIcon size={18} /></div>
            <div>
              <div className="text-xs text-zinc-500">{t}</div>
              <div className="text-lg font-bold">{(stats[t] ?? 0).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input className="input pl-9" placeholder="ค้นหาชื่อลูกค้า..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setTag('')}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                tag === '' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-zinc-200 text-zinc-600 hover:border-brand-300'
              }`}
            >
              ทั้งหมด
            </button>
            {ALL_TAGS.map((t) => (
              <button
                key={t}
                onClick={() => setTag(t)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  tag === t ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-zinc-200 text-zinc-600 hover:border-brand-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty icon={Users} title="ไม่พบลูกค้าที่ตรงกับเงื่อนไข" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50/60 text-xs uppercase tracking-wider text-zinc-500">
              <tr className="text-left">
                <th className="px-5 py-3 font-medium">ลูกค้า</th>
                <th className="px-5 py-3 font-medium">เพจ</th>
                <th className="px-5 py-3 font-medium">Tags</th>
                <th className="px-5 py-3 font-medium">ทักล่าสุด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.slice(0, 50).map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50/60">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-fuchsia-500 text-xs font-bold text-white">
                        {c.name[0]}
                      </div>
                      <div>
                        <div className="font-medium text-zinc-800">{c.name}</div>
                        <div className="text-xs text-zinc-400">PSID: {c.psid}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-zinc-600">{c.pageName}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <span key={t} className="badge bg-brand-50 text-brand-700">{t}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-zinc-500">{new Date(c.lastInteractionAt).toLocaleDateString('th-TH')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 50 && (
            <div className="border-t border-zinc-100 px-5 py-3 text-center text-xs text-zinc-500">
              แสดง 50 จาก {filtered.length.toLocaleString()} รายการ
            </div>
          )}
        </div>
      )}
    </div>
  );
}
