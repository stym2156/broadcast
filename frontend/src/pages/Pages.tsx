import { useEffect, useMemo, useState } from 'react';
import { mockApi } from '../api/mock';
import type { Channel, FbPage } from '../types';
import { Facebook, Plus, Trash2, ExternalLink, AlertCircle, CheckCircle2, Phone, ExternalLink as LinkIcon } from 'lucide-react';
import { Modal } from '../components/Modal';
import { Empty } from '../components/Empty';
import { FEATURES } from '../lib/features';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const WhatsAppIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.5 14.4c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.7.1-.1.3-.4.5-.6.1-.2.2-.3.3-.6.1-.2 0-.4 0-.6-.1-.2-.7-1.7-.9-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.5 1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2.5C6.8 2.5 2.5 6.8 2.5 12c0 1.7.4 3.3 1.3 4.7L2.5 21.5l4.9-1.3c1.4.8 2.9 1.2 4.6 1.2 5.2 0 9.5-4.3 9.5-9.5S17.2 2.5 12 2.5z" />
  </svg>
);

type ChannelFilter = 'all' | Channel;

interface WaForm {
  name: string;
  fbPageId: string;
  accessToken: string;
  waBusinessAccountId: string;
  phoneNumber: string;
}

const EMPTY_WA: WaForm = { name: '', fbPageId: '', accessToken: '', waBusinessAccountId: '', phoneNumber: '' };

