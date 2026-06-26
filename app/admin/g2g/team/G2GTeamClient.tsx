'use client'
import { useState, useRef } from 'react'
import { Plus, Pencil, Trash2, X, Upload, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Member = {
  id: number
  name_th: string; name_en: string
  role_th: string; role_en: string
  bio_th: string; bio_en: string
  avatar_url: string; sort_order: number
}

const empty = (): Omit<Member, 'id'> => ({
  name_th: '', name_en: '', role_th: '', role_en: '',
  bio_th: '', bio_en: '', avatar_url: '', sort_order: 0,
})

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <div className="[&_input]:w-full [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_input]:border [&_input]:border-gray-200 [&_input]:rounded-lg [&_input]:focus:outline-none [&_input]:focus:border-orange-400 [&_textarea]:w-full [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:text-sm [&_textarea]:border [&_textarea]:border-gray-200 [&_textarea]:rounded-lg [&_textarea]:focus:outline-none [&_textarea]:focus:border-orange-400 [&_textarea]:resize-none">
        {children}
      </div>
    </div>
  )
}

export default function G2GTeamClient({ initial }: { initial: Member[] }) {
  const [members, setMembers] = useState(initial)
  const [form, setForm] = useState(empty())
  const [editId, setEditId] = useState<number | null>(null)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const avatarRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function openNew() { setForm(empty()); setEditId(null); setModal(true) }
  function openEdit(m: Member) { setForm({ ...m }); setEditId(m.id); setModal(true) }
  function close() { setModal(false); setEditId(null) }

  async function uploadAvatar(file: File) {
    setUploading(true)
    const fd = new FormData(); fd.append('file', file); fd.append('folder', 'g2g-team')
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const { url } = await res.json()
    setUploading(false)
    if (url) setForm(p => ({ ...p, avatar_url: url }))
  }

  async function save() {
    setSaving(true)
    if (editId) {
      const res = await fetch(`/api/g2g-team/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const row = await res.json()
      setMembers(p => p.map(m => m.id === editId ? row : m))
    } else {
      const res = await fetch('/api/g2g-team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, sort_order: members.length }) })
      const row = await res.json()
      setMembers(p => [...p, row])
    }
    setSaving(false); close(); router.refresh()
  }

  async function del(id: number) {
    if (!confirm('ลบสมาชิกนี้?')) return
    await fetch(`/api/g2g-team/${id}`, { method: 'DELETE' })
    setMembers(p => p.filter(m => m.id !== id)); router.refresh()
  }

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div>
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-gray-900">ทีมงาน BRANDi (G2G)</h1>
          <p className="text-xs text-gray-400 mt-0.5">จัดการสมาชิกทีมที่แสดงในหน้า G2G — THE PEOPLE</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: 'var(--orange)' }}>
          <Plus size={13} /> เพิ่มสมาชิก
        </button>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {members.map(m => (
            <div key={m.id} className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col items-center gap-2 relative">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                {m.avatar_url
                  ? <img src={m.avatar_url} alt={m.name_th} className="w-full h-full object-cover" />
                  : <span className="text-xl font-bold text-gray-400">{m.name_th?.charAt(0)}</span>}
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-800">{m.name_th}</div>
                {m.name_en && <div className="text-xs text-gray-400">{m.name_en}</div>}
                <div className="text-xs text-orange-500 mt-0.5">{m.role_en || m.role_th}</div>
              </div>
              <div className="flex gap-1.5 mt-1">
                <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500"><Pencil size={12} /></button>
                <button onClick={() => del(m.id)} className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
          {!members.length && (
            <div className="col-span-4 py-16 text-center text-gray-400 text-sm">ยังไม่มีสมาชิก — กด "เพิ่มสมาชิก" ได้เลย</div>
          )}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">{editId ? 'แก้ไขสมาชิก' : 'เพิ่มสมาชิกใหม่'}</h2>
              <button onClick={close}><X size={18} className="text-gray-400" /></button>
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                {form.avatar_url
                  ? <img src={form.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <span className="text-gray-300 text-2xl font-bold">{form.name_th?.charAt(0) || '?'}</span>}
              </div>
              <button onClick={() => avatarRef.current?.click()} disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                <Upload size={12} /> {uploading ? 'กำลังอัพโหลด…' : 'อัพโหลดรูปโปรไฟล์'}
              </button>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="ชื่อ (ภาษาไทย)"><input value={form.name_th} onChange={e => set('name_th', e.target.value)} placeholder="ณัฐวดี" /></Field>
              <Field label="ชื่อ (ภาษาอังกฤษ)"><input value={form.name_en} onChange={e => set('name_en', e.target.value)} placeholder="Nattavadee (Bee) Sirisukpoca" /></Field>
              <Field label="ตำแหน่ง (TH)"><input value={form.role_th} onChange={e => set('role_th', e.target.value)} placeholder="Principal Consultant" /></Field>
              <Field label="ตำแหน่ง (EN)"><input value={form.role_en} onChange={e => set('role_en', e.target.value)} placeholder="Principal Consultant" /></Field>
            </div>
            <Field label="ประวัติย่อ (TH)"><textarea rows={2} value={form.bio_th} onChange={e => set('bio_th', e.target.value)} placeholder="ที่ปรึกษาผู้เชี่ยวชาญ..." /></Field>
            <Field label="ประวัติย่อ (EN)"><textarea rows={2} value={form.bio_en} onChange={e => set('bio_en', e.target.value)} placeholder="Business strategy consultant..." /></Field>

            <button onClick={save} disabled={saving} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50" style={{ background: 'var(--orange)' }}>
              <Save size={14} /> {saving ? 'กำลังบันทึก…' : 'บันทึก'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
