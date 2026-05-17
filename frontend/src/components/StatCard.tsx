import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  label: string;
  value: string | number;
  delta?: string;
  icon: LucideIcon;
  tone?: 'brand' | 'emerald' | 'amber' | 'rose';
}

const TONES: Record<NonNullable<Props['tone']>, string> = {
  brand: 'from-brand-500 to-fuchsia-500',
  emerald: 'from-emerald-500 to-teal-500',
  amber: 'from-amber-500 to-orange-500',
  rose: 'from-rose-500 to-pink-500',
};

export function StatCard({ label, value, delta, icon: Icon, tone = 'brand' }: Props) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</div>
          <div className="mt-1.5 text-2xl font-bold text-zinc-900">{value}</div>
          {delta && <div className="mt-1 text-xs font-medium text-emerald-600">{delta}</div>}
        </div>
        <div className={clsx('grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br text-white shadow-lift', TONES[tone])}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}
