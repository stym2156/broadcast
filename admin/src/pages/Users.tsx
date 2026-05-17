import { useEffect, useState } from 'react';
import { adminApi } from '../api/mock';
import type { AdminUser } from '../types';
import { Search, ShieldOff, ShieldCheck, MoreVertical } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function Users() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended'>('all');

  useEffect(() => {
    adminApi.getUsers().then(setUsers);
  }, []);

  const filtered = users.filter((u) => {
    if (filter !== 'all' && u.status !== filter) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function toggleStatus(u: AdminUser) {
    const action = u.status === 'active' ? 'ระงับ' : 'เปิดใช้';
    if (!confirm(`ยืนยัน${action}บัญชี ${u.email}?`)) return;
    await adminApi.toggleUserStatus(u.id);
    setUsers([...users]);
    toast.success(`${action}บัญชีแล้ว`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">ผู้ใช้งาน</h1>
        <p className="mt-1 text-sm text-zinc-500">จัดการบัญชีผู้ใช้และสิทธิ์การเข้าถึง</p>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input className="input pl-9" placeholder="ค้นหาชื่อหรืออีเมล..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white p-1">
            {(['all', 'active', 'suspended'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                  filter === f ? 'bg-ink-800 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                )}
              >
                {f === 'all' ? 'ทั้งหมด' : f === 'active' ? 'ใช้งาน' : 'ระงับ'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50/60 text-xs uppercase tracking-wider text-zinc-500">
            <tr className="text-left">
              <th className="px-5 py-3 font-medium">ผู้ใช้</th>
              <th className="px-5 py-3 font-medium">แพ็กเกจ</th>
              <th className="px-5 py-3 font-medium">เพจ</th>
              <th className="px-5 py-3 font-medium">สถานะ</th>
              <th className="px-5 py-3 font-medium">เข้าครั้งล่าสุด</th>
              <th className="px-5 py-3 font-medium">สมัครเมื่อ</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-zinc-50/60">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-accent-500 to-emerald-600 text-xs font-bold text-white">
                      {u.name[0]}
                    </div>
                    <div>
                      <div className="font-medium text-zinc-800">
                        {u.name}
                        {u.role === 'admin' && <span className="ml-2 badge bg-indigo-100 text-indigo-700">Admin</span>}
                      </div>
                      <div className="text-xs text-zinc-500">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-zinc-700">{u.plan}</td>
                <td className="px-5 py-3 text-zinc-700">{u.pages} เพจ</td>
                <td className="px-5 py-3">
                  <span className={clsx('badge', u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
                    {u.status === 'active' ? 'ใช้งาน' : 'ระงับ'}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-zinc-500">{new Date(u.lastLoginAt).toLocaleString('th-TH')}</td>
                <td className="px-5 py-3 text-xs text-zinc-500">{new Date(u.joinedAt).toLocaleDateString('th-TH')}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleStatus(u)}
                      className={clsx(
                        'rounded-lg p-1.5 transition',
                        u.status === 'active' ? 'text-zinc-400 hover:bg-rose-50 hover:text-rose-600' : 'text-zinc-400 hover:bg-emerald-50 hover:text-emerald-600'
                      )}
                      title={u.status === 'active' ? 'ระงับ' : 'เปิดใช้'}
                    >
                      {u.status === 'active' ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}
                    </button>
                    <button className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="py-10 text-center text-sm text-zinc-400">ไม่พบผู้ใช้</div>}
      </div>
    </div>
  );
}
