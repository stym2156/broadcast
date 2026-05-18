import { useEffect, useMemo, useRef, useState } from 'react';
import { mockApi } from '../api/mock';
import { FEATURES } from '../lib/features';
import type { Channel, ChatMessage, Conversation, FbPage, QuickReply } from '../types';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Facebook,
  FileText,
  Filter,
  Image as ImageIcon,
  Inbox as InboxIcon,
  MessageCircle,
  MoreVertical,
  Paperclip,
  Phone,
  Search,
  Send,
  Smile,
  Tag as TagIcon,
  User,
  Zap,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const CHANNEL_META: Record<Channel, { label: string; bg: string; ring: string; iconBg: string }> = {
  facebook: {
    label: 'Facebook',
    bg: 'bg-[#1877F2]',
    ring: 'ring-[#1877F2]/30',
    iconBg: 'bg-[#1877F2]',
  },
  whatsapp: {
    label: 'WhatsApp',
    bg: 'bg-[#25D366]',
    ring: 'ring-[#25D366]/30',
    iconBg: 'bg-[#25D366]',
  },
};

const WhatsAppIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.5 14.4c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.7.1-.1.3-.4.5-.6.1-.2.2-.3.3-.6.1-.2 0-.4 0-.6-.1-.2-.7-1.7-.9-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.5 1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2.5C6.8 2.5 2.5 6.8 2.5 12c0 1.7.4 3.3 1.3 4.7L2.5 21.5l4.9-1.3c1.4.8 2.9 1.2 4.6 1.2 5.2 0 9.5-4.3 9.5-9.5S17.2 2.5 12 2.5z" />
  </svg>
);

function ChannelIcon({ channel, size = 9 }: { channel: Channel; size?: number }) {
  return channel === 'whatsapp' ? <WhatsAppIcon size={size} /> : <Facebook size={size} fill="white" />;
}

type StatusFilter = 'all' | Conversation['status'];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'open', label: 'เปิด' },
  { value: 'pending', label: 'รอตอบ' },
  { value: 'closed', label: 'ปิดแล้ว' },
];

const STATUS_BADGE: Record<Conversation['status'], { label: string; cls: string }> = {
  open: { label: 'เปิด', cls: 'bg-emerald-100 text-emerald-700' },
  pending: { label: 'รอตอบ', cls: 'bg-amber-100 text-amber-700' },
  closed: { label: 'ปิดแล้ว', cls: 'bg-zinc-100 text-zinc-600' },
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'เมื่อกี้';
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชม.ที่แล้ว`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} วันที่แล้ว`;
  return new Date(iso).toLocaleDateString('th-TH');
}

