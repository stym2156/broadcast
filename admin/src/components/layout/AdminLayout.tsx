import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Send, CreditCard, Package, LogOut, Bell } from 'lucide-react';
import { Logo } from '../Logo';
import { useAuth } from '../../store/auth';
import clsx from 'clsx';

const NAV = [
  { to: '/dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
  { to: '/users', label: 'ผู้ใช้งาน', icon: Users },
  { to: '/broadcasts', label: 'Broadcast ทั้งหมด', icon: Send },
  { to: '/subscriptions', label: 'การสมัครสมาชิก', icon: CreditCard },
  { to: '/plans', label: 'จัดการแพ็กเกจ', icon: Package },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <div className="flex min-h-screen">
      {/* Dark Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 flex-col bg-ink-900 text-zinc-300 lg:flex">
        <div className="px-5 py-5 border-b border-white/5">
          <Logo inverse />
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-accent-500 text-white shadow'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent-500 text-sm font-bold text-white">
              {user?.name?.[0] ?? 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">{user?.name}</div>
              <div className="truncate text-xs text-zinc-500">{user?.email}</div>
            </div>
            <button
              onClick={() => {
                logout();
                nav('/login');
              }}
              className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/5 hover:text-rose-400"
              title="ออกจากระบบ"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-zinc-200/70 bg-white/80 px-4 backdrop-blur lg:px-8">
          <h1 className="text-base font-semibold text-zinc-700">Admin Console</h1>
          <div className="ml-auto flex items-center gap-2">
            <button className="relative rounded-xl p-2 text-zinc-500 hover:bg-zinc-100">
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" />
            </button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
