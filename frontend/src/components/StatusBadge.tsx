import type { BroadcastStatus } from '../types';
import clsx from 'clsx';
import { CheckCircle2, Clock, Loader2, AlertTriangle, FileEdit } from 'lucide-react';

const MAP: Record<BroadcastStatus, { label: string; cls: string; Icon: typeof Clock }> = {
  draft: { label: 'ฉบับร่าง', cls: 'bg-zinc-100 text-zinc-700', Icon: FileEdit },
  scheduled: { label: 'รอส่ง', cls: 'bg-amber-100 text-amber-700', Icon: Clock },
  sending: { label: 'กำลังส่ง', cls: 'bg-brand-100 text-brand-700', Icon: Loader2 },
  completed: { label: 'ส่งเสร็จ', cls: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle2 },
  failed: { label: 'ล้มเหลว', cls: 'bg-rose-100 text-rose-700', Icon: AlertTriangle },
};

export function StatusBadge({ status }: { status: BroadcastStatus }) {
  const { label, cls, Icon } = MAP[status];
  return (
    <span className={clsx('badge', cls)}>
      <Icon size={12} className={status === 'sending' ? 'animate-spin' : ''} />
      {label}
    </span>
  );
}
