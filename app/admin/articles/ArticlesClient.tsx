'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, X, Save, Upload, ImageOff, PlusCircle, GripVertical } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { uploadImage as doUpload } from '@/lib/uploadImage'

// Rich text paragraph component
function RichPara({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || ''
    }
  }, []) // ตั้งค่าเริ่มต้นครั้งเดียว

  const exec = useCallback((cmd: string, arg?: string) => {
    ref.current?.focus()
    document.execCommand(cmd, false, arg)
    if (ref.current) onChange(ref.current.innerHTML)
  }, [onChange])

  return (
    <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden focus-within:border-orange-400 transition-colors">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50">
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); exec('bold') }}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors font-bold text-xs"
          title="ตัวหนา (Ctrl+B)"
        >
          B
        </button>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <select
          onMouseDown={e => e.stopPropagation()}
          onChange={e => { if (e.target.value) { exec('fontSize', e.target.value); e.target.value = '' } }}
          defaultValue=""
          className="text-xs border border-gray-200 rounded px-1.5 py-1 text-gray-600 bg-white focus:outline-none focus:border-orange-400 cursor-pointer"
          title="ขนาดตัวอักษร"
        >
          <option value="" disabled>ขนาด</option>
          <option value="1">เล็กมาก</option>
          <option value="2">เล็ก</option>
          <option value="3">ปกติ</option>
          <option value="4">ใหญ่</option>
          <option value="5">ใหญ่มาก</option>
          <option value="6">ใหญ่พิเศษ</option>
          <option value="7">ใหญ่สุด</option>
        </select>
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); exec('removeFormat') }}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-400 transition-colors text-[10px] leading-none ml-auto"
          title="ล้างการจัดรูปแบบ"
        >
          ✕ format
        </button>
      </div>
      {/* Editable area */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => { if (ref.current) onChange(ref.current.innerHTML) }}
        className="min-h-[60px] px-3 py-2 text-sm text-gray-800 focus:outline-none"
        data-placeholder={placeholder}
        style={{ minHeight: 60 }}
      />
    </div>
  )
}

type Article = {
  id: string; title_th: string; category_th?: string; cover_url?: string
  status: string; published_at?: string; gradient?: string
}

const emptyForm = {
  id: '', category_th: 'วิธีคิด', category_en: 'Mindset',
  title_th: '', title_en: '', desc_th: '', desc_en: '',
  body_th: [''], body_en: [''],
  gradient: 'linear-gradient(135deg,#FF6A00,#FF8B1C)',
  cover_url: '', status: 'draft',
}

const statusStyle: Record<string, string> = {
  published: 'bg-green-100 text-green-800',
  draft: 'bg-amber-100 text-amber-800',
}
const statusLabel: Record<string, string> = { published: 'เผยแพร่แล้ว', draft: 'Draft' }

