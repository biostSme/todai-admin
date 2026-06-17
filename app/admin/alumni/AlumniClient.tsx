'use client'
import { useState, useRef } from 'react'
import { Plus, Pencil, Trash2, X, Save, Upload, ImageOff, Settings2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { uploadImage } from '@/lib/uploadImage'

type Person = { id: string; name_th: string; role_th?: string; company_th?: string; sector?: string; gen?: string; courses?: string[]; avatar_url?: string }
type Company = { id: string; name: string; sector?: string; gen?: string; logo_url?: string }

const emptyPerson = { name_th: '', name_en: '', role_th: '', role_en: '', company_th: '', company_en: '', sector: '', gen: '', courses: [] as string[], avatar_url: '' }
const emptyCompany = { name: '', sector: '', gen: '', logo_url: '' }

export default function AlumniClient({ people: init, companies: initCo, sectors: initSectors, courses: initCourses }: { people: Person[], companies: Company[], sectors: string[], courses: string[] }) {
  const [sectors, setSectors] = useState(initSectors)
  const [courses] = useState(initCourses)
  const [sectorModal, setSectorModal] = useState(false)
  const [newSector, setNewSector] = useState('')
  const [sectorSaving, setSectorSaving] = useState(false)
  const [tab, setTab] = useState<'people' | 'companies'>('people')
  const [modal, setModal] = useState<null | 'person' | 'company'>(null)
  const [personForm, setPersonForm] = useState(emptyPerson)
  const [companyForm, setCompanyForm] = useState(emptyCompany)
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [customCourseInput, setCustomCourseInput] = useState('')
  const personImgRef = useRef<HTMLInputElement>(null)
  const companyImgRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function addSector() {
    const name = newSector.trim().toUpperCase()
    if (!name || sectors.includes(name)) return
    setSectorSaving(true)
    await fetch('/api/sectors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    setSectors(prev => [...prev, name].sort())
    setNewSector('')
    setSectorSaving(false)
  }

  async function deleteSector(name: string) {
    if (!confirm(`ลบหมวดหมู่ "${name}" ?`)) return
    await fetch(`/api/sectors/${encodeURIComponent(name)}`, { method: 'DELETE' })
    setSectors(prev => prev.filter(s => s !== name))
  }

  async function uploadImg(file: File, folder: string): Promise<string | null> {
    setUploading(true)
    const url = await uploadImage(file, folder, 'avatar')
    setUploading(false)
    return url
  }

  function addCustomCourse() {
    const name = customCourseInput.trim()
    if (!name || personForm.courses.includes(name)) return
    setPersonForm(p => ({ ...p, courses: [...p.courses, name] }))
    setCustomCourseInput('')
  }

  async function savePerson() {
    setSaving(true)
    const data = { ...personForm }
    if (editing) await fetch(`/api/alumni/${editing}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    else await fetch('/api/alumni', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    setSaving(false); setModal(null); setCustomCourseInput(''); router.refresh()
  }

  async function saveCompany() {
    setSaving(true)
    if (editing) await fetch(`/api/alumni-companies/${editing}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(companyForm) })
    else await fetch('/api/alumni-companies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(companyForm) })
    setSaving(false); setModal(null); router.refresh()
  }

  async function deletePerson(id: string) {
    if (!confirm('ยืนยันการลบ?')) return
    await fetch(`/api/alumni/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  async function deleteCompany(id: string) {
    if (!confirm('ยืนยันการลบ?')) return
    await fetch(`/api/alumni-companies/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div>
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
        <h1 className="font-semibold text-gray-900">ทำเนียบศิษย์เก่า</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSectorModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50"
          >
            <Settings2 size={13} /> จัดการหมวดหมู่
          </button>
          <button
            onClick={() => { if (tab === 'people') { setPersonForm(emptyPerson); setEditing(null); setModal('person') } else { setCompanyForm(emptyCompany); setEditing(null); setModal('company') } }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: 'var(--orange)' }}
          >
            <Plus size={13} /> {tab === 'people' ? 'เพิ่มศิษย์เก่า' : 'เพิ่มบริษัท'}
          </button>
        </div>
      </div>
      <div className="p-6">
        <div className="flex gap-2 mb-4">
          {(['people', 'companies'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === t ? 'text-white' : 'bg-white border border-gray-200 text-gray-600'}`} style={tab === t ? { background: 'var(--orange)' } : {}}>
              {t === 'people' ? 'รายชื่อศิษย์เก่า' : 'บริษัทศิษย์เก่า'}
            </button>
          ))}
        </div>

        {tab === 'people' && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-xs">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium">ชื่อ</th>
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium">ตำแหน่ง</th>
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium">บริษัท</th>
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Sector</th>
                <th className="px-4 py-2.5 w-20"></th>
              </tr></thead>
              <tbody>
                {init.map(p => (
                  <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{p.name_th}</td>
                    <td className="px-4 py-2.5 text-gray-500">{p.role_th || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500">{p.company_th || '—'}</td>
                    <td className="px-4 py-2.5"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px]">{p.sector || '—'}</span></td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={() => { setPersonForm({ ...emptyPerson, ...p, courses: p.courses ?? [] }); setEditing(p.id); setModal('person') }} className="p-1 rounded border border-gray-200 text-gray-400 hover:bg-gray-50"><Pencil size={11} /></button>
                        <button onClick={() => deletePerson(p.id)} className="p-1 rounded border border-gray-200 text-red-400 hover:bg-red-50"><Trash2 size={11} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!init.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">ยังไม่มีข้อมูล</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'companies' && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-xs">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium">ชื่อบริษัท</th>
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Sector</th>
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium">รุ่น</th>
                <th className="px-4 py-2.5 w-20"></th>
              </tr></thead>
              <tbody>
                {initCo.map(c => (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{c.name}</td>
                    <td className="px-4 py-2.5"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px]">{c.sector || '—'}</span></td>
                    <td className="px-4 py-2.5 text-gray-500">{c.gen || '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={() => { setCompanyForm({ ...emptyCompany, ...c }); setEditing(c.id); setModal('company') }} className="p-1 rounded border border-gray-200 text-gray-400 hover:bg-gray-50"><Pencil size={11} /></button>
                        <button onClick={() => deleteCompany(c.id)} className="p-1 rounded border border-gray-200 text-red-400 hover:bg-red-50"><Trash2 size={11} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!initCo.length && <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">ยังไม่มีข้อมูล</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal จัดการหมวดหมู่ */}
      {sectorModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">จัดการหมวดหมู่อุตสาหกรรม</h2>
              <button onClick={() => setSectorModal(false)}><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="flex gap-2">
                <input
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 uppercase"
                  placeholder="ชื่อหมวดหมู่ใหม่ เช่น RETAIL"
                  value={newSector}
                  onChange={e => setNewSector(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && addSector()}
                />
                <button
                  onClick={addSector}
                  disabled={sectorSaving || !newSector.trim()}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 flex items-center gap-1"
                  style={{ background: 'var(--orange)' }}
                >
                  <Plus size={13} /> เพิ่ม
                </button>
              </div>
              <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                {sectors.map(s => (
                  <div key={s} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 group">
                    <span className="text-sm font-medium text-gray-700">{s}</span>
                    <button
                      onClick={() => deleteSector(s)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-red-400 hover:bg-red-50 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {!sectors.length && <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีหมวดหมู่</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Person */}
      {modal === 'person' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto py-6">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">{editing ? 'แก้ไขศิษย์เก่า' : 'เพิ่มศิษย์เก่า'}</h2>
              <button onClick={() => setModal(null)}><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {/* Avatar Upload */}
              <div>
                <div className="text-xs font-medium text-gray-500 mb-2">รูปโปรไฟล์</div>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center relative group">
                    {personForm.avatar_url
                      ? <img src={personForm.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <ImageOff size={20} className="text-gray-300" />
                    }
                    {personForm.avatar_url && (
                      <button onClick={() => setPersonForm(p => ({ ...p, avatar_url: '' }))} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs">ลบ</button>
                    )}
                  </div>
                  <div
                    className="flex-1 border-2 border-dashed border-gray-200 rounded-xl py-4 flex flex-col items-center gap-1 cursor-pointer hover:border-orange-300 transition-colors"
                    onClick={() => personImgRef.current?.click()}
                  >
                    <Upload size={16} className="text-gray-400" />
                    <span className="text-xs text-gray-500">{uploading ? 'กำลังอัปโหลด...' : 'คลิกเพื่ออัปโหลดรูป'}</span>
                    <span className="text-[10px] text-gray-400">JPG, PNG · แนะนำ 400×400px</span>
                  </div>
                  <input ref={personImgRef} type="file" accept="image/*" className="hidden"
                    onChange={async e => { const f = e.target.files?.[0]; if (f) { const url = await uploadImg(f, 'alumni'); if (url) setPersonForm(p => ({ ...p, avatar_url: url })) } }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <F label="ชื่อ (ไทย)" className="col-span-2"><input value={personForm.name_th} onChange={e => setPersonForm(p => ({ ...p, name_th: e.target.value }))} /></F>
                <F label="ชื่อ (อังกฤษ)" className="col-span-2"><input value={personForm.name_en} onChange={e => setPersonForm(p => ({ ...p, name_en: e.target.value }))} /></F>
                <F label="ตำแหน่ง (ไทย)"><input value={personForm.role_th} onChange={e => setPersonForm(p => ({ ...p, role_th: e.target.value }))} /></F>
                <F label="Sector">
                  <select value={personForm.sector} onChange={e => setPersonForm(p => ({ ...p, sector: e.target.value }))}>
                    <option value="">เลือก Sector</option>
                    {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </F>
                <F label="รุ่น (Gen)" className="col-span-2"><input value={personForm.gen} onChange={e => setPersonForm(p => ({ ...p, gen: e.target.value }))} placeholder="G2G #11" /></F>
                <F label="บริษัท (ไทย)" className="col-span-2"><input value={personForm.company_th} onChange={e => setPersonForm(p => ({ ...p, company_th: e.target.value }))} /></F>
                <div className="col-span-2 flex flex-col gap-2">
                  <label className="text-xs text-gray-500 font-medium">หลักสูตรที่เรียน</label>
                  {courses.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 border border-gray-200 rounded-lg">
                      {courses.map(c => (
                        <label key={c} className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={personForm.courses.includes(c)}
                            onChange={e => setPersonForm(p => ({
                              ...p,
                              courses: e.target.checked
                                ? [...p.courses, c]
                                : p.courses.filter(x => x !== c)
                            }))}
                            className="accent-orange-500"
                          />
                          <span className="text-xs text-gray-700">{c}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {personForm.courses.filter(c => !courses.includes(c)).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {personForm.courses.filter(c => !courses.includes(c)).map(c => (
                        <span key={c} className="flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-md text-xs">
                          {c}
                          <button type="button" onClick={() => setPersonForm(p => ({ ...p, courses: p.courses.filter(x => x !== c) }))} className="ml-0.5 hover:text-red-500 font-bold">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400"
                      placeholder="พิมพ์ชื่อหลักสูตรเก่า แล้วกด เพิ่ม"
                      value={customCourseInput}
                      onChange={e => setCustomCourseInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomCourse() } }}
                    />
                    <button type="button" onClick={addCustomCourse} disabled={!customCourseInput.trim()}
                      className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 whitespace-nowrap">
                      + เพิ่ม
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600">ยกเลิก</button>
              <button onClick={savePerson} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: 'var(--orange)' }}>
                <Save size={13} /> {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Company */}
      {modal === 'company' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto py-6">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">{editing ? 'แก้ไขบริษัท' : 'เพิ่มบริษัท'}</h2>
              <button onClick={() => setModal(null)}><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {/* Logo Upload */}
              <div>
                <div className="text-xs font-medium text-gray-500 mb-2">โลโก้บริษัท</div>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center relative group">
                    {companyForm.logo_url
                      ? <img src={companyForm.logo_url} alt="" className="w-full h-full object-contain p-2" />
                      : <ImageOff size={20} className="text-gray-300" />
                    }
                    {companyForm.logo_url && (
                      <button onClick={() => setCompanyForm(p => ({ ...p, logo_url: '' }))} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs">ลบ</button>
                    )}
                  </div>
                  <div
                    className="flex-1 border-2 border-dashed border-gray-200 rounded-xl py-4 flex flex-col items-center gap-1 cursor-pointer hover:border-orange-300 transition-colors"
                    onClick={() => companyImgRef.current?.click()}
                  >
                    <Upload size={16} className="text-gray-400" />
                    <span className="text-xs text-gray-500">{uploading ? 'กำลังอัปโหลด...' : 'คลิกเพื่ออัปโหลดโลโก้'}</span>
                    <span className="text-[10px] text-gray-400">JPG, PNG · แนะนำพื้นหลังโปร่งใส</span>
                  </div>
                  <input ref={companyImgRef} type="file" accept="image/*" className="hidden"
                    onChange={async e => { const f = e.target.files?.[0]; if (f) { const url = await uploadImg(f, 'companies'); if (url) setCompanyForm(p => ({ ...p, logo_url: url })) } }} />
                </div>
              </div>
              <F label="ชื่อบริษัท"><input value={companyForm.name} onChange={e => setCompanyForm(p => ({ ...p, name: e.target.value }))} /></F>
              <F label="Sector">
                <select value={companyForm.sector} onChange={e => setCompanyForm(p => ({ ...p, sector: e.target.value }))}>
                  <option value="">เลือก Sector</option>
                  {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </F>
              <F label="รุ่น"><input value={companyForm.gen} onChange={e => setCompanyForm(p => ({ ...p, gen: e.target.value }))} placeholder="G2G #10" /></F>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600">ยกเลิก</button>
              <button onClick={saveCompany} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: 'var(--orange)' }}>
                <Save size={13} /> {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function F({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs text-gray-500 font-medium">{label}</label>
      <div className="[&_input]:w-full [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_input]:border [&_input]:border-gray-200 [&_input]:rounded-lg [&_input]:focus:outline-none [&_input]:focus:border-orange-400 [&_select]:w-full [&_select]:px-3 [&_select]:py-2 [&_select]:text-sm [&_select]:border [&_select]:border-gray-200 [&_select]:rounded-lg [&_select]:focus:outline-none">
        {children}
      </div>
    </div>
  )
}
