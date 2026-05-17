import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockApi } from '../api/mock';
import type { FbPage } from '../types';
import { Calendar, Image as ImageIcon, Send, Tag, Users, Eye, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ALL_TAGS = ['ลูกค้าเก่า', 'ลูกค้าใหม่', 'VIP', 'สนใจสินค้า A', 'สนใจสินค้า B'];

export default function BroadcastPage() {
  const nav = useNavigate();
  const [pages, setPages] = useState<FbPage[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [schedule, setSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [estimated, setEstimated] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    mockApi.getPages().then((p) => {
      setPages(p);
      setSelectedPages(p.filter((x) => x.status === 'connected').map((x) => x.id));
    });
  }, []);

  useEffect(() => {
    if (selectedPages.length === 0) {
      setEstimated(0);
      return;
    }
    mockApi.getCustomers().then((cs) => {
      const count = cs.filter(
        (c) => selectedPages.includes(c.pageId) && (selectedTags.length === 0 || c.tags.some((t) => selectedTags.includes(t)))
      ).length;
      setEstimated(count);
    });
  }, [selectedPages, selectedTags]);

  const togglePage = (id: string) =>
    setSelectedPages((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleTag = (t: string) =>
    setSelectedTags((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  const canSend = useMemo(
    () => title.trim() && message.trim() && selectedPages.length > 0 && (!schedule || scheduledAt),
    [title, message, selectedPages, schedule, scheduledAt]
  );

  async function send() {
    if (!canSend) return;
    setLoading(true);
    try {
      await mockApi.createBroadcast({
        title: title.trim(),
        message: message.trim(),
        pages: selectedPages,
        targetTags: selectedTags,
        scheduledAt: schedule ? new Date(scheduledAt).toISOString() : null,
      });
      toast.success(schedule ? 'ตั้งเวลาส่งเรียบร้อย' : 'เริ่มส่ง broadcast แล้ว');
      nav('/history');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">สร้าง Broadcast ใหม่</h1>
        <p className="mt-1 text-sm text-zinc-500">เขียนข้อความ เลือกเพจและกลุ่มเป้าหมาย แล้วส่งทันทีหรือตั้งเวลา</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Step 1: Message */}
          <section className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">1</div>
              <h3 className="text-sm font-semibold text-zinc-800">เขียนข้อความ</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">หัวข้อ (สำหรับอ้างอิงเท่านั้น)</label>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น โปรโมชั่นเดือนพฤษภาคม" />
              </div>
              <div>
                <label className="label">ข้อความที่จะส่ง</label>
                <textarea
                  className="input min-h-[160px]"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="สวัสดีค่ะ ทางร้านมีโปรพิเศษสำหรับลูกค้าเก่า..."
                  maxLength={1000}
                />
                <div className="mt-1 flex justify-between text-xs text-zinc-400">
                  <span>รองรับ Emoji 😊</span>
                  <span>{message.length}/1000</span>
                </div>
              </div>
              <button className="btn-outline w-full py-2">
                <ImageIcon size={16} /> แนบรูปภาพ (ตัวอย่าง)
              </button>
            </div>
          </section>

          {/* Step 2: Audience */}
          <section className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">2</div>
              <h3 className="text-sm font-semibold text-zinc-800">เลือกเพจและกลุ่มเป้าหมาย</h3>
            </div>
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-xs font-medium text-zinc-600">เพจที่จะส่ง</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {pages.map((p) => {
                    const active = selectedPages.includes(p.id);
                    const disabled = p.status !== 'connected';
                    return (
                      <label
                        key={p.id}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 transition ${
                          disabled
                            ? 'border-zinc-100 bg-zinc-50/50 opacity-60'
                            : active
                            ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20'
                            : 'border-zinc-200 hover:border-brand-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            disabled={disabled}
                            checked={active}
                            onChange={() => togglePage(p.id)}
                            className="h-4 w-4 rounded text-brand-600 focus:ring-brand-500"
                          />
                          <div>
                            <div className="text-sm font-medium text-zinc-800">{p.name}</div>
                            <div className="text-xs text-zinc-500">{p.subscribersCount.toLocaleString()} ผู้ติดตาม</div>
                          </div>
                        </div>
                        {disabled && <span className="badge bg-rose-100 text-rose-700">หมดอายุ</span>}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-zinc-600">
                  <Tag size={12} /> Tag กลุ่มเป้าหมาย (ไม่เลือก = ส่งทุกคน)
                </div>
                <div className="flex flex-wrap gap-2">
                  {ALL_TAGS.map((t) => {
                    const active = selectedTags.includes(t);
                    return (
                      <button
                        key={t}
                        onClick={() => toggleTag(t)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                          active
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-zinc-200 text-zinc-600 hover:border-brand-300'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Step 3: Schedule */}
          <section className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">3</div>
              <h3 className="text-sm font-semibold text-zinc-800">เวลาส่ง</h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition ${
                  !schedule ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20' : 'border-zinc-200'
                }`}
              >
                <input type="radio" checked={!schedule} onChange={() => setSchedule(false)} />
                <Send size={16} className="text-brand-600" />
                <div>
                  <div className="text-sm font-medium">ส่งทันที</div>
                  <div className="text-xs text-zinc-500">เริ่มส่งเลยตอนนี้</div>
                </div>
              </label>
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition ${
                  schedule ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20' : 'border-zinc-200'
                }`}
              >
                <input type="radio" checked={schedule} onChange={() => setSchedule(true)} />
                <Calendar size={16} className="text-brand-600" />
                <div>
                  <div className="text-sm font-medium">ตั้งเวลาส่ง</div>
                  <div className="text-xs text-zinc-500">เลือกวันและเวลา</div>
                </div>
              </label>
            </div>
            {schedule && (
              <div className="mt-3">
                <label className="label">วัน-เวลา</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            )}
          </section>
        </div>

        {/* Preview / Summary */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
          <div className="card overflow-hidden">
            <div className="border-b border-zinc-100 bg-zinc-50/50 px-4 py-2.5 text-xs font-medium text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <Eye size={12} /> ตัวอย่างข้อความ
              </span>
            </div>
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-fuchsia-500 text-xs font-bold text-white">
                  {pages.find((p) => selectedPages.includes(p.id))?.name?.[0] ?? 'P'}
                </div>
                <div className="flex-1">
                  <div className="text-xs text-zinc-500">
                    {pages.find((p) => selectedPages.includes(p.id))?.name ?? 'เลือกเพจ'}
                  </div>
                  <div className="mt-1 inline-block max-w-full rounded-2xl rounded-tl-sm bg-zinc-100 px-3 py-2 text-sm text-zinc-800">
                    {message || <span className="text-zinc-400">ข้อความจะแสดงที่นี่...</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">สรุปการส่ง</div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-zinc-500">เพจที่ส่ง</span><strong>{selectedPages.length} เพจ</strong></div>
              <div className="flex justify-between"><span className="text-zinc-500">Tag เป้าหมาย</span><strong>{selectedTags.length || 'ทั้งหมด'}</strong></div>
              <div className="flex justify-between"><span className="text-zinc-500">เวลาส่ง</span><strong>{schedule ? (scheduledAt ? new Date(scheduledAt).toLocaleString('th-TH') : 'ยังไม่ระบุ') : 'ทันที'}</strong></div>
              <div className="my-2 h-px bg-zinc-100" />
              <div className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2.5">
                <span className="flex items-center gap-1.5 text-xs text-brand-700"><Users size={14} /> ผู้รับโดยประมาณ</span>
                <strong className="text-lg text-brand-700">{estimated.toLocaleString()}</strong>
              </div>
            </div>
            <button onClick={send} disabled={!canSend || loading} className="btn-primary mt-4 w-full py-2.5 disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {schedule ? 'ตั้งเวลาส่ง' : 'ส่งทันที'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
