import { useEffect, useState } from 'react';
import { adminApi } from '../api/mock';
import { Users, Send, CreditCard, DollarSign, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import clsx from 'clsx';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899'];

function Stat({
  label,
  value,
  delta,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  delta?: string;
  icon: typeof Users;
  tone: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</div>
          <div className="mt-1.5 text-2xl font-bold text-zinc-900">{value}</div>
          {delta && (
            <div className="mt-1 flex items-center gap-1 text-xs font-medium text-emerald-600">
              <TrendingUp size={12} /> {delta}
            </div>
          )}
        </div>
        <div className={clsx('grid h-11 w-11 place-items-center rounded-xl text-white', tone)}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof adminApi.getStats>> | null>(null);
  useEffect(() => {
    adminApi.getStats().then(setStats);
  }, []);

  if (!stats) return <div className="text-zinc-400">กำลังโหลด...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">ภาพรวมระบบ</h1>
        <p className="mt-1 text-sm text-zinc-500">สรุปการใช้งานและรายได้ของแพลตฟอร์ม</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="ผู้ใช้ทั้งหมด" value={stats.users.toLocaleString()} delta="+8% เดือนนี้" icon={Users} tone="bg-gradient-to-br from-emerald-500 to-teal-500" />
        <Stat label="Broadcast ทั้งหมด" value={stats.broadcasts.toLocaleString()} icon={Send} tone="bg-gradient-to-br from-indigo-500 to-violet-500" />
        <Stat label="Subscription ใช้งาน" value={stats.activeSubscriptions.toLocaleString()} delta="+5 รายใหม่" icon={CreditCard} tone="bg-gradient-to-br from-amber-500 to-orange-500" />
        <Stat label="รายได้รวม" value={'฿' + stats.revenueTotal.toLocaleString()} delta="+22% YoY" icon={DollarSign} tone="bg-gradient-to-br from-fuchsia-500 to-pink-500" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-800">รายได้ 7 วันล่าสุด</div>
              <div className="text-xs text-zinc-500">รวมจากทุกแพ็กเกจ</div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={stats.revenueWeek} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e4e4e7', fontSize: 12 }}
                  formatter={(v) => ['฿' + (v as number).toLocaleString(), 'รายได้']}
                />
                <Bar dataKey="revenue" radius={[8, 8, 0, 0]} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-3">
            <div className="text-sm font-semibold text-zinc-800">สัดส่วนแพ็กเกจ</div>
            <div className="text-xs text-zinc-500">แบ่งตามจำนวน subscriber</div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={stats.planDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                  {stats.planDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e4e4e7', fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-zinc-800">ผู้ใช้ลงทะเบียนล่าสุด</div>
          </div>
          <div className="divide-y divide-zinc-100">
            {stats.recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-accent-500 to-emerald-600 text-xs font-bold text-white">
                    {u.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-800">{u.name}</div>
                    <div className="text-xs text-zinc-500">{u.email}</div>
                  </div>
                </div>
                <span className="text-xs text-zinc-500">{new Date(u.joinedAt).toLocaleDateString('th-TH')}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-zinc-800">Broadcast ล่าสุด</div>
          </div>
          <div className="divide-y divide-zinc-100">
            {stats.recentBroadcasts.map((b) => (
              <div key={b.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-800">{b.title}</div>
                  <div className="text-xs text-zinc-500">โดย {b.ownerName}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-zinc-800">{b.sentCount.toLocaleString()}</div>
                  <div className="text-xs text-zinc-500">ข้อความ</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
