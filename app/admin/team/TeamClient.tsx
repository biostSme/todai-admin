'use client'
import { useState, useRef } from 'react'
import { Plus, Pencil, Trash2, X, Upload, ImageOff, ArrowUp, ArrowDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Member = {
  id: string
  name_th: string
  name_en?: string
  role_th?: string
  role_en?: string
  bio_th?: string
  bio_en?: string
  avatar_url?: string
  sort_order: number
}

const emptyForm = {
  name_th: '', name_en: '',
  role_th: '', role_en: '',
  bio_th: '', bio_en: '',
  avatar_url: '',
  sort_order: 0,
}

function F({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <div className="[&_input]:w-full [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_input]:border [&_input]:border-gray-200 [&_input]:rounded-lg [&_input]:focus:outline-none [&_input]:focus:border-orange-400
                      [&_textarea]:w-full [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:text-sm [&_textarea]:border [&_textarea]:border-gray-200 [&_textarea]:rounded-lg [&_textarea]:focus:outline-none [&_textarea]:focus:border-orange-400 [&_textarea]:resize-none">
        {children}
      </div>
    </div>
  )
}

export default function TeamClient({ team: initial }: { team: Member[] }) {
  const [team, setTeam] = useState(initial)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const avatarRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function openNew() {
    setForm({ ...emptyForm, sort_order: team.length })
    setEditing(null)
    setModal(true)
  }

  function openEdit(m: Member) {
    setForm({ ...emptyForm, ...m })
    setEditing(m.id)
    setModal(true)
  }

  async function uploadAvatar(file: File): Promise<string | null> {
    if (!file.type.startsWith('image/')) { alert('กรุณาเลือกไฟล์รูปภาพ'); return null }
    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `team/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true })
    setUploading(false)
    if (error) { alert('อัปโหลดไม่สำเร็จ: ' + error.message); return null }
    return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
  }

  async function save() {
    if (!form.name_th) { alert('กรุณาใส่ชื่อ'); return }
    setSaving(true)
    const supabase = createClient()
    if (editing) {
      await supabase.from('team').update(form).eq('id', editing)
    } else {
      await supabase.from('team').insert(form)
    }
    setSaving(false)
    setModal(false)
    router.refresh()
  }

  async function deleteMember(id: string) {
    if (!confirm('ยืนยันการลบสมาชิกนี้?')) return
    await createClient().from('team').delete().eq('id', id)
    setTeam(t => t.filter(m => m.id !== id))
  }

  async function moveOrder(id: string, dir: 'up' | 'down') {
    const idx = team.findIndex(m => m.id === id)
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === team.length - 1) return
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    const newTeam = [...team]
    ;[newTeam[idx], newTeam[swapIdx]] = [newTeam[swapIdx], newTeam[idx]]
    const supabase = createClient()
    await Promise.all([
      supabase.from('team').update({ sort_order: swapIdx }).eq('id', newTeam[swapIdx].id),
      supabase.from('team').update({ sort_order: idx }).eq('id', newTeam[idx].id),
    ])
    setTeam(newTeam.map((m, i) => ({ ...m, sort_order: i })))
  }

  return (
    <div>
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-gray-900">ทีมงานที่ปรึกษา</h1>
          <p className="text-xs text-gray-400 mt-0.5">{team.length} คน</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: 'var(--orange)' }}>
          <Plus size={13} /> เพิ่มสมาชิก
        </button>
      </div>

      <div className="p-6 flex flex-col gap-3">
        {team.map((m, idx) => (
          <div key={m.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <button onClick={() => moveOrder(m.id, 'up')} disabled={idx === 0} className="p-1 rounded border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-30"><ArrowUp size={11} /></button>
              <button onClick={() => moveOrder(m.id, 'down')} disabled={idx === team.length - 1} className="p-1 rounded border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-30"><ArrowDown size={11} /></button>
            </div>
            <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden bg-gray-100">
              {m.avatar_url
                ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><ImageOff size={16} className="text-gray-300" /></div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-800">{m.name_th}</div>
              <div className="text-xs text-gray-400 mt-0.5">{m.role_th || '—'}</div>
              {m.name_en && <div className="text-xs text-gray-400">{m.name_en} · {m.role_en}</div>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"><Pencil size={13} /></button>
              <button onClick={() => deleteMember(m.id)} className="p-1.5 rounded-lg border border-gray-200 text-red-400 hover:bg-red-50"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
        {!team.length && <div className="text-center py-16 text-gray-400 text-sm">ยังไม่มีสมาชิกทีม</div>}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 overflow-y-auto py-6">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="font-semibold text-gray-900">{editing ? 'แก้ไขสมาชิก' : 'เพิ่มสมาชิกใหม่'}</h2>
              <button onClick={() => setModal(false)}><X size={16} className="text-gray-400" /></button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              {/* Avatar upload */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-gray-500">รูปโปรไฟล์</label>
                <div className="flex items-center gap-4">
                  <div
                    className="w-20 h-20 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-orange-300 transition-colors overflow-hidden flex-shrink-0"
                    onClick={() => avatarRef.current?.click()}
                  >
                    {form.avatar_url
                      ? <img src={form.avatar_url} alt="" className="w-full h-full object-cover" />
                      : uploading
                        ? <span className="text-[10px] text-gray-400">กำลังโหลด...</span>
                        : <Upload size={20} className="text-gray-300" />
                    }
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button onClick={() => avatarRef.current?.click()} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                      {uploading ? 'กำลังอัปโหลด...' : 'เลือกรูป'}
                    </button>
                    {form.avatar_url && (
                      <button onClick={() => setForm(p => ({ ...p, avatar_url: '' }))} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-red-50 text-red-400">
                        ลบรูป
                      </button>
                    )}
                    <span className="text-[10px] text-gray-400">JPG, PNG · แนะนำ 400×400px</span>
                  </div>
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden"
                    onChange={async e => {
                      const f = e.target.files?.[0]
                      if (f) { const url = await uploadAvatar(f); if (url) setForm(p => ({ ...p, avatar_url: url })) }
                    }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <F label="ชื่อ (ไทย)">
                  <input value={form.name_th} onChange={e => setForm(p => ({ ...p, name_th: e.target.value }))} placeholder="สมชาย ใจดี" />
                </F>
                <F label="ชื่อ (อังกฤษ)">
                  <input value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} placeholder="Somchai Jaidee" />
                </F>
                <F label="ตำแหน่ง (ไทย)">
                  <input value={form.role_th} onChange={e => setForm(p => ({ ...p, role_th: e.target.value }))} placeholder="ที่ปรึกษาด้านกลยุทธ์" />
                </F>
                <F label="ตำแหน่ง (อังกฤษ)">
                  <input value={form.role_en} onChange={e => setForm(p => ({ ...p, role_en: e.target.value }))} placeholder="Strategy Consultant" />
                </F>
                <F label="Bio (ไทย)" className="col-span-2">
                  <textarea rows={3} value={form.bio_th} onChange={e => setForm(p => ({ ...p, bio_th: e.target.value }))} placeholder="ประวัติย่อ และความเชี่ยวชาญ..." />
                </F>
                <F label="Bio (อังกฤษ)" className="col-span-2">
                  <textarea rows={3} value={form.bio_en} onChange={e => setForm(p => ({ ...p, bio_en: e.target.value }))} placeholder="Brief bio and expertise..." />
                </F>
                <F label="ลำดับการแสดงผล">
                  <input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: +e.target.value }))} />
                </F>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">ยกเลิก</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 text-xs rounded-lg text-white font-medium disabled:opacity-50" style={{ background: 'var(--orange)' }}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
