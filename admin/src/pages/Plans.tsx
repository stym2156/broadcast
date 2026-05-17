import { useEffect, useState } from 'react';
import { adminApi } from '../api/mock';
import type { AdminPlan } from '../types';
import { Edit2, Users } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function Plans() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [editing, setEditing] = useState<AdminPlan | null>(null);

  useEffect(() => {
    adminApi.getPlans().then(setPlans);
  }, []);

  async function toggle(p: AdminPlan) {
    await adminApi.updatePlan(p.id, { isActive: !p.isActive });
    setPlans([...plans]);
    toast.success(`${!p.isActive ? 'เปิดใช้' : 'ปิด'}แพ็กเกจแล้ว`);
  }

  async function save() {
    if (!editing) return;
    await adminApi.updatePlan(editing.id, {
      price: editing.price,
      pricePerMonth: editing.pricePerMonth,
      savingsPercent: editing.savingsPercent,
    });
    setPlans([...plans]);
    setEditing(null);
    toast.success('บันทึกแพ็กเกจแล้ว');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">จัดการแพ็กเกจ</h1>
        <p className="mt-1 text-sm text-zinc-500">ตั้งราคาและสิทธิประโยชน์ของแต่ละแพ็กเกจ</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => (
          <div key={p.id} className="card flex flex-col p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold">{p.name}</h3>
                <div className="text-xs text-zinc-500">{p.months} เดือน</div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" checked={p.isActive} onChange={() => toggle(p)} />
                <div className="h-5 w-9 rounded-full bg-zinc-300 transition peer-checked:bg-accent-500 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-4" />
              </label>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-2xl font-extrabold">฿{p.pricePerMonth.toLocaleString()}</span>
              <span className="text-xs text-zinc-500">/เดือน</span>
            </div>
            <div className="text-xs text-zinc-500">รวม ฿{p.price.toLocaleString()}</div>
            {p.savingsPercent > 0 && (
              <div className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                ประหยัด {p.savingsPercent}%
              </div>
            )}
            <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs">
              <span className="flex items-center gap-1 text-zinc-500">
                <Users size={12} /> {p.subscribers} subscribers
              </span>
              <span className={clsx('badge', p.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600')}>
                {p.isActive ? 'เปิดขาย' : 'ปิด'}
              </span>
            </div>
            <button
              onClick={() => setEditing({ ...p })}
              className="btn-outline mt-3 w-full py-1.5 text-xs"
            >
              <Edit2 size={12} /> แก้ไขราคา
            </button>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-900/40 backdrop-blur-sm p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold">แก้ไขแพ็กเกจ {editing.name}</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">ราคารวม (บาท)</label>
                <input
                  type="number"
                  className="input"
                  value={editing.price}
                  onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">ราคา/เดือน (บาท)</label>
                <input
                  type="number"
                  className="input"
                  value={editing.pricePerMonth}
                  onChange={(e) => setEditing({ ...editing, pricePerMonth: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">ส่วนลด (%)</label>
                <input
                  type="number"
                  className="input"
                  value={editing.savingsPercent}
                  onChange={(e) => setEditing({ ...editing, savingsPercent: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setEditing(null)}>ยกเลิก</button>
              <button className="btn-primary" onClick={save}>บันทึก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
