import { Shield } from 'lucide-react';

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent-500 to-emerald-600 text-white shadow">
        <Shield size={18} strokeWidth={2.5} />
      </div>
      <div className={`text-lg font-extrabold tracking-tight ${inverse ? 'text-white' : 'text-zinc-900'}`}>
        Broad<span className="text-accent-500">Cast</span>
        <span className={`ml-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${inverse ? 'bg-white/15 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
          ADMIN
        </span>
      </div>
    </div>
  );
}
