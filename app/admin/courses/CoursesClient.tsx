'use client'
import { useState, useRef } from 'react'
import { Plus, Pencil, Trash2, X, Save, Upload, ImageOff, PlusCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Module = { title: string; desc?: string; items: string[] }
type Outcome = { label: string; title: string; icon_url?: string }
type C5Item = { label: string; title: string; desc?: string; icon_url?: string }

type Course = {
  id: string; title_th: string; title_en?: string; tagline_th?: string
  price_th?: string; price_en?: string; duration_th?: string; status: string
  cover_url?: string; mode_th?: string[]; gradient?: string
  outcomes_th?: string[]; outcomes_detail?: Outcome[]
  modules_th?: Module[]; format_th?: string; capacity?: string; open_date?: string
  desc_th?: string; system_5c?: C5Item[]
}

const statusStyle: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  upcoming: 'bg-amber-100 text-amber-800',
  closed: 'bg-gray-100 text-gray-600',
}
const statusLabel: Record<string, string> = { open: 'เปิดรับ', upcoming: 'เร็วๆ นี้', closed: 'ปิดแล้ว' }

const default5C: C5Item[] = [
  { label: 'Class', title: 'สู่กว้างระดับโลก', desc: '', icon_url: '' },
  { label: 'Coach', title: 'ปรับใช้กับบริบทธุรกิจ', desc: '', icon_url: '' },
  { label: 'Consultation', title: 'วางแผนโซลูชันเฉพาะตัว', desc: '', icon_url: '' },
  { label: 'Communication', title: 'เชื่อม Stakeholders', desc: '', icon_url: '' },
  { label: 'Community', title: 'เพื่อนผู้คิดจากผู้ประกอบการจริง', desc: '', icon_url: '' },
]

const emptyForm = {
  id: '', title_th: '', title_en: '', tagline_th: '', tagline_en: '',
  desc_th: '', desc_en: '', price_th: '', price_en: '',
  duration_th: '', duration_en: '', mode_th: '', format_th: '',
  capacity: '', open_date: '', gradient: 'linear-gradient(135deg,#1a1a1a,#FED403)',
  cover_url: '', brochure_url: '', status: 'open',
  outcomes_detail: [
    { label: 'INSIGHT', title: '', icon_url: '' },
    { label: 'INSPIRE', title: '', icon_url: '' },
    { label: 'IMPACT', title: '', icon_url: '' },
  ] as Outcome[],
  modules_th: [{ title: '', desc: '', items: [''] }] as Module[],
  system_5c: default5C,
}

type Tab = 'basic' | 'detail' | 'outcomes' | 'modules' | '5c'

