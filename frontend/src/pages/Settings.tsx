import { useEffect, useState } from 'react';
import { useAuth } from '../store/auth';
import { mockApi } from '../api/mock';
import { Bell, Lock, User, Save, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

/** Notification preferences live in localStorage for now — there's no real notification
 * delivery system yet, so persisting server-side would just be cosmetic. When email/push
 * delivery lands, migrate this to a `notificationPrefs` sub-doc on the User model. */
const NOTIF_KEY = 'bc_notif_prefs';
const NOTIF_LABELS = [
  'แจ้งเตือนเมื่อ broadcast ส่งเสร็จ',
  'แจ้งเตือนเมื่อ Token เพจหมดอายุ',
  'แจ้งเตือนเมื่อแพ็กเกจใกล้หมด',
  'รับข่าวสารและโปรโมชั่นจาก BroadCast',
] as const;
const NOTIF_DEFAULT = [true, true, true, false];

function readPrefs(): boolean[] {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (!raw) return NOTIF_DEFAULT;
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.length === NOTIF_LABELS.length) return parsed as boolean[];
  } catch {
    /* fall through to default */
  }
  return NOTIF_DEFAULT;
}

function extractError(err: unknown): string {
  return (
    (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
    (err as Error).message ??
    'เกิดข้อผิดพลาด'
  );
}

export default function Settings() {
  const { user, setUser } = useAuth();

  // Profile
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Notifications (localStorage-backed)
  const [prefs, setPrefs] = useState<boolean[]>(readPrefs);
  useEffect(() => {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const profileChanged = name !== (user?.name ?? '') || email !== (user?.email ?? '');
  const profileEmailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function saveProfile() {
    if (!profileChanged) return;
    if (!name.trim()) return toast.error('กรอกชื่อก่อน');
    if (!profileEmailLooksValid) return toast.error('รูปแบบอีเมลไม่ถูกต้อง');
    setSavingProfile(true);
    try {
      const updated = await mockApi.updateProfile({
        name: name.trim(),
        email: email.trim().toLowerCase(),
      });
      setUser({
        id: String(updated.id),
        email: updated.email,
        name: updated.name,
        avatar: updated.avatar ?? null,
        role: updated.role,
      });
      toast.success('บันทึกข้อมูลส่วนตัวแล้ว');
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSavingProfile(false);
    }
  }

  const passwordReady =
    currentPassword.length > 0 &&
    newPassword.length >= 6 &&
    confirmPassword.length >= 6 &&
    newPassword === confirmPassword;

  async function savePassword() {
    if (!passwordReady) {
      if (newPassword.length < 6) return toast.error('รหัสผ่านใหม่ต้องอย่างน้อย 6 ตัว');
      if (newPassword !== confirmPassword) return toast.error('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');
      return;
    }
    setChangingPassword(true);
    try {
      await mockApi.changePassword(currentPassword, newPassword);
      toast.success('เปลี่ยนรหัสผ่านเรียบร้อย');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">ตั้งค่า</h1>
        <p className="mt-1 text-sm text-zinc-500">จัดการบัญชี ความปลอดภัย และการแจ้งเตือน</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <nav className="space-y-1">
          {[
            { id: 'profile', label: 'ข้อมูลส่วนตัว', icon: User },
            { id: 'security', label: 'ความปลอดภัย', icon: Lock },
            { id: 'notifications', label: 'การแจ้งเตือน', icon: Bell },
          ].map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-zinc-600 transition hover:border-zinc-200 hover:bg-white hover:text-zinc-900"
            >
              <Icon size={16} /> {label}
            </a>
          ))}
        </nav>

        <div className="space-y-6 lg:col-span-2">
          {/* Profile */}
          <section id="profile" className="card p-5">
            <h2 className="text-base font-semibold">ข้อมูลส่วนตัว</h2>
            <p className="mt-1 text-xs text-zinc-500">ข้อมูลที่จะแสดงในระบบ</p>
            <div className="mt-5 space-y-3">
              <div>
                <label className="label">ชื่อ-นามสกุล</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="label">อีเมล</label>
                <input
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                />
                {email && !profileEmailLooksValid && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-rose-600">
                    <AlertCircle size={12} /> รูปแบบอีเมลไม่ถูกต้อง
                  </p>
                )}
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={saveProfile}
                disabled={!profileChanged || savingProfile}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {profileChanged ? 'บันทึก' : 'บันทึกแล้ว'}
              </button>
            </div>
          </section>

          {/* Security */}
          <section id="security" className="card p-5">
            <h2 className="text-base font-semibold">เปลี่ยนรหัสผ่าน</h2>
            <p className="mt-1 text-xs text-zinc-500">ใช้รหัสผ่านปัจจุบันยืนยันก่อนเปลี่ยน</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">รหัสผ่านปัจจุบัน</label>
                <input
                  className="input"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="label">รหัสผ่านใหม่</label>
                <input
                  className="input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <p className="mt-1 text-xs text-zinc-400">อย่างน้อย 6 ตัวอักษร</p>
              </div>
              <div>
                <label className="label">ยืนยันรหัสผ่านใหม่</label>
                <input
                  className="input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
                {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-rose-600">
                    <AlertCircle size={12} /> ไม่ตรงกัน
                  </p>
                )}
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={savePassword}
                disabled={!passwordReady || changingPassword}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {changingPassword ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                เปลี่ยนรหัสผ่าน
              </button>
            </div>
          </section>

          {/* Notifications */}
          <section id="notifications" className="card p-5">
            <h2 className="text-base font-semibold">การแจ้งเตือน</h2>
            <p className="mt-1 text-xs text-zinc-500">
              บันทึกใน browser ของคุณ (ยังไม่มีระบบ email/push notification จริง)
            </p>
            <div className="mt-4 space-y-3">
              {NOTIF_LABELS.map((label, i) => (
                <label
                  key={label}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-zinc-200 px-3 py-2.5"
                >
                  <span className="text-sm">{label}</span>
                  <input
                    type="checkbox"
                    checked={prefs[i]}
                    onChange={(e) =>
                      setPrefs((p) => p.map((v, idx) => (idx === i ? e.target.checked : v)))
                    }
                    className="h-4 w-4 rounded text-brand-600"
                  />
                </label>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
