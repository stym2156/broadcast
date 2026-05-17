import { Zap } from 'lucide-react';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const text = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-lg';
  const icon = size === 'lg' ? 28 : size === 'sm' ? 16 : 20;
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-fuchsia-500 text-white shadow-lift">
        <Zap size={icon} strokeWidth={2.5} fill="white" />
      </div>
      <div className={`${text} font-extrabold tracking-tight`}>
        Broad<span className="text-brand-600">Cast</span>
      </div>
    </div>
  );
}