export default function PagesPage() {
  const [pages, setPages] = useState<FbPage[]>([]);
  const [filter, setFilter] = useState<ChannelFilter>('all');
  const [waOpen, setWaOpen] = useState(false);
  const [wa, setWa] = useState<WaForm>(EMPTY_WA);
  const [waSubmitting, setWaSubmitting] = useState(false);
  const [fbStarting, setFbStarting] = useState(false);

  useEffect(() => {
    mockApi.getPages().then((all) => {
      // When WhatsApp UI is disabled, never surface WA pages even if they exist in MongoDB.
      setPages(FEATURES.whatsapp ? all : all.filter((p) => p.channel === 'facebook'));
    });
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

  async function connectFacebook() {
    setFbStarting(true);
    try {
      const url = await mockApi.startFacebookOAuth();
      window.location.href = url; // Facebook will redirect to /auth/facebook/callback
    } catch (err) {
      toast.error((err as Error).message);
      setFbStarting(false);
    }
  }

  async function submitWa() {
    if (!wa.name.trim() || !wa.fbPageId.trim() || !wa.accessToken.trim()) {
      toast.error('กรุณากรอก ชื่อ, Phone Number ID, และ Access Token');
      return;
    }
    setWaSubmitting(true);
    try {
      const page = await mockApi.addPage({
        name: wa.name.trim(),
        channel: 'whatsapp',
        fbPageId: wa.fbPageId.trim(),
        accessToken: wa.accessToken.trim(),
        waBusinessAccountId: wa.waBusinessAccountId.trim() || undefined,
        phoneNumber: wa.phoneNumber.trim() || undefined,
      });
      setPages((s) => [page, ...s]);
      setWa(EMPTY_WA);
      setWaOpen(false);
      toast.success('เชื่อม WhatsApp Business สำเร็จ');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setWaSubmitting(false);
    }
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
          <h1 className="text-2xl font-bold text-zinc-900">
            {FEATURES.whatsapp ? 'ช่องทางทั้งหมด' : 'จัดการเพจ Facebook'}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {FEATURES.whatsapp
              ? 'เชื่อมเพจ Facebook ผ่าน OAuth และเบอร์ WhatsApp Business เพื่อรับ-ส่งข้อความใน Inbox เดียว'
              : 'เชื่อมเพจ Facebook ของคุณเพื่อเริ่มส่ง broadcast ได้ไม่จำกัดจำนวนเพจ'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={connectFacebook} disabled={fbStarting} className="btn-outline">
            <Facebook size={16} className="text-[#1877F2]" fill="#1877F2" />
            {fbStarting ? 'กำลังเปิด Facebook...' : 'เชื่อมเพจ Facebook'}
          </button>
          {FEATURES.whatsapp && (
            <button onClick={() => setWaOpen(true)} className="btn-primary bg-[#25D366] hover:bg-[#1ebe5d]">
              <WhatsAppIcon size={16} /> เพิ่ม WhatsApp
            </button>
          )}
        </div>
      </div>

      {FEATURES.whatsapp && (
        <div className="card flex flex-wrap gap-1.5 p-1">
          {[
            { value: 'all' as const, label: `ทั้งหมด (${pages.length})` },
            { value: 'facebook' as const, label: `Facebook (${counts.facebook})` },
            { value: 'whatsapp' as const, label: `WhatsApp (${counts.whatsapp})` },
          ].map((opt) => (
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
      )}

      {filtered.length === 0 ? (
        <Empty
          icon={Facebook}
          title="ยังไม่ได้เชื่อมเพจ"
          description="เริ่มต้นโดยเชื่อมเพจ Facebook ของคุณ"
          action={
            <button onClick={connectFacebook} className="btn-primary">
              <Plus size={14} /> เชื่อมเพจ Facebook
            </button>
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
                          <Phone size={10} /> {p.phoneNumber ?? `ID: ${p.fbPageId}`}
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
                    <button onClick={isWa ? () => setWaOpen(true) : connectFacebook} className="btn-primary flex-1 py-1.5 text-xs">
                      ต่ออายุ Token
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={waOpen}
        onClose={() => setWaOpen(false)}
        title="เชื่อม WhatsApp Business"
        width="max-w-xl"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setWaOpen(false)}>ยกเลิก</button>
            <button
              className="btn-primary bg-[#25D366] hover:bg-[#1ebe5d]"
              onClick={submitWa}
              disabled={waSubmitting}
            >
              {waSubmitting ? 'กำลังเชื่อม...' : 'เชื่อม'}
            </button>
          </>
        }
      >
        <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
          <strong>คัดข้อมูลจาก:</strong>{' '}
          <a
            href="https://developers.facebook.com/apps/"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-0.5 underline"
          >
            developers.facebook.com <LinkIcon size={10} />
          </a>{' '}
          → app ของคุณ → WhatsApp → API Setup
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">ชื่อบัญชี (สำหรับแสดงในระบบ) *</label>
            <input
              className="input"
              value={wa.name}
              onChange={(e) => setWa({ ...wa, name: e.target.value })}
              placeholder="เช่น ร้านของฉัน WA"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Phone Number ID *</label>
            <input
              className="input font-mono text-sm"
              value={wa.fbPageId}
              onChange={(e) => setWa({ ...wa, fbPageId: e.target.value })}
              placeholder="เช่น 1084134061453287"
            />
            <p className="mt-1 text-xs text-zinc-400">15-16 หลัก เห็นในส่วน "From" ของ API Setup</p>
          </div>
          <div>
            <label className="label">Access Token *</label>
            <textarea
              className="input font-mono text-xs leading-relaxed"
              rows={3}
              value={wa.accessToken}
              onChange={(e) => setWa({ ...wa, accessToken: e.target.value })}
              placeholder="EAAW..."
            />
            <p className="mt-1 text-xs text-zinc-400">
              Temporary token ใช้ได้ 24 ชม. — สำหรับ production ใช้ System User Permanent Token
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">WhatsApp Business Account ID</label>
              <input
                className="input font-mono text-sm"
                value={wa.waBusinessAccountId}
                onChange={(e) => setWa({ ...wa, waBusinessAccountId: e.target.value })}
                placeholder="เช่น 1955294095110334"
              />
            </div>
            <div>
              <label className="label">เบอร์โทรสำหรับแสดง</label>
              <input
                className="input"
                value={wa.phoneNumber}
                onChange={(e) => setWa({ ...wa, phoneNumber: e.target.value })}
                placeholder="+1 555 645 1551"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
