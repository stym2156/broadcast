import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, Users, Facebook, Activity, ArrowRight, Sparkles, Inbox } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { mockApi } from '../api/mock';
import type { Broadcast } from '../types';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAuth } from '../store/auth';

export default function Dashboard() {
  const user = useAuth((s) => s.user);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof mockApi.getDashboardStats>> | null>(null);

  useEffect(() => {
    mockApi.getDashboardStats().then(setStats);
  }, []);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-fuchsia-700 p-6 text-white sm:p-8">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/70">
              <Sparkles size={14} /> สวัสดีกลับมา
            </div>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{user?.name}</h1>
            <p className="mt-1 max-w-xl text-sm text-white/80">
              วันนี้คุณส่งไปแล้ว <strong>{(stats?.totalSent ?? 0).toLocaleString()}</strong> ข้อความ จาก{' '}
              <strong>{stats?.pages ?? 0}</strong> เพจ ลองส่ง broadcast ใหม่กันเลย!
            </p>
          </div>
          <Link
            to="/broadcast"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 shadow-lg transition hover:bg-zinc-50"
          >
            <Send size={16} /> สร้าง Broadcast ใหม่
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="ส่งทั้งหมดเดือนนี้" value={(stats?.totalSent ?? 0).toLocaleString()} delta="+18% จากเดือนก่อน" icon={Send} tone="brand" />
        <StatCard label="เพจที่เชื่อมต่อ" value={stats?.pages ?? 0} icon={Facebook} tone="emerald" />
        <StatCard label="ลูกค้าทั้งหมด" value={(stats?.customers ?? 0).toLocaleString()} delta="+42 รายใหม่" icon={Users} tone="amber" />
        <StatCard label="Broadcast กำลังทำงาน" value={stats?.activeBroadcasts ?? 0} icon={Activity} tone="rose" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-800">ข้อความที่ส่งใน 7 วันที่ผ่านมา</div>
              <div className="text-xs text-zinc-500">รวมจากทุกเพจ ทุก broadcast</div>
            </div>
            <select className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs">
              <option>7 วัน</option>
              <option>30 วัน</option>
              <option>90 วัน</option>
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={stats?.weekly ?? []} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e4e4e7', fontSize: 12 }}
                  formatter={(v) => [(v as number).toLocaleString() + ' ข้อความ', 'ส่งแล้ว']}
                />
                <Area type="monotone" dataKey="sent" stroke="#6366f1" strokeWidth={2.5} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-zinc-800">Quick actions</div>
          </div>
          <div className="space-y-2">
            {[
              {
                to: '/inbox',
                label: `ตอบข้อความ${stats?.unreadMessages ? ` (${stats.unreadMessages} ใหม่)` : ''}`,
                icon: Inbox,
                tone: 'bg-rose-50 text-rose-700',
              },
              { to: '/broadcast', label: 'ส่ง Broadcast ใหม่', icon: Send, tone: 'bg-brand-50 text-brand-700' },
              { to: '/pages', label: 'เชื่อมเพจ Facebook', icon: Facebook, tone: 'bg-blue-50 text-blue-700' },
              { to: '/customers', label: 'จัดการ Tag ลูกค้า', icon: Users, tone: 'bg-amber-50 text-amber-700' },
              { to: '/history', label: 'ดูประวัติการส่ง', icon: Activity, tone: 'bg-emerald-50 text-emerald-700' },
            ].map(({ to, label, icon: Icon, tone }) => (
              <Link
                key={to}
                to={to}
                className="group flex items-center justify-between rounded-xl border border-zinc-200/70 px-3 py-2.5 transition hover:border-brand-300 hover:bg-brand-50/40"
              >
                <div className="flex items-center gap-3">
                  <div className={`grid h-9 w-9 place-items-center rounded-lg ${tone}`}>
                    <Icon size={16} />
                  </div>
                  <span className="text-sm font-medium text-zinc-700">{label}</span>
                </div>
                <ArrowRight size={16} className="text-zinc-300 transition group-hover:text-brand-500" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-zinc-800">Broadcast ล่าสุด</div>
            <div className="text-xs text-zinc-500">แสดง 5 รายการล่าสุด</div>
          </div>
          <Link to="/history" className="text-xs font-medium text-brand-600 hover:underline">
            ดูทั้งหมด →
          </Link>
        </div>
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-5 py-2 font-medium">หัวข้อ</th>
                <th className="px-5 py-2 font-medium">เพจ</th>
                <th className="px-5 py-2 font-medium">สถานะ</th>
                <th className="px-5 py-2 font-medium">ส่งแล้ว</th>
                <th className="px-5 py-2 font-medium">วันที่สร้าง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(stats?.recent ?? []).map((b: Broadcast) => (
                <tr key={b.id} className="hover:bg-zinc-50/60">
                  <td className="px-5 py-3 font-medium text-zinc-800">{b.title}</td>
                  <td className="px-5 py-3 text-zinc-600">{b.pageNames.join(', ')}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-5 py-3 text-zinc-700">
                    {b.sentCount.toLocaleString()} / {b.totalRecipients.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-zinc-500">{new Date(b.createdAt).toLocaleString('th-TH')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
