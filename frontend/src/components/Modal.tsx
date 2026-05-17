import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-900/40 backdrop-blur-sm p-4">
      <div className={`w-full ${width} rounded-2xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-zinc-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
