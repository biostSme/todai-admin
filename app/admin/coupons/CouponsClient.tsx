'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Save, X, Tag } from 'lucide-react'

type Coupon = {
  id: number; code: string; description: string; type: 'percent' | 'fixed'
  value: number; max_uses: number | null; used_count: number
  expires_at: string | null; active: boolean; created_at: string
}

function empty(): Omit<Coupon, 'id' | 'used_count' | 'created_at'> {
  return { code: '', description: '', type: 'percent', value: 0, max_uses: null, expires_at: null, active: true }
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

export default function CouponsClient({ coupons: initial }: { coupons: Coupon[] }) {
  const [coupons, setCoupons] = useState(initial)
  const [editing, setEditing] = useState<any | null>(null)
  const [isNew, setIsNew] = useState(false)
  const router = useRouter()

  function startNew() { setEditing(empty()); setIsNew(true) }
  function startEdit(c: Coupon) { setEditing({ ...c }); setIsNew(false) }
  function cancel() { setEditing(null); setIsNew(false) }

  async function save() {
    if (isNew) {
      const res = await fetch('/api/coupons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) })
      const row = await res.json()
      if (row.id) setCoupons(p => [row, ...p])
    } else {
      const res = await fetch(`/api/coupons/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) })
      const row = await res.json()
      setCoupons(p => p.map(c => c.id === row.id ? row : c))
    }
    setEditing(null); setIsNew(false); router.refresh()
  }

  async function del(id: number) {
    if (!confirm('ยืนยันการลบคูปองนี้?')) return
    await fetch(`/api/coupons/${id}`, { method: 'DELETE' })
    setCoupons(p => p.filter(c => c.id !== id))
  }

  async function toggle(c: Coupon) {
    const res = await fetch(`/api/coupons/${c.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...c, active: !c.active }) })
    const row = await res.json()
    setCoupons(p => p.map(x => x.id === row.id ? row : x))
  }

  const inp = (key: string, label: string, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type={type} placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
        value={editing?.[key] ?? ''} onChange={e => setEditing((p: any) => ({ ...p, [key]: type === 'number' ? +e.target.value : e.target.value }))} />
    </div>
  )

  return (
    <div>
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-gray-900">คูปองส่วนลด</h1>
          <p className="text-xs text-gray-400 mt-0.5">Early Bird / โปรโมชั่น G2G</p>
        </div>
        {!editing && (
          <button onClick={startNew} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: 'var(--orange)' }}>
            <Plus size={13} /> สร้างคูปองใหม่
          </button>
        )}
      </div>

      <div className="p-6 flex flex-col gap-4">
        {editing && (
          <div className="bg-white rounded-xl border border-orange-200 p-5 flex flex-col gap-4 max-w-xl">
            <h3 className="text-sm font-semibold text-gray-700">{isNew ? 'สร้างคูปองใหม่' : 'แก้ไขคูปอง'}</h3>
            <div className="grid grid-cols-2 gap-3">
              {inp('code', 'Code (ตัวพิมพ์ใหญ่อัตโนมัติ)', 'text', 'EARLYBIRD11')}
              {inp('description', 'คำอธิบาย', 'text', 'Early Bird รุ่นที่ 11')}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">ประเภทส่วนลด</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                  value={editing.type} onChange={e => setEditing((p: any) => ({ ...p, type: e.target.value }))}>
                  <option value="percent">% (เปอร์เซ็นต์)</option>
                  <option value="fixed">฿ (จำนวนเงิน)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{editing.type === 'percent' ? 'ลด (%)' : 'ลด (บาท)'}</label>
                <input type="number" min="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                  value={editing.value ?? 0} onChange={e => setEditing((p: any) => ({ ...p, value: +e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">ใช้ได้สูงสุด (ว่าง = ไม่จำกัด)</label>
                <input type="number" min="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                  value={editing.max_uses ?? ''} placeholder="ไม่จำกัด"
                  onChange={e => setEditing((p: any) => ({ ...p, max_uses: e.target.value ? +e.target.value : null }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">วันหมดอายุ (ว่าง = ไม่มีวันหมดอายุ)</label>
                <input type="datetime-local" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                  value={editing.expires_at ? editing.expires_at.slice(0, 16) : ''}
                  onChange={e => setEditing((p: any) => ({ ...p, expires_at: e.target.value || null }))} />
              </div>
              <div className="flex items-end pb-0.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editing.active !== false} onChange={e => setEditing((p: any) => ({ ...p, active: e.target.checked }))}
                    className="w-4 h-4 rounded accent-orange-500" />
                  <span className="text-sm text-gray-700">เปิดใช้งาน</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={save} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: 'var(--orange)' }}>
                <Save size={12} /> บันทึก
              </button>
              <button onClick={cancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-600 hover:bg-gray-50">
                <X size={12} /> ยกเลิก
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-xs">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Code</th>
              <th className="text-left px-4 py-2.5 text-gray-500 font-medium">คำอธิบาย</th>
              <th className="text-left px-4 py-2.5 text-gray-500 font-medium">ส่วนลด</th>
              <th className="text-left px-4 py-2.5 text-gray-500 font-medium">ใช้แล้ว / สูงสุด</th>
              <th className="text-left px-4 py-2.5 text-gray-500 font-medium">หมดอายุ</th>
              <th className="text-left px-4 py-2.5 text-gray-500 font-medium">สถานะ</th>
              <th className="px-4 py-2.5 w-16"></th>
            </tr></thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-1.5 font-mono font-semibold text-sm text-orange-600">
                      <Tag size={11} /> {c.code}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{c.description || '—'}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">
                    {c.type === 'percent' ? `${c.value}%` : `${Number(c.value).toLocaleString('th-TH')} ฿`}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {c.used_count} / {c.max_uses ?? '∞'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400">{fmtDate(c.expires_at)}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => toggle(c)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium cursor-pointer ${c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.active ? 'เปิดใช้' : 'ปิด'}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 flex gap-1">
                    <button onClick={() => startEdit(c)} className="p-1 rounded text-gray-400 hover:text-orange-500 hover:bg-orange-50"><Edit2 size={13} /></button>
                    <button onClick={() => del(c.id)} className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
              {!coupons.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">ยังไม่มีคูปอง</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
