import { useEffect, useMemo, useState } from 'react';
import { mockApi } from '../api/mock';
import type { Channel, FbPage } from '../types';
import { Facebook, Plus, Trash2, ExternalLink, AlertCircle, CheckCircle2, Phone } from 'lucide-react';
import { Modal } from '../components/Modal';
import { Empty } from '../components/Empty';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const WhatsAppIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.5 14.4c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.7.1-.1.3-.4.5-.6.1-.2.2-.3.3-.6.1-.2 0-.4 0-.6-.1-.2-.7-1.7-.9-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.5 1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2.5C6.8 2.5 2.5 6.8 2.5 12c0 1.7.4 3.3 1.3 4.7L2.5 21.5l4.9-1.3c1.4.8 2.9 1.2 4.6 1.2 5.2 0 9.5-4.3 9.5-9.5S17.2 2.5 12 2.5z" />
  </svg>
);

type ChannelFilter = 'all' | Channel;

export default function PagesPage() {
  const [pages, setPages] = useState<FbPage[]>([]);
  const [filter, setFilter] = useState<ChannelFilter>('all');
  const [open, setOpen] = useState<Channel | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    mockApi.getPages().then(setPages);
  }, []);

  const filtered = useMemo(
    () => pages.filter((p) => filter === 'all' || p.channel === filter),
    [pages, filter]
  );

  const counts = useMemo(
    () => ({
      facebook: pages.filter((p) => p.channel === 'facebook').length,
      whatsapp: pages.filter((p) => p.channel === 'whatsapp').length,
    }),
    [pages]
  );

  async function add() {
    if (!open || !name.trim()) return;
    const p = await mockApi.addPage({
      name: name.trim(),
      channel: open,
      phoneNumber: open === 'whatsapp' ? phone.trim() || undefined : undefined,
    });
    setPages((s) => [p, ...s]);
    setName('');
    setPhone('');
    setOpen(null);
    toast.success(open === 'whatsapp' ? 'เชื่อมเบอร์ WhatsApp Business สำเร็จ' : 'เชื่อมเพจ Facebook สำเร็จ');
  }

  async function remove(id: string) {
    if (!confirm('ยืนยันการลบช่องทางนี้?')) return;
    await mockApi.removePage(id);
    setPages((s) => s.filter((p) => p.id !== id));
    toast.success('ลบแล้ว');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">ช่องทางทั้งหมด</h1>
          <p className="mt-1 text-sm text-zinc-500">เชื่อมเพจ Facebook และเบอร์ WhatsApp Business เพื่อรับ-ส่งข้อความใน Inbox เดียว</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setOpen('facebook')} className="btn-outline">
            <Facebook size={16} className="text-[#1877F2]" fill="#1877F2" /> เพิ่มเพจ Facebook
          </button>
          <button onClick={() => setOpen('whatsapp')} className="btn-primary bg-[#25D366] hover:bg-[#1ebe5d]">
            <WhatsAppIcon size={16} /> เพิ่ม WhatsApp
          </button>
        </div>
      </div>

      <div className="card flex flex-wrap gap-1.5 p-1">
        {(
          [
            { value: 'all' as const, label: `ทั้งหมด (${pages.length})` },
            { value: 'facebook' as const, label: `Facebook (${counts.facebook})` },
            { value: 'whatsapp' as const, label: `WhatsApp (${counts.whatsapp})` },
          ]
        ).map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={clsx(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition',
              filter === opt.value ? 'bg-brand-600 text-white' : 'text-zinc-600 hover:bg-zinc-100'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Empty
          icon={Facebook}
          title="ยังไม่ได้เชื่อมช่องทาง"
          description="เริ่มต้นโดยเชื่อมเพจ Facebook หรือเบอร์ WhatsApp Business"
          action={
            <div className="flex gap-2">
              <button onClick={() => setOpen('facebook')} className="btn-outline">
                <Plus size={14} /> Facebook
              </button>
              <button onClick={() => setOpen('whatsapp')} className="btn-primary bg-[#25D366] hover:bg-[#1ebe5d]">
                <Plus size={14} /> WhatsApp
              </button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const isWa = p.channel === 'whatsapp';
            return (
              <div key={p.id} className="card group p-5 transition hover:shadow-lift">
                <div className="flex items-start gap-3">
                  <div
                    className={clsx(
                      'grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl text-white',
                      isWa ? 'bg-[#25D366]' : 'bg-[#1877F2]'
                    )}
                  >
                    {isWa ? <WhatsAppIcon /> : <Facebook size={22} fill="white" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-zinc-900">{p.name}</h3>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {isWa ? (
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Phone size={10} /> {p.phoneNumber ?? '-'}
                        </span>
                      ) : (
                        `Page ID: ${p.fbPageId}`
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(p.id)}
                    className="rounded-lg p-1.5 text-zinc-300 opacity-0 transition group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600"
                    aria-label="ลบ"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">{isWa ? 'รายชื่อในสมุด' : 'ผู้ติดตาม'}</span>
                    <strong className="text-zinc-800">{p.subscribersCount.toLocaleString()}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">สถานะ</span>
                    {p.status === 'connected' ? (
                      <span className="badge bg-emerald-100 text-emerald-700">
                        <CheckCircle2 size={12} /> เชื่อมแล้ว
                      </span>
                    ) : (
                      <span className="badge bg-rose-100 text-rose-700">
                        <AlertCircle size={12} /> Token หมดอายุ
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex gap-2 border-t border-zinc-100 pt-3">
                  <button className="btn-outline flex-1 py-1.5 text-xs">
                    <ExternalLink size={12} /> {isWa ? 'เปิด WhatsApp Manager' : 'เปิดเพจ'}
                  </button>
                  {p.status !== 'connected' && (
                    <button className="btn-primary flex-1 py-1.5 text-xs">ต่ออายุ Token</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open === 'whatsapp' ? 'เชื่อม WhatsApp Business' : 'เชื่อมเพจ Facebook'}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpen(null)}>ยกเลิก</button>
            <button
              className={clsx('btn-primary', open === 'whatsapp' && 'bg-[#25D366] hover:bg-[#1ebe5d]')}
              onClick={add}
            >
              เชื่อม
            </button>
          </>
        }
      >
        <p className="mb-4 text-sm text-zinc-500">
          {open === 'whatsapp'
            ? 'ในระบบจริง จะให้คุณ login ด้วย Meta Business และเลือก WhatsApp Business Phone Number ที่ได้รับอนุมัติ สำหรับ demo ให้กรอกข้อมูล:'
            : 'ในระบบจริง จะให้คุณ login ด้วย Facebook แล้วเลือกเพจที่ต้องการเชื่อม สำหรับ demo ให้กรอกชื่อเพจ:'}
        </p>
        <div className="space-y-3">
          <div>
            <label className="label">{open === 'whatsapp' ? 'ชื่อบัญชี WhatsApp Business' : 'ชื่อเพจ'}</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={open === 'whatsapp' ? 'เช่น ร้านของฉัน WA' : 'เช่น ร้านของฉัน'}
              autoFocus
            />
          </div>
          {open === 'whatsapp' && (
            <div>
              <label className="label">เบอร์โทรศัพท์ (รูปแบบ +66...)</label>
              <input
                className="input font-mono"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+66 2 555 0000"
              />
              <p className="mt-1 text-xs text-zinc-400">
                เบอร์ต้องผ่านการอนุมัติจาก Meta Business Manager และผูกกับ WhatsApp Business API แล้ว
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