export default function CoursesClient({ courses: initial }: { courses: Course[] }) {
  const [courses] = useState(initial)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [tab, setTab] = useState<Tab>('basic')
  const coverRef = useRef<HTMLInputElement>(null)
  const brochureRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function openNew() { setForm(emptyForm); setEditing(null); setTab('basic'); setModal(true) }
  function openEdit(c: Course) {
    setForm({
      ...emptyForm, ...c,
      mode_th: c.mode_th?.join(', ') ?? '',
      outcomes_detail: c.outcomes_detail?.length ? c.outcomes_detail : emptyForm.outcomes_detail,
      modules_th: c.modules_th?.length ? c.modules_th : emptyForm.modules_th,
      system_5c: c.system_5c?.length ? c.system_5c : default5C,
    })
    setEditing(c.id); setTab('basic'); setModal(true)
  }

  async function uploadFile(file: File, folder: string, key: string): Promise<string | null> {
    if (!file.type.startsWith('image/')) { alert('กรุณาเลือกไฟล์รูปภาพ'); return null }
    setUploading(key)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${folder}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true })
    setUploading(null)
    if (error) { alert('อัปโหลดไม่สำเร็จ: ' + error.message); return null }
    return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
  }

  async function save() {
    setSaving(true)
    const supabase = createClient()
    const data = {
      ...form,
      mode_th: form.mode_th ? form.mode_th.split(',').map(s => s.trim()) : [],
      outcomes_detail: form.outcomes_detail.filter(o => o.title || o.icon_url),
      modules_th: form.modules_th.filter(m => m.title),
      system_5c: form.system_5c,
    }
    if (editing) await supabase.from('courses').update(data).eq('id', editing)
    else await supabase.from('courses').insert(data)
    setSaving(false); setModal(false); router.refresh()
  }

  async function deleteCourse(id: string) {
    if (!confirm('ยืนยันการลบคอร์สนี้?')) return
    await createClient().from('courses').delete().eq('id', id)
    router.refresh()
  }

  // Module helpers
  function setModule(i: number, key: keyof Module, val: string) {
    setForm(p => { const m = [...p.modules_th]; m[i] = { ...m[i], [key]: val }; return { ...p, modules_th: m } })
  }
  function setModuleItem(mi: number, ii: number, val: string) {
    setForm(p => { const m = [...p.modules_th]; const items = [...m[mi].items]; items[ii] = val; m[mi] = { ...m[mi], items }; return { ...p, modules_th: m } })
  }
  function addModuleItem(mi: number) {
    setForm(p => { const m = [...p.modules_th]; m[mi] = { ...m[mi], items: [...m[mi].items, ''] }; return { ...p, modules_th: m } })
  }
  function removeModuleItem(mi: number, ii: number) {
    setForm(p => { const m = [...p.modules_th]; m[mi] = { ...m[mi], items: m[mi].items.filter((_, idx) => idx !== ii) }; return { ...p, modules_th: m } })
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'basic', label: 'ข้อมูลพื้นฐาน' },
    { key: 'detail', label: 'รายละเอียด + รูป' },
    { key: 'outcomes', label: 'สิ่งที่จะได้รับ' },
    { key: 'modules', label: 'เนื้อหาหลักสูตร' },
    { key: '5c', label: 'ระบบ 5C' },
  ]

  return (
    <div>
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-gray-900">คอร์สเรียน</h1>
          <p className="text-xs text-gray-400 mt-0.5">{courses.length} คอร์ส</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: 'var(--orange)' }}>
          <Plus size={13} /> เพิ่มคอร์ส
        </button>
      </div>

      <div className="p-6 flex flex-col gap-3">
        {courses.map(c => (
          <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3">
            <div className="w-14 h-10 rounded-lg flex-shrink-0 overflow-hidden">
              {c.cover_url
                ? <img src={c.cover_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full" style={{ background: c.gradient }} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-800 truncate">{c.title_th}</div>
              <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                {c.duration_th || '—'} · {c.price_th || 'ติดต่อสอบถาม'}
                {!c.cover_url && <span className="text-amber-500 flex items-center gap-0.5"><ImageOff size={10} /> ไม่มีรูป</span>}
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusStyle[c.status]}`}>{statusLabel[c.status]}</span>
            <div className="flex gap-2">
              <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"><Pencil size={13} /></button>
              <button onClick={() => deleteCourse(c.id)} className="p-1.5 rounded-lg border border-gray-200 text-red-400 hover:bg-red-50"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
        {!courses.length && <div className="text-center py-16 text-gray-400 text-sm">ยังไม่มีคอร์ส</div>}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 overflow-y-auto py-6">
          <div className="bg-white rounded-2xl w-full max-w-3xl mx-4">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="font-semibold text-gray-900">{editing ? 'แก้ไขคอร์ส' : 'เพิ่มคอร์สใหม่'}</h2>
              <button onClick={() => setModal(false)}><X size={16} className="text-gray-400" /></button>
            </div>

            {/* Tabs */}
            <div className="flex gap-0 px-6 pt-3 border-b border-gray-100 overflow-x-auto">
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.key ? 'border-orange-400 text-orange-500' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-6 flex flex-col gap-4">

              {/* ── Tab 1: ข้อมูลพื้นฐาน ── */}
              {tab === 'basic' && (
                <div className="grid grid-cols-2 gap-4">
                  <F label="ID คอร์ส (ไม่มีช่องว่าง)" disabled={!!editing}>
                    <input value={form.id} onChange={e => setForm(p => ({ ...p, id: e.target.value }))} placeholder="g2g-10" />
                  </F>
                  <F label="สถานะ">
                    <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                      <option value="open">เปิดรับ</option>
                      <option value="upcoming">เร็วๆ นี้</option>
                      <option value="closed">ปิดแล้ว</option>
                    </select>
                  </F>
                  <F label="ชื่อคอร์ส (ไทย)" className="col-span-2">
                    <input value={form.title_th} onChange={e => setForm(p => ({ ...p, title_th: e.target.value }))} placeholder="GREAT to GROWTH #10 — Masterclass กึ่งที่ปรึกษา" />
                  </F>
                  <F label="ชื่อคอร์ส (อังกฤษ)" className="col-span-2">
                    <input value={form.title_en} onChange={e => setForm(p => ({ ...p, title_en: e.target.value }))} />
                  </F>
                  <F label="Tagline (ไทย)" className="col-span-2">
                    <input value={form.tagline_th} onChange={e => setForm(p => ({ ...p, tagline_th: e.target.value }))} placeholder="หลักสูตรกึ่งที่ปรึกษา ที่พาธุรกิจของคุณเติบโต..." />
                  </F>
                  <F label="Tagline (อังกฤษ)" className="col-span-2">
                    <input value={(form as any).tagline_en ?? ''} onChange={e => setForm(p => ({ ...p, tagline_en: e.target.value } as any))} placeholder="The semi-consulting program that grows your business..." />
                  </F>
                  <F label="ราคา (ไทย)">
                    <input value={form.price_th} onChange={e => setForm(p => ({ ...p, price_th: e.target.value }))} placeholder="200,000 บาท" />
                  </F>
                  <F label="ราคา (อังกฤษ)">
                    <input value={form.price_en} onChange={e => setForm(p => ({ ...p, price_en: e.target.value }))} placeholder="Contact us" />
                  </F>
                  <F label="ระยะเวลา (ไทย)">
                    <input value={form.duration_th} onChange={e => setForm(p => ({ ...p, duration_th: e.target.value }))} placeholder="10 สัปดาห์" />
                  </F>
                  <F label="ระยะเวลา (อังกฤษ)">
                    <input value={(form as any).duration_en ?? ''} onChange={e => setForm(p => ({ ...p, duration_en: e.target.value } as any))} placeholder="10 weeks" />
                  </F>
                  <F label="วันที่เปิดรับ / รุ่น">
                    <input value={form.open_date} onChange={e => setForm(p => ({ ...p, open_date: e.target.value }))} placeholder="รุ่น 10 · เริ่ม ส.ค. 2569" />
                  </F>
                  <F label="รับจำนวน" className="col-span-2">
                    <input value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} placeholder="รับจำกัด 20 ธุรกิจ/รุ่น" />
                  </F>
                  <F label="รูปแบบการเรียน (ไทย, คั่นด้วย ,)" className="col-span-2">
                    <input value={form.mode_th} onChange={e => setForm(p => ({ ...p, mode_th: e.target.value }))} placeholder="เรียนสด On-site, ดูงานจริง, ที่ปรึกษาส่วนตัว" />
                  </F>
                  <F label="รูปแบบการเรียน (อังกฤษ, คั่นด้วย ,)" className="col-span-2">
                    <input value={(form as any).mode_en ?? ''} onChange={e => setForm(p => ({ ...p, mode_en: e.target.value } as any))} placeholder="Live On-site, Site Visit, Private Consulting" />
                  </F>
                  <F label="Gradient สีการ์ด" className="col-span-2">
                    <div className="flex gap-2">
                      <input className="flex-1" value={form.gradient} onChange={e => setForm(p => ({ ...p, gradient: e.target.value }))} />
                      <div className="w-10 h-9 rounded-lg flex-shrink-0" style={{ background: form.gradient }} />
                    </div>
                  </F>
                </div>
              )}

              {/* ── Tab 2: รายละเอียด + รูป ── */}
              {tab === 'detail' && (
                <div className="flex flex-col gap-5">
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">รูปหน้าปกคอร์ส</div>
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
                          if (f) { const url = await uploadFile(f, 'courses', 'cover'); if (url) setForm(p => ({ ...p, cover_url: url })) }
                        }}
                      >
                        <Upload size={22} className="text-gray-400" />
                        <div className="text-xs font-medium text-gray-600">{uploading === 'cover' ? 'กำลังอัปโหลด...' : 'ลากรูปมาวาง หรือคลิก'}</div>
                        <div className="text-[10px] text-gray-400">JPG, PNG · แนะนำ 800×450px</div>
                      </div>
                      <input ref={coverRef} type="file" accept="image/*" className="hidden"
                        onChange={async e => { const f = e.target.files?.[0]; if (f) { const url = await uploadFile(f, 'courses', 'cover'); if (url) setForm(p => ({ ...p, cover_url: url })) } }} />
                    </div>
                  </div>

                  {/* Brochure PDF */}
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">โบรชัวร์ (PDF)</div>
                    <div className="flex items-center gap-3">
                      {(form as any).brochure_url ? (
                        <div className="flex items-center gap-2 flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                          <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/></svg>
                          <a href={(form as any).brochure_url} target="_blank" rel="noopener" className="text-xs text-blue-600 truncate flex-1">ดูโบรชัวร์</a>
                          <button onClick={() => setForm(p => ({ ...p, brochure_url: '' } as any))} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                        </div>
                      ) : (
                        <button onClick={() => brochureRef.current?.click()}
                          className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-colors">
                          <Upload size={13} /> {uploading === 'brochure' ? 'กำลังอัปโหลด...' : 'อัปโหลด PDF'}
                        </button>
                      )}
                      <input ref={brochureRef} type="file" accept="application/pdf" className="hidden"
                        onChange={async e => {
                          const f = e.target.files?.[0]; if (!f) return
                          setUploading('brochure')
                          const supabase = createClient()
                          const path = `brochures/${Date.now()}.pdf`
                          const { error } = await supabase.storage.from('media').upload(path, f, { upsert: true })
                          setUploading(null)
                          if (error) { alert('อัปโหลดไม่สำเร็จ: ' + error.message); return }
                          const url = supabase.storage.from('media').getPublicUrl(path).data.publicUrl
                          setForm(p => ({ ...p, brochure_url: url } as any))
                        }} />
                    </div>
                  </div>

                  <F label="คำอธิบายละเอียด (ไทย)">
                    <textarea rows={4} value={form.desc_th} onChange={e => setForm(p => ({ ...p, desc_th: e.target.value }))} placeholder="พาคุณออกจาก การเอาตัวรอด ไปสู่ การเติบโตอย่างเป็นระบบ..." />
                  </F>
                  <F label="คำอธิบายละเอียด (อังกฤษ)">
                    <textarea rows={4} value={(form as any).desc_en ?? ''} onChange={e => setForm(p => ({ ...p, desc_en: e.target.value } as any))} placeholder="Taking you from survival mode to systematic growth..." />
                  </F>
                  <F label="รูปแบบ / Format (ไทย)">
                    <textarea rows={3} value={form.format_th} onChange={e => setForm(p => ({ ...p, format_th: e.target.value }))} placeholder="เวิร์กชอป + ชั่วโมงที่ปรึกษาส่วนตัว + ดูงานผู้ประกอบการตัวจริง" />
                  </F>
                  <F label="รูปแบบ / Format (อังกฤษ)">
                    <textarea rows={3} value={(form as any).format_en ?? ''} onChange={e => setForm(p => ({ ...p, format_en: e.target.value } as any))} placeholder="Workshop + Private consulting hours + Business site visits" />
                  </F>
                </div>
              )}

              {/* ── Tab 3: สิ่งที่จะได้รับ ── */}
              {tab === 'outcomes' && (
                <div className="flex flex-col gap-4">
                  <div className="text-xs text-gray-400">แต่ละข้อ = 1 Outcome เช่น INSIGHT / INSPIRE / IMPACT — อัปโหลด Icon ได้</div>
                  {form.outcomes_detail.map((o, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-4 flex gap-4">
                      {/* Icon upload */}
                      <div className="flex flex-col items-center gap-2 flex-shrink-0">
                        <div
                          className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-orange-300 transition-colors overflow-hidden"
                          onClick={() => { const inp = document.getElementById(`out-icon-${i}`) as HTMLInputElement; inp?.click() }}
                        >
                          {o.icon_url
                            ? <img src={o.icon_url} alt="" className="w-full h-full object-contain p-1" />
                            : uploading === `out-${i}`
                              ? <span className="text-[9px] text-gray-400">กำลังโหลด</span>
                              : <Upload size={16} className="text-gray-300" />
                          }
                        </div>
                        <span className="text-[10px] text-gray-400">Icon</span>
                        <input id={`out-icon-${i}`} type="file" accept="image/*" className="hidden"
                          onChange={async e => {
                            const f = e.target.files?.[0]; if (!f) return
                            const url = await uploadFile(f, 'outcomes', `out-${i}`)
                            if (url) setForm(p => { const arr = [...p.outcomes_detail]; arr[i] = { ...arr[i], icon_url: url }; return { ...p, outcomes_detail: arr } })
                          }} />
                      </div>
                      <div className="flex-1 flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-3">
                          <F label="Label (เช่น INSIGHT)">
                            <input value={o.label} onChange={e => { const arr = [...form.outcomes_detail]; arr[i] = { ...arr[i], label: e.target.value }; setForm(p => ({ ...p, outcomes_detail: arr })) }} />
                          </F>
                          <div className="flex items-end">
                            <button onClick={() => setForm(p => ({ ...p, outcomes_detail: p.outcomes_detail.filter((_, idx) => idx !== i) }))} className="p-2 rounded-lg border border-gray-200 text-red-400 hover:bg-red-50">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <F label="คำอธิบาย">
                          <input value={o.title} onChange={e => { const arr = [...form.outcomes_detail]; arr[i] = { ...arr[i], title: e.target.value }; setForm(p => ({ ...p, outcomes_detail: arr })) }} placeholder="เข้าใจถึง Macro–Market–Micro" />
                        </F>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setForm(p => ({ ...p, outcomes_detail: [...p.outcomes_detail, { label: '', title: '', icon_url: '' }] }))}
                    className="flex items-center gap-1.5 text-xs border border-dashed border-gray-300 rounded-xl py-3 justify-center text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-colors">
                    <PlusCircle size={13} /> เพิ่ม Outcome
                  </button>
                </div>
              )}

              {/* ── Tab 4: เนื้อหาหลักสูตร ── */}
              {tab === 'modules' && (
                <div className="flex flex-col gap-4">
                  <div className="text-xs text-gray-400">แต่ละ Module = 1 หมวดหมู่ เช่น MINDSET Series / OPERATION Series</div>
                  {form.modules_th.map((mod, mi) => (
                    <div key={mi} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600">Module {mi + 1}</span>
                        <button onClick={() => setForm(p => ({ ...p, modules_th: p.modules_th.filter((_, idx) => idx !== mi) }))} className="p-1 rounded border border-gray-200 text-red-400 hover:bg-red-50"><Trash2 size={11} /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <F label="ชื่อ Module" className="col-span-2">
                          <input value={mod.title} onChange={e => setModule(mi, 'title', e.target.value)} placeholder="MINDSET Series" />
                        </F>
                        <F label="คำอธิบาย Module" className="col-span-2">
                          <input value={mod.desc ?? ''} onChange={e => setModule(mi, 'desc', e.target.value)} placeholder="ปลุกพลังวัฒนธรรมผู้ประกอบการ..." />
                        </F>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-2">หัวข้อย่อย</div>
                        <div className="flex flex-col gap-2">
                          {mod.items.map((item, ii) => (
                            <div key={ii} className="flex gap-2">
                              <input value={item} placeholder={`หัวข้อ ${ii + 1}`}
                                onChange={e => setModuleItem(mi, ii, e.target.value)}
                                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400" />
                              <button onClick={() => removeModuleItem(mi, ii)} className="p-1.5 rounded border border-gray-200 text-red-400 hover:bg-red-50"><Trash2 size={11} /></button>
                            </div>
                          ))}
                          <button onClick={() => addModuleItem(mi)} className="flex items-center gap-1 text-xs self-start mt-1" style={{ color: 'var(--orange)' }}>
                            <PlusCircle size={12} /> เพิ่มหัวข้อ
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setForm(p => ({ ...p, modules_th: [...p.modules_th, { title: '', desc: '', items: [''] }] }))}
                    className="flex items-center gap-1.5 text-xs border border-dashed border-gray-300 rounded-xl py-3 justify-center text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-colors">
                    <PlusCircle size={13} /> เพิ่ม Module ใหม่
                  </button>
                </div>
              )}

              {/* ── Tab 5: ระบบ 5C ── */}
              {tab === '5c' && (
                <div className="flex flex-col gap-4">
                  <div className="text-xs text-gray-400">ระบบ 5C — แต่ละ C มี Label, ชื่อ, คำอธิบาย และ Icon ที่อัปโหลดได้</div>
                  {form.system_5c.map((c, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-4 flex gap-4">
                      {/* Icon upload */}
                      <div className="flex flex-col items-center gap-2 flex-shrink-0">
                        <div
                          className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-orange-300 transition-colors overflow-hidden bg-gray-50"
                          onClick={() => { const inp = document.getElementById(`c5-icon-${i}`) as HTMLInputElement; inp?.click() }}
                        >
                          {c.icon_url
                            ? <img src={c.icon_url} alt="" className="w-full h-full object-contain p-1" />
                            : uploading === `c5-${i}`
                              ? <span className="text-[9px] text-gray-400 text-center">กำลังโหลด</span>
                              : <div className="text-center"><Upload size={14} className="text-gray-300 mx-auto" /><div className="text-[9px] text-gray-300 mt-0.5">Icon</div></div>
                          }
                        </div>
                        {c.icon_url && (
                          <button onClick={() => setForm(p => { const arr = [...p.system_5c]; arr[i] = { ...arr[i], icon_url: '' }; return { ...p, system_5c: arr } })} className="text-[10px] text-red-400">ลบรูป</button>
                        )}
                        <input id={`c5-icon-${i}`} type="file" accept="image/*" className="hidden"
                          onChange={async e => {
                            const f = e.target.files?.[0]; if (!f) return
                            const url = await uploadFile(f, '5c-icons', `c5-${i}`)
                            if (url) setForm(p => { const arr = [...p.system_5c]; arr[i] = { ...arr[i], icon_url: url }; return { ...p, system_5c: arr } })
                          }} />
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <F label="Label (เช่น Class)">
                          <input value={c.label} onChange={e => { const arr = [...form.system_5c]; arr[i] = { ...arr[i], label: e.target.value }; setForm(p => ({ ...p, system_5c: arr })) }} />
                        </F>
                        <F label="ชื่อหัวข้อ">
                          <input value={c.title} onChange={e => { const arr = [...form.system_5c]; arr[i] = { ...arr[i], title: e.target.value }; setForm(p => ({ ...p, system_5c: arr })) }} placeholder="สู่กว้างระดับโลก" />
                        </F>
                        <F label="คำอธิบาย" className="col-span-2">
                          <input value={c.desc ?? ''} onChange={e => { const arr = [...form.system_5c]; arr[i] = { ...arr[i], desc: e.target.value }; setForm(p => ({ ...p, system_5c: arr })) }} placeholder="อธิบายเพิ่มเติม..." />
                        </F>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setForm(p => ({ ...p, system_5c: [...p.system_5c, { label: '', title: '', desc: '', icon_url: '' }] }))}
                    className="flex items-center gap-1.5 text-xs border border-dashed border-gray-300 rounded-xl py-3 justify-center text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-colors">
                    <PlusCircle size={13} /> เพิ่ม C ใหม่
                  </button>
                </div>
              )}

            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setModal(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">ยกเลิก</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: 'var(--orange)' }}>
                <Save size={13} /> {saving ? 'กำลังบันทึก...' : 'บันทึก'}
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
