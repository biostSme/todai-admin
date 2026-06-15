'use client'
import { useState, useRef } from 'react'
import { Plus, Pencil, Trash2, X, Save, Upload, ImageOff, ArrowUp, ArrowDown, PlusCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { resizeImage } from '@/lib/resizeImage'

type Framework = { n: string; d_th: string; d_en: string }

type CorpCourse = {
  id: string
  name_th: string
  name_en?: string
  icon_letter?: string
  gradient?: string
  cover_url?: string
  tag_th?: string
  tag_en?: string
  desc_th?: string
  desc_en?: string
  frameworks?: Framework[]
  topics?: string[]
  sort_order: number
}

type Tab = 'basic' | 'detail' | 'frameworks' | 'topics'

const emptyForm = {
  id: '',
  name_th: '', name_en: '',
  icon_letter: '',
  gradient: 'linear-gradient(135deg,#FF6A00,#FF8B1C)',
  cover_url: '',
  tag_th: '', tag_en: '',
  desc_th: '', desc_en: '',
  frameworks: [{ n: '', d_th: '', d_en: '' }] as Framework[],
  topics: [''] as string[],
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

const TABS: { key: Tab; label: string }[] = [
  { key: 'basic', label: 'ข้อมูลพื้นฐาน' },
  { key: 'detail', label: 'รายละเอียด' },
  { key: 'frameworks', label: 'Model & Framework' },
  { key: 'topics', label: 'หัวข้อที่ครอบคลุม' },
]

export default function CorpClient({ courses: initial }: { courses: CorpCourse[] }) {
  const [courses, setCourses] = useState(initial)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [tab, setTab] = useState<Tab>('basic')
  const coverRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function openNew() {
    setForm({ ...emptyForm, sort_order: courses.length })
    setEditing(null); setTab('basic'); setModal(true)
  }

  function openEdit(c: CorpCourse) {
    setForm({
      ...emptyForm, ...c,
      frameworks: c.frameworks?.length ? c.frameworks : [{ n: '', d_th: '', d_en: '' }],
      topics: c.topics?.length ? c.topics : [''],
    })
    setEditing(c.id); setTab('basic'); setModal(true)
  }

  async function uploadCover(file: File): Promise<string | null> {
    if (!file.type.startsWith('image/')) { alert('กรุณาเลือกไฟล์รูปภาพ'); return null }
    setUploading(true)
    const resized = await resizeImage(file, 'cover')
    const supabase = createClient()
    const path = `corp/${Date.now()}.jpg`
    const { error } = await supabase.storage.from('media').upload(path, resized, { upsert: true })
    setUploading(false)
    if (error) { alert('อัปโหลดไม่สำเร็จ: ' + error.message); return null }
    return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
  }

  async function save() {
    if (!form.id || !form.name_th) { alert('กรุณาใส่ ID และชื่อหลักสูตร'); return }
    setSaving(true)
    const supabase = createClient()
    const data = {
      ...form,
      frameworks: form.frameworks.filter(f => f.n),
      topics: form.topics.filter(t => t.trim()),
    }
    if (editing) {
      await supabase.from('corp_courses').update(data).eq('id', editing)
    } else {
      await supabase.from('corp_courses').insert(data)
    }
    setSaving(false); setModal(false); router.refresh()
  }

  async function deleteCourse(id: string) {
    if (!confirm('ยืนยันการลบหลักสูตรนี้?')) return
    await createClient().from('corp_courses').delete().eq('id', id)
    setCourses(c => c.filter(x => x.id !== id))
  }

  async function moveOrder(id: string, dir: 'up' | 'down') {
    const idx = courses.findIndex(c => c.id === id)
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === courses.length - 1) return
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    const updated = [...courses]
    ;[updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]]
    const supabase = createClient()
    await Promise.all([
      supabase.from('corp_courses').update({ sort_order: swapIdx }).eq('id', updated[swapIdx].id),
      supabase.from('corp_courses').update({ sort_order: idx }).eq('id', updated[idx].id),
    ])
    setCourses(updated.map((c, i) => ({ ...c, sort_order: i })))
  }

  function setFW(i: number, key: keyof Framework, val: string) {
    setForm(p => { const arr = [...p.frameworks]; arr[i] = { ...arr[i], [key]: val }; return { ...p, frameworks: arr } })
  }

  return (
    <div>
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-gray-900">คอร์สสำหรับองค์กร</h1>
          <p className="text-xs text-gray-400 mt-0.5">{courses.length} หลักสูตร</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: 'var(--orange)' }}>
          <Plus size={13} /> เพิ่มหลักสูตร
        </button>
      </div>

      <div className="p-6 flex flex-col gap-3">
        {courses.map((c, idx) => (
          <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <button onClick={() => moveOrder(c.id, 'up')} disabled={idx === 0} className="p-1 rounded border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-30"><ArrowUp size={11} /></button>
              <button onClick={() => moveOrder(c.id, 'down')} disabled={idx === courses.length - 1} className="p-1 rounded border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-30"><ArrowDown size={11} /></button>
            </div>
            <div className="w-14 h-10 rounded-lg flex-shrink-0 overflow-hidden">
              {c.cover_url
                ? <img src={c.cover_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-white text-lg font-bold" style={{ background: c.gradient }}>
                    {c.icon_letter || '?'}
                  </div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-800">{c.name_th}</div>
              <div className="text-xs text-gray-400 mt-0.5">{c.tag_th || '—'}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"><Pencil size={13} /></button>
              <button onClick={() => deleteCourse(c.id)} className="p-1.5 rounded-lg border border-gray-200 text-red-400 hover:bg-red-50"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
        {!courses.length && <div className="text-center py-16 text-gray-400 text-sm">ยังไม่มีหลักสูตร</div>}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 overflow-y-auto py-6">
          <div className="bg-white rounded-2xl w-full max-w-3xl mx-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="font-semibold text-gray-900">{editing ? 'แก้ไขหลักสูตร' : 'เพิ่มหลักสูตรใหม่'}</h2>
              <button onClick={() => setModal(false)}><X size={16} className="text-gray-400" /></button>
            </div>

            <div className="flex gap-0 px-6 pt-3 border-b border-gray-100 overflow-x-auto">
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.key ? 'border-orange-400 text-orange-500' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-6 flex flex-col gap-4">

              {/* Tab 1: ข้อมูลพื้นฐาน */}
              {tab === 'basic' && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <F label="ID (ไม่มีช่องว่าง)" >
                      <input value={form.id} onChange={e => setForm(p => ({ ...p, id: e.target.value }))} placeholder="mindset" disabled={!!editing} />
                    </F>
                    <F label="Icon Letter (ตัวอักษรบนการ์ด)">
                      <input value={form.icon_letter} onChange={e => setForm(p => ({ ...p, icon_letter: e.target.value }))} placeholder="M" maxLength={2} />
                    </F>
                    <F label="ชื่อหลักสูตร (ไทย)" className="col-span-2">
                      <input value={form.name_th} onChange={e => setForm(p => ({ ...p, name_th: e.target.value }))} placeholder="Mindset the Series" />
                    </F>
                    <F label="ชื่อหลักสูตร (อังกฤษ)" className="col-span-2">
                      <input value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} placeholder="Mindset the Series" />
                    </F>
                    <F label="คำโปรย (ไทย)" className="col-span-2">
                      <textarea rows={2} value={form.tag_th} onChange={e => setForm(p => ({ ...p, tag_th: e.target.value }))} placeholder="ปรับกรอบคิด สร้างทัศนคติเชิงบวกเพื่อความสำเร็จของทีม" />
                    </F>
                    <F label="คำโปรย (อังกฤษ)" className="col-span-2">
                      <textarea rows={2} value={form.tag_en} onChange={e => setForm(p => ({ ...p, tag_en: e.target.value }))} placeholder="Aligning perspectives and building positive mindsets for team success." />
                    </F>
                    <F label="Gradient สีการ์ด" className="col-span-2">
                      <div className="flex gap-2">
                        <input className="flex-1" value={form.gradient} onChange={e => setForm(p => ({ ...p, gradient: e.target.value }))} />
                        <div className="w-10 h-9 rounded-lg flex-shrink-0" style={{ background: form.gradient }} />
                      </div>
                    </F>
                  </div>

                  {/* Cover image */}
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-3">รูปหน้าปก (ถ้ามี)</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative h-32 rounded-xl overflow-hidden bg-gray-100 group">
                        {form.cover_url
                          ? <img src={form.cover_url} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex flex-col items-center justify-center text-white text-2xl font-bold" style={{ background: form.gradient }}>
                              {form.icon_letter || '?'}
                            </div>
                        }
                        {form.cover_url && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button onClick={() => coverRef.current?.click()} className="bg-white/90 rounded-lg px-3 py-1.5 text-xs flex items-center gap-1"><Upload size={11} /> เปลี่ยน</button>
                            <button onClick={() => setForm(p => ({ ...p, cover_url: '' }))} className="bg-white/90 rounded-lg px-3 py-1.5 text-xs text-red-500"><Trash2 size={11} /></button>
                          </div>
                        )}
                      </div>
                      <div
                        className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${dragOver ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-orange-300'}`}
                        onClick={() => coverRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={async e => {
                          e.preventDefault(); setDragOver(false)
                          const f = e.dataTransfer.files[0]
                          if (f) { const url = await uploadCover(f); if (url) setForm(p => ({ ...p, cover_url: url })) }
                        }}
                      >
                        <Upload size={20} className="text-gray-400" />
                        <div className="text-xs text-gray-500">{uploading ? 'กำลังอัปโหลด...' : 'ลากรูปมาวาง หรือคลิก'}</div>
                        <div className="text-[10px] text-gray-400">JPG, PNG · แนะนำ 800×450px</div>
                      </div>
                      <input ref={coverRef} type="file" accept="image/*" className="hidden"
                        onChange={async e => {
                          const f = e.target.files?.[0]
                          if (f) { const url = await uploadCover(f); if (url) setForm(p => ({ ...p, cover_url: url })) }
                        }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: รายละเอียด */}
              {tab === 'detail' && (
                <div className="flex flex-col gap-4">
                  <F label="รายละเอียด (ไทย)">
                    <textarea rows={5} value={form.desc_th} onChange={e => setForm(p => ({ ...p, desc_th: e.target.value }))} placeholder="ปลูกฝังจิตวิญญาณผู้ประกอบการด้วยแนวคิด 3P..." />
                  </F>
                  <F label="รายละเอียด (อังกฤษ)">
                    <textarea rows={5} value={form.desc_en} onChange={e => setForm(p => ({ ...p, desc_en: e.target.value }))} placeholder="Embed an entrepreneurial spirit with the 3P mindset..." />
                  </F>
                </div>
              )}

              {/* Tab 3: Frameworks */}
              {tab === 'frameworks' && (
                <div className="flex flex-col gap-4">
                  <div className="text-xs text-gray-400">Model & Framework แต่ละอัน = 1 กรอบแนวคิด</div>
                  {form.frameworks.map((fw, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600">Framework {i + 1}</span>
                        <button onClick={() => setForm(p => ({ ...p, frameworks: p.frameworks.filter((_, idx) => idx !== i) }))}
                          className="p-1 rounded border border-gray-200 text-red-400 hover:bg-red-50"><Trash2 size={11} /></button>
                      </div>
                      <F label="ชื่อ Framework">
                        <input value={fw.n} onChange={e => setFW(i, 'n', e.target.value)} placeholder="3P Mindset" />
                      </F>
                      <F label="คำอธิบาย (ไทย)">
                        <textarea rows={2} value={fw.d_th} onChange={e => setFW(i, 'd_th', e.target.value)} placeholder="กรอบคิดที่สมดุลระหว่าง Profit, People, Planet..." />
                      </F>
                      <F label="คำอธิบาย (อังกฤษ)">
                        <textarea rows={2} value={fw.d_en} onChange={e => setFW(i, 'd_en', e.target.value)} placeholder="A balanced mindset across Profit, People, and Planet..." />
                      </F>
                    </div>
                  ))}
                  <button onClick={() => setForm(p => ({ ...p, frameworks: [...p.frameworks, { n: '', d_th: '', d_en: '' }] }))}
                    className="flex items-center gap-1.5 text-xs border border-dashed border-gray-300 rounded-xl py-3 justify-center text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-colors">
                    <PlusCircle size={13} /> เพิ่ม Framework
                  </button>
                </div>
              )}

              {/* Tab 4: Topics */}
              {tab === 'topics' && (
                <div className="flex flex-col gap-3">
                  <div className="text-xs text-gray-400">หัวข้อที่ครอบคลุมในหลักสูตร — แต่ละบรรทัด = 1 หัวข้อ</div>
                  {form.topics.map((topic, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={topic}
                        placeholder={`หัวข้อ ${i + 1}`}
                        onChange={e => { const arr = [...form.topics]; arr[i] = e.target.value; setForm(p => ({ ...p, topics: arr })) }}
                        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400"
                      />
                      <button onClick={() => setForm(p => ({ ...p, topics: p.topics.filter((_, idx) => idx !== i) }))}
                        className="p-2 rounded-lg border border-gray-200 text-red-400 hover:bg-red-50"><Trash2 size={13} /></button>
                    </div>
                  ))}
                  <button onClick={() => setForm(p => ({ ...p, topics: [...p.topics, ''] }))}
                    className="flex items-center gap-1.5 text-xs border border-dashed border-gray-300 rounded-xl py-3 justify-center text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-colors">
                    <PlusCircle size={13} /> เพิ่มหัวข้อ
                  </button>
                </div>
              )}

            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">ยกเลิก</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 text-xs rounded-lg text-white font-medium disabled:opacity-50 flex items-center gap-1.5" style={{ background: 'var(--orange)' }}>
                <Save size={12} /> {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
