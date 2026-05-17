import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Send, Facebook, Users, History, CreditCard, Settings, Inbox } from 'lucide-react';
import { Logo } from '../Logo';
import { FEATURES } from '../../lib/features';
import clsx from 'clsx';

const NAV = [
  { to: '/dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
  { to: '/inbox', label: 'กล่องข้อความ', icon: Inbox },
  { to: '/broadcast', label: 'ส่ง Broadcast', icon: Send },
  { to: '/history', label: 'ประวัติการส่ง', icon: History },
  { to: '/pages', label: FEATURES.whatsapp ? 'ช่องทาง / เพจ' : 'จัดการเพจ', icon: Facebook },
  { to: '/customers', label: 'ลูกค้า / Tag', icon: Users },
  { to: '/subscription', label: 'แพ็กเกจของฉัน', icon: CreditCard },
  { to: '/settings', label: 'ตั้งค่า', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-zinc-200/70 bg-white/80 backdrop-blur lg:flex">
      <div className="px-5 py-5">
        <Logo />
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'bg-gradient-to-r from-brand-600 to-fuchsia-600 text-white shadow-lift'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              )
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="m-3 rounded-2xl bg-gradient-to-br from-brand-600 to-fuchsia-600 p-4 text-white">
        <div className="text-xs font-medium opacity-90">ต้องการส่งมากขึ้น?</div>
        <div className="mt-1 text-sm font-semibold">อัปเกรดแพ็กเกจ 12 เดือน ประหยัด 21%</div>
        <NavLink
          to="/subscription"
          className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-white/15 px-3 py-2 text-xs font-medium backdrop-blur transition hover:bg-white/25"
        >
          ดูแพ็กเกจ →
        </NavLink>
      </div>
    </aside>
  );
}
