'use client'
import { useState } from 'react'
import { Plus, Edit2, Trash2, Users, Calendar, MapPin, ChevronDown } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  draft: 'แบบร่าง', open: 'เปิดรับสมัคร', full: 'เต็มแล้ว', closed: 'ปิดแล้ว'
}
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  open: 'bg-green-100 text-green-700',
  full: 'bg-red-100 text-red-700',
  closed: 'bg-gray-200 text-gray-500',
}

type Session = {
  id: number; course_type: string; title: string; description: string
  start_date: string; end_date: string; location: string
  capacity: number; seats_remaining: number; price: string
  early_bird_price: string; early_bird_ends: string; status: string
  enrolled_count: string
}

const empty: Partial<Session> = {
  course_type: 'g2g', title: '', description: '', start_date: '', end_date: '',
  location: '', capacity: 30, price: '0', early_bird_price: '', early_bird_ends: '', status: 'draft'
}

export default function SessionsClient({ sessions: initial }: { sessions: Session[] }) {
  const [sessions, setSessions] = useState(initial)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<Partial<Session>>(empty)
  const [saving, setSaving] = useState(false)

  function openNew() { setForm(empty); setModal(true) }
  function openEdit(s: Session) { setForm(s); setModal(true) }

  async function save() {
    setSaving(true)
    const method = form.id ? 'PUT' : 'POST'
    const url = form.id ? `/api/sessions/${form.id}` : '/api/sessions'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (form.id) {
      setSessions(sessions.map(s => s.id === form.id ? { ...s, ...data } : s))
    } else {
      setSessions([{ ...data, enrolled_count: '0' }, ...sessions])
    }
    setSaving(false); setModal(false)
  }

  async function del(id: number) {
    if (!confirm('ลบ session นี้?')) return
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' })
    setSessions(sessions.filter(s => s.id !== id))
  }

  function fmt(d: string) {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Course Sessions</h1>
          <p className="text-sm text-gray-500 mt-0.5">จัดการรอบการอบรม</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white" style={{ background: 'var(--orange)' }}>
          <Plus size={15} /> สร้าง Session
        </button>
      </div>

      <div className="grid gap-3">
        {sessions.length === 0 && (
          <div className="text-center py-16 text-gray-400">ยังไม่มี session กด "สร้าง Session" เพื่อเริ่มต้น</div>
        )}
        {sessions.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status]}`}>
                  {STATUS_LABELS[s.status]}
                </span>
                <span className="text-[10px] text-gray-400 uppercase">{s.course_type}</span>
              </div>
              <div className="font-medium text-gray-900 truncate">{s.title}</div>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Calendar size={12} />{fmt(s.start_date)}{s.end_date && s.end_date !== s.start_date ? ` – ${fmt(s.end_date)}` : ''}</span>
                {s.location && <span className="flex items-center gap-1"><MapPin size={12} />{s.location}</span>}
                <span className="flex items-center gap-1"><Users size={12} />{s.enrolled_count}/{s.capacity} คน</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-semibold text-gray-900">฿{Number(s.price).toLocaleString()}</div>
              {s.early_bird_price && <div className="text-xs text-orange-500">Early ฿{Number(s.early_bird_price).toLocaleString()}</div>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => openEdit(s)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><Edit2 size={15} /></button>
              <button onClick={() => del(s.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b">
              <h2 className="font-semibold">{form.id ? 'แก้ไข Session' : 'สร้าง Session ใหม่'}</h2>
            </div>
            <div className="p-5 grid gap-3">
              <label className="block">
                <span className="text-xs text-gray-500">ประเภท</span>
                <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.course_type} onChange={e => setForm({ ...form, course_type: e.target.value })}>
                  <option value="g2g">GREAT to GROWTH</option>
                  <option value="todai">โตได้</option>
                  <option value="corp">คอร์สองค์กร</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">ชื่อ Session *</span>
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">รายละเอียด</span>
                <textarea className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-gray-500">วันเริ่ม</span>
                  <input type="date" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.start_date?.split('T')[0]} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">วันสิ้นสุด</span>
                  <input type="date" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.end_date?.split('T')[0]} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                </label>
              </div>
              <label className="block">
                <span className="text-xs text-gray-500">สถานที่</span>
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-gray-500">จำนวนที่นั่ง</span>
                  <input type="number" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">ราคา (บาท)</span>
                  <input type="number" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-gray-500">ราคา Early Bird</span>
                  <input type="number" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.early_bird_price} onChange={e => setForm({ ...form, early_bird_price: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">Early Bird หมด</span>
                  <input type="date" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.early_bird_ends?.split('T')[0]} onChange={e => setForm({ ...form, early_bird_ends: e.target.value })} />
                </label>
              </div>
              <label className="block">
                <span className="text-xs text-gray-500">สถานะ</span>
                <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="draft">แบบร่าง</option>
                  <option value="open">เปิดรับสมัคร</option>
                  <option value="full">เต็มแล้ว</option>
                  <option value="closed">ปิดแล้ว</option>
                </select>
              </label>
            </div>
            <div className="p-5 border-t flex justify-end gap-2">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50">ยกเลิก</button>
              <button onClick={save} disabled={saving || !form.title} className="px-4 py-2 text-sm rounded-lg text-white disabled:opacity-50" style={{ background: 'var(--orange)' }}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
