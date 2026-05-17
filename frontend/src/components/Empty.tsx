import type { LucideIcon } from 'lucide-react';

export function Empty({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card grid place-items-center gap-3 px-6 py-14 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-100 to-fuchsia-100 text-brand-600">
        <Icon size={28} />
      </div>
      <div>
        <div className="text-base font-semibold text-zinc-900">{title}</div>
        {description && <div className="mt-1 text-sm text-zinc-500">{description}</div>}
      </div>
      {action}
    </div>
  );
}
