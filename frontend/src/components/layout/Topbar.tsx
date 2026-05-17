import { Bell, LogOut, Menu, Search } from 'lucide-react';
import { useAuth } from '../../store/auth';
import { useNavigate } from 'react-router-dom';

export function Topbar({ onMenu }: { onMenu?: () => void }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-zinc-200/70 bg-white/70 px-4 backdrop-blur lg:px-8">
      <button onClick={onMenu} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 lg:hidden">
        <Menu size={20} />
      </button>
      <div className="relative hidden flex-1 max-w-md md:block">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
          placeholder="ค้นหาลูกค้า, broadcast, เพจ..."
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button className="relative rounded-xl p-2 text-zinc-500 hover:bg-zinc-100">
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" />
        </button>
        <div className="flex items-center gap-3 rounded-xl border border-zinc-200/70 bg-white pl-1 pr-2 py-1">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-fuchsia-500 text-xs font-bold text-white">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="hidden text-xs leading-tight md:block">
            <div className="font-semibold text-zinc-800">{user?.name}</div>
            <div className="text-zinc-500">{user?.email}</div>
          </div>
          <button
            onClick={() => {
              logout();
              nav('/login');
            }}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600"
            title="ออกจากระบบ"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
