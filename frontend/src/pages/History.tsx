import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { mockApi } from '../api/mock';
import type { Broadcast, BroadcastStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Empty } from '../components/Empty';
import { Send, Search, Filter, Eye } from 'lucide-react';

const FILTERS: { label: string; value: BroadcastStatus | 'all' }[] = [
  { label: 'ทั้งหมด', value: 'all' },
  { label: 'รอส่ง', value: 'scheduled' },
  { label: 'กำลังส่ง', value: 'sending' },
  { label: 'เสร็จแล้ว', value: 'completed' },
  { label: 'ล้มเหลว', value: 'failed' },
];

export default function History() {
  const [items, setItems] = useState<Broadcast[]>([]);
  const [filter, setFilter] = useState<BroadcastStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    mockApi.getBroadcasts().then(setItems);
  }, []);

  const filtered = items.filter((i) => {
    if (filter !== 'all' && i.status !== filter) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">ประวัติการส่ง Broadcast</h1>
          <p className="mt-1 text-sm text-zinc-500">ดูสถานะการส่งและผลลัพธ์ของ broadcast ทั้งหมด</p>
        </div>
        <Link to="/broadcast" className="btn-primary"><Send size={16} /> สร้างใหม่</Link>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              className="input pl-9"
              placeholder="ค้นหาหัวข้อ broadcast..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white p-1">
            <Filter size={14} className="ml-2 text-zinc-400" />
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  filter === f.value ? 'bg-brand-600 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty
          icon={Send}
          title="ยังไม่มี broadcast"
          description="เริ่มสร้าง broadcast แรกของคุณเลย"
          action={
            <Link to="/broadcast" className="btn-primary">
              <Send size={16} /> สร้าง Broadcast
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((b) => {
            const progress = b.totalRecipients > 0 ? Math.round((b.sentCount / b.totalRecipients) * 100) : 0;
            return (
              <div key={b.id} className="card p-5 transition hover:shadow-lift">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-zinc-900">{b.title}</h3>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{b.message}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                      <span>เพจ: <strong className="text-zinc-700">{b.pageNames.join(', ')}</strong></span>
                      {b.targetTags.length > 0 && <span>Tag: {b.targetTags.join(', ')}</span>}
                      <span>•</span>
                      <span>{new Date(b.createdAt).toLocaleString('th-TH')}</span>
                    </div>
                  </div>
                  <button className="btn-outline"><Eye size={14} /> ดูรายละเอียด</button>
                </div>
                {b.totalRecipients > 0 && (
                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="text-zinc-500">ส่งแล้ว {b.sentCount.toLocaleString()} / {b.totalRecipients.toLocaleString()}</span>
                      <span className="font-semibold text-brand-700">{progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-fuchsia-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