export default function ArticlesClient({ articles: initial }: { articles: Article[] }) {
  const [articles] = useState(initial)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function openNew() { setForm(emptyForm); setEditing(null); setModal(true) }
  function openEdit(a: Article) {
    setForm({ ...emptyForm, ...a, category_th: (a as any).category_th ?? 'วิธีคิด', category_en: (a as any).category_en ?? 'Mindset', body_th: (a as any).body_th ?? [''], body_en: (a as any).body_en ?? [''] })
    setEditing(a.id); setModal(true)
  }

  async function uploadImage(file: File) {
    setUploading(true)
    const url = await doUpload(file, 'articles', 'article')
    if (url) setForm(p => ({ ...p, cover_url: url }))
    setUploading(false)
  }

  async function save(status: string) {
    setSaving(true)
    const data = { ...form, status }
    if (editing) {
      await fetch(`/api/articles/${editing}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    } else {
      await fetch('/api/articles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    }
    setSaving(false); setModal(false); router.refresh()
  }

  async function deleteArticle(id: string) {
    if (!confirm('ยืนยันการลบบทความนี้?')) return
    await fetch(`/api/articles/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  function setBodyPara(lang: 'body_th' | 'body_en', i: number, val: string) {
    setForm(p => { const arr = [...p[lang]]; arr[i] = val; return { ...p, [lang]: arr } })
  }
  function addPara(lang: 'body_th' | 'body_en') {
    setForm(p => ({ ...p, [lang]: [...p[lang], ''] }))
  }
  function removePara(lang: 'body_th' | 'body_en', i: number) {
    setForm(p => { const arr = [...p[lang]]; arr.splice(i, 1); return { ...p, [lang]: arr.length ? arr : [''] } })
  }

  return (
    <div>
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-gray-900">บทความ</h1>
          <p className="text-xs text-gray-400 mt-0.5">{articles.length} บทความ</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: 'var(--orange)' }}>
          <Plus size={13} /> เขียนบทความใหม่
        </button>
      </div>
      <div className="p-6 flex flex-col gap-3">
        {articles.map(a => (
          <div key={a.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3">
            <div className="w-14 h-10 rounded-lg flex-shrink-0 overflow-hidden bg-gray-100 flex items-center justify-center">
              {a.cover_url
                ? <img src={a.cover_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full" style={{ background: a.gradient }} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-800 truncate">{a.title_th}</div>
              <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                {a.category_th}
                {!a.cover_url && <span className="text-amber-500 flex items-center gap-0.5"><ImageOff size={10} /> ยังไม่มีรูป</span>}
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusStyle[a.status]}`}>{statusLabel[a.status]}</span>
            <div className="flex gap-2">
              <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"><Pencil size={13} /></button>
              <button onClick={() => deleteArticle(a.id)} className="p-1.5 rounded-lg border border-gray-200 text-red-400 hover:bg-red-50"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
        {!articles.length && <div className="text-center py-16 text-gray-400 text-sm">ยังไม่มีบทความ</div>}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 overflow-y-auto py-6">
          <div className="bg-white rounded-2xl w-full max-w-3xl mx-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h2 className="font-semibold text-gray-900">{editing ? 'แก้ไขบทความ' : 'บทความใหม่'}</h2>
              <button onClick={() => setModal(false)}><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="p-6 flex flex-col gap-5">

              {/* Cover Image */}
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">รูปหน้าปก (Cover Image)</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative h-36 rounded-xl overflow-hidden bg-gray-100 group">
                    {form.cover_url
                      ? <img src={form.cover_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex flex-col items-center justify-center gap-1" style={{ background: form.gradient }}>
                          <ImageOff size={24} className="text-white/40" />
                          <span className="text-white/40 text-xs">ยังไม่มีรูป</span>
                        </div>
                    }
                    {form.cover_url && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button onClick={() => fileRef.current?.click()} className="bg-white/90 rounded-lg px-3 py-1.5 text-xs flex items-center gap-1"><Upload size={11} /> เปลี่ยน</button>
                        <button onClick={() => setForm(p => ({ ...p, cover_url: '' }))} className="bg-white/90 rounded-lg px-3 py-1.5 text-xs text-red-500"><Trash2 size={11} /></button>
                      </div>
                    )}
                  </div>
                  <div
                    className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${dragOver ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-orange-300'}`}
                    onClick={() => fileRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) uploadImage(f) }}
                  >
                    <Upload size={22} className="text-gray-400" />
                    <div className="text-xs font-medium text-gray-600">{uploading ? 'กำลังอัปโหลด...' : 'ลากรูปมาวาง หรือคลิก'}</div>
                    <div className="text-[10px] text-gray-400">JPG, PNG · ไม่เกิน 2MB · แนะนำ 800×400px</div>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f) }} />
                </div>
              </div>

              {/* ข้อมูลพื้นฐาน */}
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">ข้อมูลบทความ</div>
                <div className="grid grid-cols-2 gap-3">
                  <F label="ID (ภาษาอังกฤษ ไม่มีช่องว่าง)" disabled={!!editing}>
                    <input value={form.id} onChange={e => setForm(p => ({ ...p, id: e.target.value }))} placeholder="rethink-profit" />
                  </F>
                  <F label="หมวดหมู่">
                    <select value={form.category_th} onChange={e => setForm(p => ({ ...p, category_th: e.target.value }))}>
                      <option value="วิธีคิด">วิธีคิด / Mindset</option>
                      <option value="องค์กร">องค์กร / Organization</option>
                      <option value="แบรนด์">แบรนด์ / Brand</option>
                    </select>
                  </F>
                  <F label="ชื่อบทความ (ไทย)" className="col-span-2">
                    <input value={form.title_th} onChange={e => setForm(p => ({ ...p, title_th: e.target.value }))} placeholder="คิดใหม่เรื่อง กำไร — โตได้ต้องมาคู่กับโตดี" />
                  </F>
                  <F label="ชื่อบทความ (อังกฤษ)" className="col-span-2">
                    <input value={form.title_en} onChange={e => setForm(p => ({ ...p, title_en: e.target.value }))} />
                  </F>
                  <F label="คำอธิบายสั้น (ไทย)" className="col-span-2">
                    <textarea rows={2} value={form.desc_th} onChange={e => setForm(p => ({ ...p, desc_th: e.target.value }))} />
                  </F>
                  <F label="Gradient สีการ์ด" className="col-span-2">
                    <div className="flex gap-2">
                      <input className="flex-1" value={form.gradient} onChange={e => setForm(p => ({ ...p, gradient: e.target.value }))} />
                      <div className="w-10 h-9 rounded-lg flex-shrink-0" style={{ background: form.gradient }} />
                    </div>
                  </F>
                </div>
              </div>

              {/* เนื้อหา */}
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">เนื้อหาบทความ (ไทย) — แต่ละช่อง = 1 ย่อหน้า</div>
                <div className="flex flex-col gap-2">
                  {form.body_th.map((para, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <GripVertical size={14} className="text-gray-300 mt-10 flex-shrink-0" />
                      <RichPara
                        value={para}
                        onChange={v => setBodyPara('body_th', i, v)}
                        placeholder={`ย่อหน้าที่ ${i + 1}`}
                      />
                      <button onClick={() => removePara('body_th', i)} className="p-1.5 rounded-lg border border-gray-200 text-red-400 hover:bg-red-50 mt-10 flex-shrink-0"><Trash2 size={12} /></button>
                    </div>
                  ))}
                  <button onClick={() => addPara('body_th')} className="flex items-center gap-1.5 text-xs mt-1 self-start" style={{ color: 'var(--orange)' }}>
                    <PlusCircle size={13} /> เพิ่มย่อหน้า
                  </button>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setModal(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">ยกเลิก</button>
              <button onClick={() => save('draft')} disabled={saving} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60">บันทึก Draft</button>
              <button onClick={() => save('published')} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: 'var(--orange)' }}>
                <Save size={13} /> {saving ? 'กำลังบันทึก...' : 'เผยแพร่'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function F({ label, children, className = '', disabled = false }: { label: string; children: React.ReactNode; className?: string; disabled?: boolean }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`} style={disabled ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
      <label className="text-xs text-gray-500 font-medium">{label}</label>
      <div className="[&_input]:w-full [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_input]:border [&_input]:border-gray-200 [&_input]:rounded-lg [&_input]:focus:outline-none [&_input]:focus:border-orange-400 [&_select]:w-full [&_select]:px-3 [&_select]:py-2 [&_select]:text-sm [&_select]:border [&_select]:border-gray-200 [&_select]:rounded-lg [&_select]:focus:outline-none [&_textarea]:w-full [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:text-sm [&_textarea]:border [&_textarea]:border-gray-200 [&_textarea]:rounded-lg [&_textarea]:focus:outline-none [&_textarea]:resize-none">
        {children}
      </div>
    </div>
  )
}