export default function Inbox() {
  const [pages, setPages] = useState<FbPage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [draft, setDraft] = useState('');
  const [showQuick, setShowQuick] = useState(false);

  const [channelFilter, setChannelFilter] = useState<'all' | Channel>('all');
  const [pageFilter, setPageFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [loadingThread, setLoadingThread] = useState(false);
  const [mobileShowThread, setMobileShowThread] = useState(false);

  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mockApi.getPages().then((all) =>
      setPages(FEATURES.whatsapp ? all : all.filter((p) => p.channel === 'facebook'))
    );
    mockApi.getQuickReplies().then(setQuickReplies);
  }, []);

  /**
   * Poll the conversation list every 5 seconds so new inbound messages from webhooks
   * appear without needing to refresh the page. Pauses when the tab is hidden so a
   * minimized window doesn't burn API quota all day.
   */
  useEffect(() => {
    const filter: { pageId?: string; channel?: Channel; status?: Conversation['status']; q?: string } = {};
    if (pageFilter) filter.pageId = pageFilter;
    const effectiveChannel: Channel | 'all' = FEATURES.whatsapp ? channelFilter : 'facebook';
    if (effectiveChannel !== 'all') filter.channel = effectiveChannel;
    if (statusFilter !== 'all') filter.status = statusFilter;
    if (search) filter.q = search;

    let cancelled = false;
    const fetchList = async () => {
      const list = await mockApi.getConversations(filter);
      if (cancelled) return;
      setConversations(list);
      // Auto-select the first conversation only on the very first load — subsequent polls
      // must not steal focus from whatever conversation the user is currently reading.
      setActiveId((current) => current ?? list[0]?.id ?? null);
    };

    fetchList();
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') fetchList();
    }, 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
    // activeId is intentionally NOT in the dep list — polling shouldn't restart every
    // time the user opens a different conversation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelFilter, pageFilter, statusFilter, search]);

  /** Poll the active conversation's messages every 5 seconds for the same reason. */
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    let firstLoad = true;
    const fetchMessages = async () => {
      if (firstLoad) setLoadingThread(true);
      const msgs = await mockApi.getMessages(activeId);
      if (cancelled) return;
      setMessages(msgs);
      if (firstLoad) {
        setLoadingThread(false);
        firstLoad = false;
      }
      setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, unreadCount: 0 } : c)));
    };

    fetchMessages();
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') fetchMessages();
    }, 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [activeId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const active = useMemo(() => conversations.find((c) => c.id === activeId) ?? null, [conversations, activeId]);
  const totalUnread = useMemo(() => conversations.reduce((s, c) => s + c.unreadCount, 0), [conversations]);

  async function handleSend() {
    if (!draft.trim() || !active) return;
    const text = draft.trim();
    setDraft('');
    const msg = await mockApi.sendMessage(active.id, text);
    setMessages((m) => [...m, msg]);
    setConversations((prev) =>
      prev.map((c) => (c.id === active.id ? { ...c, lastMessage: text, lastMessageAt: msg.sentAt } : c))
    );
  }

  async function setStatus(status: Conversation['status']) {
    if (!active) return;
    const updated = await mockApi.updateConversation(active.id, { status });
    setConversations((prev) => prev.map((c) => (c.id === active.id ? { ...c, status: updated.status } : c)));
    toast.success(status === 'closed' ? 'ปิดบทสนทนาแล้ว' : 'อัปเดตสถานะแล้ว');
  }

  function insertQuickReply(qr: QuickReply) {
    setDraft((d) => (d ? `${d} ${qr.text}` : qr.text));
    setShowQuick(false);
  }

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100vh-4rem)] lg:-mx-8 lg:-my-8">
      {/* Left: conversation list */}
      <section
        className={clsx(
          'flex w-full flex-col border-r border-zinc-200/70 bg-white lg:w-80 xl:w-96',
          mobileShowThread && 'hidden lg:flex'
        )}
      >
        <div className="border-b border-zinc-100 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <InboxIcon size={18} className="text-brand-600" />
              <h2 className="text-base font-semibold">กล่องข้อความ</h2>
              {totalUnread > 0 && (
                <span className="badge bg-rose-100 text-rose-700">{totalUnread} ยังไม่อ่าน</span>
              )}
            </div>
          </div>
          <div className="relative mt-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              className="input pl-9 py-2 text-sm"
              placeholder="ค้นหาลูกค้าหรือข้อความ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {/* Channel tabs (hidden when WhatsApp is disabled — only one channel remains). */}
          {FEATURES.whatsapp && (
            <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 p-1">
              {(['all', 'facebook', 'whatsapp'] as const).map((c) => {
                const active = channelFilter === c;
                return (
                  <button
                    key={c}
                    onClick={() => {
                      setChannelFilter(c);
                      setPageFilter('');
                    }}
                    className={clsx(
                      'flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition',
                      active ? 'bg-white text-zinc-900 shadow' : 'text-zinc-600 hover:text-zinc-900'
                    )}
                  >
                    {c === 'facebook' && <Facebook size={12} className="text-[#1877F2]" fill="#1877F2" />}
                    {c === 'whatsapp' && (
                      <span className="text-[#25D366]">
                        <WhatsAppIcon size={12} />
                      </span>
                    )}
                    {c === 'all' ? 'ทั้งหมด' : c === 'facebook' ? 'Facebook' : 'WhatsApp'}
                  </button>
                );
              })}
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <select
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs"
              value={pageFilter}
              onChange={(e) => setPageFilter(e.target.value)}
            >
              <option value="">
                {!FEATURES.whatsapp
                  ? 'ทุกเพจ'
                  : channelFilter === 'whatsapp'
                  ? 'ทุกเบอร์'
                  : channelFilter === 'facebook'
                  ? 'ทุกเพจ'
                  : 'ทุกช่องทาง'}
              </option>
              {pages
                .filter((p) => channelFilter === 'all' || p.channel === channelFilter)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
            <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-0.5">
              <Filter size={12} className="ml-1 text-zinc-400" />
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStatusFilter(s.value)}
                  className={clsx(
                    'rounded-md px-2 py-0.5 text-[11px] font-medium transition',
                    statusFilter === s.value ? 'bg-brand-600 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="grid h-full place-items-center px-6 text-center text-sm text-zinc-400">
              ไม่พบบทสนทนา
            </div>
          ) : (
            conversations.map((c) => {
              const isActive = c.id === activeId;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveId(c.id);
                    setMobileShowThread(true);
                  }}
                  className={clsx(
                    'flex w-full items-start gap-3 border-b border-zinc-100 px-4 py-3 text-left transition',
                    isActive ? 'bg-brand-50/60' : 'hover:bg-zinc-50'
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <div
                      className={clsx(
                        'grid h-11 w-11 place-items-center rounded-full text-sm font-bold text-white',
                        c.channel === 'whatsapp'
                          ? 'bg-gradient-to-br from-[#25D366] to-[#128C7E]'
                          : 'bg-gradient-to-br from-brand-500 to-fuchsia-500'
                      )}
                    >
                      {c.customerName[0]}
                    </div>
                    <div
                      className={clsx(
                        'absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full text-white ring-2 ring-white',
                        CHANNEL_META[c.channel].iconBg
                      )}
                    >
                      <ChannelIcon channel={c.channel} />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="truncate text-sm font-semibold text-zinc-900">{c.customerName}</div>
                      <div className="flex-shrink-0 text-[10px] text-zinc-400">{formatRelative(c.lastMessageAt)}</div>
                    </div>
                    <div className="truncate text-[11px] text-zinc-500">{c.pageName}</div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <div
                        className={clsx(
                          'flex-1 truncate text-xs',
                          c.unreadCount > 0 ? 'font-semibold text-zinc-800' : 'text-zinc-500'
                        )}
                      >
                        {c.lastMessage}
                      </div>
                      {c.unreadCount > 0 && (
                        <span className="grid h-4 min-w-[16px] flex-shrink-0 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                    {c.tags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {c.tags.map((t) => (
                          <span key={t} className="badge bg-brand-50 text-brand-700">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* Middle: message thread */}
      <section
        className={clsx(
          'flex min-w-0 flex-1 flex-col bg-zinc-50/40',
          !mobileShowThread && 'hidden lg:flex'
        )}
      >
        {!active ? (
          <div className="grid flex-1 place-items-center px-6 text-center">
            <div>
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-100 to-fuchsia-100 text-brand-600">
                <MessageCircle size={28} />
              </div>
              <div className="mt-3 text-base font-semibold text-zinc-800">เลือกบทสนทนา</div>
              <div className="mt-1 text-sm text-zinc-500">เลือกลูกค้าจากรายชื่อด้านซ้ายเพื่อเริ่มตอบ</div>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="flex items-center gap-3 border-b border-zinc-200/70 bg-white px-4 py-3">
              <button
                onClick={() => setMobileShowThread(false)}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 lg:hidden"
              >
                <ArrowLeft size={18} />
              </button>
              <div
                className={clsx(
                  'relative grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-white',
                  active.channel === 'whatsapp'
                    ? 'bg-gradient-to-br from-[#25D366] to-[#128C7E]'
                    : 'bg-gradient-to-br from-brand-500 to-fuchsia-500'
                )}
              >
                {active.customerName[0]}
                <div
                  className={clsx(
                    'absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full text-white ring-2 ring-white',
                    CHANNEL_META[active.channel].iconBg
                  )}
                >
                  <ChannelIcon channel={active.channel} />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="truncate font-semibold text-zinc-900">{active.customerName}</div>
                  <span className={clsx('badge', STATUS_BADGE[active.status].cls)}>
                    {STATUS_BADGE[active.status].label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <span className="truncate">
                    {active.channel === 'whatsapp' ? 'WhatsApp · ' : 'เพจ '}
                    {active.pageName}
                  </span>
                  {active.channel === 'whatsapp' && active.customerPhone && (
                    <>
                      <span className="text-zinc-300">·</span>
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Phone size={10} /> {active.customerPhone}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {active.status !== 'closed' ? (
                  <button onClick={() => setStatus('closed')} className="btn-outline py-1.5 text-xs">
                    <CheckCircle2 size={14} /> ปิดบทสนทนา
                  </button>
                ) : (
                  <button onClick={() => setStatus('open')} className="btn-outline py-1.5 text-xs">
                    เปิดอีกครั้ง
                  </button>
                )}
                <button className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100">
                  <MoreVertical size={16} />
                </button>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {loadingThread ? (
                <div className="grid h-full place-items-center text-sm text-zinc-400">กำลังโหลด...</div>
              ) : (
                messages.map((m) => {
                  const out = m.direction === 'outbound';
                  return (
                    <div key={m.id} className={clsx('flex gap-2', out ? 'justify-end' : 'justify-start')}>
                      {!out && (
                        <div
                          className={clsx(
                            'grid h-7 w-7 flex-shrink-0 place-items-center self-end rounded-full text-[10px] font-bold text-white',
                            active.channel === 'whatsapp'
                              ? 'bg-gradient-to-br from-[#25D366] to-[#128C7E]'
                              : 'bg-gradient-to-br from-brand-500 to-fuchsia-500'
                          )}
                        >
                          {active.customerName[0]}
                        </div>
                      )}
                      <div className="max-w-[70%]">
                        <div
                          className={clsx(
                            'rounded-2xl px-3.5 py-2 text-sm',
                            out
                              ? clsx(
                                  'rounded-br-sm text-white',
                                  active.channel === 'whatsapp'
                                    ? 'bg-gradient-to-br from-[#25D366] to-[#128C7E]'
                                    : 'bg-gradient-to-br from-brand-600 to-fuchsia-600'
                                )
                              : 'rounded-bl-sm bg-white text-zinc-800 shadow-soft'
                          )}
                        >
                          {m.text}
                        </div>
                        <div className={clsx('mt-1 px-1 text-[10px] text-zinc-400', out ? 'text-right' : 'text-left')}>
                          {new Date(m.sentAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={threadEndRef} />
            </div>

            {/* WhatsApp 24h window banner */}
            {active.channel === 'whatsapp' && active.waWindowExpiresAt && (() => {
              const expiresMs = new Date(active.waWindowExpiresAt).getTime();
              const remainingHrs = (expiresMs - Date.now()) / 3600_000;
              if (remainingHrs > 0) {
                return (
                  <div className="border-t border-emerald-100 bg-emerald-50 px-4 py-2 text-xs text-emerald-800">
                    <Clock size={12} className="mr-1 inline" />
                    หน้าต่างตอบกลับ 24 ชม. เปิดอยู่ — เหลือ <strong>{Math.floor(remainingHrs)} ชม.</strong> สำหรับส่งข้อความแบบอิสระ
                  </div>
                );
              }
              return (
                <div className="border-t border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-800">
                  <AlertTriangle size={12} className="mr-1 inline" />
                  เกินหน้าต่าง 24 ชม. — ต้องส่งเป็น <strong>Template message</strong> ที่ได้รับอนุมัติจาก Meta เท่านั้น
                  <button className="ml-2 inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 font-medium text-amber-700 hover:bg-amber-100">
                    <FileText size={10} /> เลือก template
                  </button>
                </div>
              );
            })()}

            {/* Composer */}
            <div className="relative border-t border-zinc-200/70 bg-white px-4 py-3">
              {showQuick && (
                <div className="absolute bottom-full left-4 right-4 mb-2 max-h-64 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-2 shadow-lift">
                  <div className="mb-1 px-2 py-1 text-xs font-semibold text-zinc-500">Quick replies</div>
                  {quickReplies.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => insertQuickReply(q)}
                      className="flex w-full flex-col rounded-lg px-3 py-2 text-left transition hover:bg-brand-50"
                    >
                      <span className="text-xs font-semibold text-brand-700">{q.title}</span>
                      <span className="mt-0.5 truncate text-xs text-zinc-500">{q.text}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <div className="flex items-center gap-1">
                  <button
                    title="Quick replies"
                    onClick={() => setShowQuick((s) => !s)}
                    className={clsx(
                      'rounded-lg p-2 transition',
                      showQuick ? 'bg-brand-50 text-brand-700' : 'text-zinc-400 hover:bg-zinc-100'
                    )}
                  >
                    <Zap size={18} />
                  </button>
                  <button className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100" title="แนบรูป">
                    <ImageIcon size={18} />
                  </button>
                  <button className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100" title="แนบไฟล์">
                    <Paperclip size={18} />
                  </button>
                  <button className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100" title="Emoji">
                    <Smile size={18} />
                  </button>
                </div>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="พิมพ์ข้อความ... (Enter เพื่อส่ง, Shift+Enter ขึ้นบรรทัดใหม่)"
                  rows={1}
                  className="input max-h-32 flex-1 resize-none py-2 text-sm"
                />
                <button
                  onClick={handleSend}
                  disabled={!draft.trim()}
                  className="btn-primary px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Right: customer panel */}
      {active && (
        <aside className="hidden w-72 flex-shrink-0 flex-col border-l border-zinc-200/70 bg-white xl:flex">
          <div className="border-b border-zinc-100 px-5 py-6 text-center">
            <div
              className={clsx(
                'relative mx-auto grid h-16 w-16 place-items-center rounded-full text-xl font-bold text-white',
                active.channel === 'whatsapp'
                  ? 'bg-gradient-to-br from-[#25D366] to-[#128C7E]'
                  : 'bg-gradient-to-br from-brand-500 to-fuchsia-500'
              )}
            >
              {active.customerName[0]}
              <div
                className={clsx(
                  'absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full text-white ring-2 ring-white',
                  CHANNEL_META[active.channel].iconBg
                )}
              >
                <ChannelIcon channel={active.channel} size={11} />
              </div>
            </div>
            <div className="mt-3 font-semibold text-zinc-900">{active.customerName}</div>
            <div className="text-xs text-zinc-500">
              {active.channel === 'whatsapp' ? 'WhatsApp · ' : 'เพจ '}
              {active.pageName}
            </div>
            {active.channel === 'whatsapp' && active.customerPhone && (
              <div className="mt-1 inline-flex items-center gap-1 text-xs font-mono text-zinc-600">
                <Phone size={10} /> {active.customerPhone}
              </div>
            )}
            <div className="mt-3 flex items-center justify-center gap-2">
              <button className="btn-outline py-1 text-xs">
                <User size={12} /> ดูโปรไฟล์
              </button>
            </div>
          </div>

          <div className="space-y-5 px-5 py-4 overflow-y-auto flex-1">
            <div>
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Tags</div>
                <button className="text-xs font-medium text-brand-600 hover:underline">+ เพิ่ม</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {active.tags.length === 0 ? (
                  <span className="text-xs text-zinc-400">ยังไม่มี tag</span>
                ) : (
                  active.tags.map((t) => (
                    <span key={t} className="badge bg-brand-50 text-brand-700">
                      <TagIcon size={10} /> {t}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">ข้อมูลลูกค้า</div>
              <dl className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">ช่องทาง</dt>
                  <dd className="inline-flex items-center gap-1 text-zinc-700">
                    <span className={clsx('grid h-4 w-4 place-items-center rounded text-white', CHANNEL_META[active.channel].iconBg)}>
                      <ChannelIcon channel={active.channel} size={9} />
                    </span>
                    {CHANNEL_META[active.channel].label}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">{active.channel === 'whatsapp' ? 'WhatsApp ID' : 'PSID'}</dt>
                  <dd className="font-mono text-xs text-zinc-700">{active.customerPhone ?? active.customerId}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">ทักครั้งแรก</dt>
                  <dd className="text-zinc-700">{new Date(active.lastMessageAt).toLocaleDateString('th-TH')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">ผู้รับผิดชอบ</dt>
                  <dd className="text-zinc-700">{active.assignedTo ?? 'ยังไม่ระบุ'}</dd>
                </div>
              </dl>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">ประวัติการสั่งซื้อ</div>
              <div className="mt-2 rounded-xl border border-dashed border-zinc-200 px-3 py-4 text-center text-xs text-zinc-400">
                ยังไม่มีออเดอร์ (Phase 2)
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
