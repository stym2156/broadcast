import { useState } from 'react';
import { useAuth } from '../store/auth';
import { Bell, Lock, User, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const user = useAuth((s) => s.user);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">ตั้งค่า</h1>
        <p className="mt-1 text-sm text-zinc-500">จัดการบัญชี ความปลอดภัย และการแจ้งเตือน</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <nav className="space-y-1">
          {[
            { id: 'profile', label: 'ข้อมูลส่วนตัว', icon: User },
            { id: 'security', label: 'ความปลอดภัย', icon: Lock },
            { id: 'notifications', label: 'การแจ้งเตือน', icon: Bell },
          ].map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-zinc-600 transition hover:border-zinc-200 hover:bg-white hover:text-zinc-900"
            >
              <Icon size={16} /> {label}
            </a>
          ))}
        </nav>

        <div className="space-y-6 lg:col-span-2">
          <section id="profile" className="card p-5">
            <h2 className="text-base font-semibold">ข้อมูลส่วนตัว</h2>
            <p className="mt-1 text-xs text-zinc-500">ข้อมูลที่จะแสดงในระบบ</p>
            <div className="mt-5 space-y-3">
              <div>
                <label className="label">ชื่อ-นามสกุล</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="label">อีเมล</label>
                <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button className="btn-primary" onClick={() => toast.success('บันทึกแล้ว')}>
                <Save size={14} /> บันทึก
              </button>
            </div>
          </section>

          <section id="security" className="card p-5">
            <h2 className="text-base font-semibold">เปลี่ยนรหัสผ่าน</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">รหัสผ่านปัจจุบัน</label>
                <input className="input" type="password" />
              </div>
              <div>
                <label className="label">รหัสผ่านใหม่</label>
                <input className="input" type="password" />
              </div>
              <div>
                <label className="label">ยืนยันรหัสผ่านใหม่</label>
                <input className="input" type="password" />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button className="btn-primary" onClick={() => toast.success('เปลี่ยนรหัสผ่านเรียบร้อย')}>
                <Save size={14} /> เปลี่ยนรหัสผ่าน
              </button>
            </div>
          </section>

          <section id="notifications" className="card p-5">
            <h2 className="text-base font-semibold">การแจ้งเตือน</h2>
            <div className="mt-4 space-y-3">
              {[
                'แจ้งเตือนเมื่อ broadcast ส่งเสร็จ',
                'แจ้งเตือนเมื่อ Token เพจหมดอายุ',
                'แจ้งเตือนเมื่อแพ็กเกจใกล้หมด',
                'รับข่าวสารและโปรโมชั่นจาก BroadCast',
              ].map((n, i) => (
                <label key={n} className="flex cursor-pointer items-center justify-between rounded-xl border border-zinc-200 px-3 py-2.5">
                  <span className="text-sm">{n}</span>
                  <input type="checkbox" defaultChecked={i < 3} className="h-4 w-4 rounded text-brand-600" />
                </label>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
