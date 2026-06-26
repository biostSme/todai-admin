'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Plus, Trash2, Edit2, Save, X, Download, ExternalLink, Check, CreditCard, FileText } from 'lucide-react'

type Settings = Record<string, string>
type Speaker = { id: number; name_th: string; name_en: string; role_th: string; role_en: string; org_th: string; org_en: string; bio_th: string; bio_en: string; avatar_url: string; sort_order: number }
type Entrepreneur = { id: number; name_th: string; name_en: string; role_th: string; role_en: string; company_th: string; company_en: string; bio_th: string; bio_en: string; avatar_url: string; sort_order: number }
type Application = {
  id: number; status: string; created_at: string; batch_number: string
  // Person 1 (TH)
  prefix: string; firstname: string; lastname: string; nickname: string
  // Person 1 (EN)
  prefix_en: string; firstname_en: string; lastname_en: string; nickname_en: string
  // Person 1 — contact
  birth_day: string; birth_month: string; birth_year: string; id_card: string
  phone: string; email: string; facebook: string; line_id: string
  // Person 2 (optional)
  p2_prefix: string; p2_firstname: string; p2_lastname: string; p2_nickname: string
  p2_prefix_en: string; p2_firstname_en: string; p2_lastname_en: string; p2_nickname_en: string
  p2_birth_day: string; p2_birth_month: string; p2_birth_year: string; p2_id_card: string
  p2_phone: string; p2_email: string; p2_facebook: string; p2_line_id: string
  // Business
  business_name: string; business_company: string; business_branch: string
  business_address: string; business_taxid: string; business_phone: string
  business_type: string; business_age: string
  revenue: string; employees: string; website: string; challenges: string
  // Document
  doc_delivery: string; doc_alt_address: string
  // Other
  referral: string; reason: string; expectation: string; note: string
}
type AlumniRow = { id: number; name_th: string; role_th: string; company_th: string; avatar_url: string; gen: string }
type TeamRow = { id: number; name_th: string; role_th: string; avatar_url: string }

const TABS = ['ตั้งค่า & โบรชัวร์', 'วิทยากรผู้เชี่ยวชาญ', 'ผู้ประกอบการตัวจริง', 'ผู้สมัคร G2G', 'การชำระเงิน']
const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'รอพิจารณา', approved: 'อนุมัติ', rejected: 'ไม่ผ่าน',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

/* ───────────── SETTINGS TAB ───────────── */
function SettingsTab({ init }: { init: Settings }) {
  const [s, setS] = useState(init)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const pdfRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function uploadBrochure(file: File) {
    setUploadingPdf(true)
    setPdfError('')
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('folder', 'brochures')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!data.url) throw new Error(data.error || 'ไม่ได้รับ URL จาก Cloudinary')
      const next = { ...s, brochure_url: data.url }
      setS(next)
      await fetch('/api/g2g-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brochure_url: data.url }),
      })
    } catch (e: any) {
      setPdfError(e.message || 'อัพโหลดไม่สำเร็จ')
    } finally {
      setUploadingPdf(false)
      if (pdfRef.current) pdfRef.current.value = ''
    }
  }

  async function save() {
    setSaving(true)
    await fetch('/api/g2g-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  const field = (key: string, label: string, type = 'text', placeholder = '') => (
    <div key={key}>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
        value={s[key] ?? ''}
        placeholder={placeholder}
        onChange={e => setS(p => ({ ...p, [key]: e.target.value }))}
      />
    </div>
  )

  return (
    <div className="max-w-xl flex flex-col gap-4">
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-gray-700">ข้อมูล Batch</h3>
        {field('batch_number', 'รุ่นที่ (Batch Number)', 'text', 'เช่น 11')}
        {field('capacity', 'รับจำกัด (จำนวนที่นั่ง)', 'text', 'เช่น 20')}
        {field('open_date', 'วันเปิดรับสมัคร', 'text', 'เช่น 1 ก.ค. 2568')}
        {field('close_date', 'วันปิดรับสมัคร', 'text', 'เช่น 31 ก.ค. 2568')}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-gray-700">โบรชัวร์ & LINE</h3>
        <div>
          <label className="block text-xs text-gray-500 mb-2">ไฟล์โบรชัวร์ (PDF)</label>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => pdfRef.current?.click()}
              disabled={uploadingPdf}
              className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-orange-300 rounded-lg text-xs text-orange-600 hover:bg-orange-50 disabled:opacity-50 transition-colors"
            >
              <Upload size={13} /> {uploadingPdf ? 'กำลังอัพโหลด…' : 'อัพโหลด PDF'}
            </button>
            {s.brochure_url && !pdfError && (
              <a href={s.brochure_url} target="_blank" rel="noopener" className="flex items-center gap-1 text-xs text-green-600 hover:underline">
                <FileText size={12} /> ดูไฟล์ปัจจุบัน
              </a>
            )}
          </div>
          {pdfError && <p className="text-xs text-red-500 mt-1">{pdfError}</p>}
          <input ref={pdfRef} type="file" accept="application/pdf" className="hidden"
            onChange={e => e.target.files?.[0] && uploadBrochure(e.target.files[0])} />
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-gray-700">ราคา & ชำระเงิน</h3>
        {field('g2g_price', 'ราคาค่าลงทะเบียน (บาท)', 'text', 'เช่น 200000')}
        <div>
          <label className="block text-xs text-gray-500 mb-1">ธนาคาร</label>
          <input
            type="text"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
            value={s.bank_name ?? ''}
            placeholder="เช่น กสิกรไทย"
            onChange={e => setS(p => ({ ...p, bank_name: e.target.value }))}
          />
        </div>
        {field('bank_account_name', 'ชื่อบัญชี', 'text', 'เช่น บริษัท แบรนด์ดิ้ง แอนด์ คอมพะนีส์ จำกัด')}
        {field('bank_account_no', 'เลขบัญชี', 'text', 'เช่น 123-4-56789-0')}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-gray-700">รูปตารางกิจกรรม</h3>
        {field('schedule_img_url', 'URL รูปตารางกิจกรรม (แทนที่ปฏิทิน)', 'url', 'https://...')}
        {s.schedule_img_url && (
          <img src={s.schedule_img_url} alt="schedule preview" className="rounded-lg border border-gray-100 max-h-40 object-cover" />
        )}
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="self-start flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
        style={{ background: 'var(--orange)' }}
      >
        {saved ? <><Check size={14} /> บันทึกแล้ว</> : <><Save size={14} /> {saving ? 'กำลังบันทึก…' : 'บันทึก'}</>}
      </button>
    </div>
  )
}

/* ───────────── PERSON CARD CRUD (shared) ───────────── */
type PersonType = 'speaker' | 'entrepreneur'

function emptyPerson(type: PersonType) {
  return {
    name_th: '', name_en: '', role_th: '', role_en: '',
    ...(type === 'speaker' ? { org_th: '', org_en: '' } : { company_th: '', company_en: '' }),
    bio_th: '', bio_en: '', avatar_url: '', sort_order: 0,
  }
}

function PersonTab({ type, initial }: { type: PersonType; initial: any[] }) {
  const [items, setItems] = useState<any[]>(initial)
  const [editing, setEditing] = useState<any | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [uploading, setUploading] = useState(false)
  const router = useRouter()
  const apiBase = type === 'speaker' ? '/api/g2g-speakers' : '/api/g2g-entrepreneurs'
  const orgKey = type === 'speaker' ? 'org' : 'company'

  function startNew() { setEditing(emptyPerson(type)); setIsNew(true) }
  function startEdit(item: any) { setEditing({ ...item }); setIsNew(false) }
  function cancelEdit() { setEditing(null); setIsNew(false) }

  async function uploadAvatar(file: File) {
    setUploading(true)
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const { url } = await res.json()
    setEditing((p: any) => ({ ...p, avatar_url: url }))
    setUploading(false)
  }

  async function save() {
    if (isNew) {
      const res = await fetch(apiBase, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) })
      const row = await res.json()
      setItems(p => [...p, row])
    } else {
      const res = await fetch(`${apiBase}/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) })
      const row = await res.json()
      setItems(p => p.map(x => x.id === row.id ? row : x))
    }
    setEditing(null); setIsNew(false); router.refresh()
  }

  async function del(id: number) {
    if (!confirm('ยืนยันการลบ?')) return
    await fetch(`${apiBase}/${id}`, { method: 'DELETE' })
    setItems(p => p.filter(x => x.id !== id)); router.refresh()
  }

  const inp = (key: string, label: string, ta = false) => (
    <div key={key}>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {ta
        ? <textarea rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 resize-none" value={editing?.[key] ?? ''} onChange={e => setEditing((p: any) => ({ ...p, [key]: e.target.value }))} />
        : <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={editing?.[key] ?? ''} onChange={e => setEditing((p: any) => ({ ...p, [key]: e.target.value }))} />
      }
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      {!editing && (
        <button onClick={startNew} className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: 'var(--orange)' }}>
          <Plus size={13} /> เพิ่มคนใหม่
        </button>
      )}

      {editing && (
        <div className="bg-white rounded-xl border border-orange-200 p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-gray-700">{isNew ? 'เพิ่มคนใหม่' : 'แก้ไข'}</h3>
          <div className="grid grid-cols-2 gap-3">
            {inp('name_th', 'ชื่อ (TH)')}
            {inp('name_en', 'ชื่อ (EN)')}
            {inp('role_th', 'ตำแหน่ง (TH)')}
            {inp('role_en', 'ตำแหน่ง (EN)')}
            {inp(`${orgKey}_th`, type === 'speaker' ? 'หน่วยงาน (TH)' : 'บริษัท (TH)')}
            {inp(`${orgKey}_en`, type === 'speaker' ? 'หน่วยงาน (EN)' : 'บริษัท (EN)')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {inp('bio_th', 'Bio (TH)', true)}
            {inp('bio_en', 'Bio (EN)', true)}
          </div>
          <div className="flex items-center gap-3">
            {editing.avatar_url && <img src={editing.avatar_url} className="w-12 h-12 rounded-full object-cover border border-gray-200" alt="" />}
            <label className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs cursor-pointer hover:border-orange-400">
              <Upload size={12} /> {uploading ? 'กำลังอัพโหลด…' : 'อัพรูปภาพ'}
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
            </label>
            <div>
              <label className="block text-xs text-gray-500 mb-1">ลำดับ</label>
              <input type="number" className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm" value={editing.sort_order ?? 0} onChange={e => setEditing((p: any) => ({ ...p, sort_order: +e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={save} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: 'var(--orange)' }}>
              <Save size={12} /> บันทึก
            </button>
            <button onClick={cancelEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-600 hover:bg-gray-50">
              <X size={12} /> ยกเลิก
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            {item.avatar_url
              ? <img src={item.avatar_url} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />
              : <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white" style={{ background: 'var(--orange)' }}>{item.name_th?.[0]}</div>
            }
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-800">{item.name_th}</div>
              <div className="text-xs text-gray-500">{item.role_th} · {item[`${orgKey}_th`]}</div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => startEdit(item)} className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50"><Edit2 size={14} /></button>
              <button onClick={() => del(item.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {!items.length && <p className="text-sm text-gray-400 text-center py-8">ยังไม่มีข้อมูล</p>}
      </div>
    </div>
  )
}

/* ───────────── DETAIL MODAL HELPERS ───────────── */
function Section({ title, step, children }: { title: string; step: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white flex-shrink-0" style={{ background: 'var(--orange)' }}>{step}</span>
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{title}</span>
      </div>
      <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-2.5">{children}</div>
    </div>
  )
}
function Row1({ label, value, long }: { label: string; value: string; long?: boolean }) {
  return (
    <div className={long ? 'flex flex-col gap-1' : 'flex gap-3'}>
      <span className="text-xs text-gray-400 flex-shrink-0 w-44">{label}</span>
      <span className={`text-sm text-gray-800 ${long ? 'whitespace-pre-wrap' : ''}`}>{value || '—'}</span>
    </div>
  )
}
function Row2({ label, value, label2, value2 }: { label: string; value: string; label2: string; value2: string }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div><span className="text-xs text-gray-400 block">{label}</span><span className="text-sm text-gray-800">{value || '—'}</span></div>
      <div><span className="text-xs text-gray-400 block">{label2}</span><span className="text-sm text-gray-800">{value2 || '—'}</span></div>
    </div>
  )
}

/* ───────────── APPLICATIONS TAB ───────────── */
function ApplicationsTab({ initial }: { initial: Application[] }) {
  const [apps, setApps] = useState(initial)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [detail, setDetail] = useState<Application | null>(null)
  const router = useRouter()

  const filtered = apps.filter(a => {
    const name = `${a.firstname} ${a.lastname} ${a.nickname} ${a.business_name}`
    return (!search || name.toLowerCase().includes(search.toLowerCase())) &&
           (!statusFilter || a.status === statusFilter)
  })

  async function changeStatus(id: number, status: string) {
    await fetch(`/api/g2g-applications/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    setApps(p => p.map(a => a.id === id ? { ...a, status } : a))
    if (detail?.id === id) setDetail(p => p ? { ...p, status } : null)
    router.refresh()
  }

  async function del(id: number) {
    if (!confirm('ยืนยันการลบ?')) return
    await fetch(`/api/g2g-applications/${id}`, { method: 'DELETE' })
    setApps(p => p.filter(a => a.id !== id))
    if (detail?.id === id) setDetail(null)
    router.refresh()
  }

  function exportCSV() {
    const header = [
      'รุ่น',
      // P1
      'คำนำหน้า(TH)','ชื่อ(TH)','นามสกุล(TH)','ชื่อเล่น(TH)',
      'คำนำหน้า(EN)','ชื่อ(EN)','นามสกุล(EN)','ชื่อเล่น(EN)',
      'วันเกิด','เลขบัตรประชาชน','เบอร์โทร','อีเมล','Facebook','LINE ID',
      // P2
      'คำนำหน้า P2(TH)','ชื่อ P2(TH)','นามสกุล P2(TH)','ชื่อเล่น P2(TH)',
      'คำนำหน้า P2(EN)','ชื่อ P2(EN)','นามสกุล P2(EN)','ชื่อเล่น P2(EN)',
      'วันเกิด P2','เลขบัตร P2','เบอร์โทร P2','อีเมล P2','Facebook P2','LINE ID P2',
      // Business
      'ชื่อธุรกิจ/แบรนด์','ชื่อนิติบุคคล','สาขา','ที่อยู่','เลขภาษี','เบอร์ธุรกิจ',
      'ประเภทธุรกิจ','อายุธุรกิจ','รายได้ต่อปี','จำนวนพนักงาน','เว็บไซต์','ความท้าทาย',
      // Doc
      'รับเอกสารที่','ที่อยู่สำรอง',
      // Other
      'รู้จักจาก','เหตุผลที่สมัคร','ความคาดหวัง','หมายเหตุ',
      'สถานะ','วันที่สมัคร',
    ].join(',')
    const rows = filtered.map(a =>
      [
        a.batch_number,
        a.prefix, a.firstname, a.lastname, a.nickname,
        a.prefix_en, a.firstname_en, a.lastname_en, a.nickname_en,
        [a.birth_day, a.birth_month, a.birth_year].filter(Boolean).join(' '),
        a.id_card, a.phone, a.email, a.facebook, a.line_id,
        a.p2_prefix, a.p2_firstname, a.p2_lastname, a.p2_nickname,
        a.p2_prefix_en, a.p2_firstname_en, a.p2_lastname_en, a.p2_nickname_en,
        [a.p2_birth_day, a.p2_birth_month, a.p2_birth_year].filter(Boolean).join(' '),
        a.p2_id_card, a.p2_phone, a.p2_email, a.p2_facebook, a.p2_line_id,
        a.business_name, a.business_company, a.business_branch, a.business_address, a.business_taxid, a.business_phone,
        a.business_type, a.business_age, a.revenue, a.employees, a.website, a.challenges,
        a.doc_delivery, a.doc_alt_address,
        a.referral, a.reason, a.expectation, a.note,
        STATUS_LABEL[a.status] || a.status, fmtDate(a.created_at),
      ].map(v => `"${v ?? ''}"`).join(',')
    )
    const blob = new Blob(['﻿' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'g2g-applications.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <input className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-56 focus:outline-none focus:border-orange-400" placeholder="ค้นหาชื่อ / ธุรกิจ…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">ทุกสถานะ</option>
          <option value="pending">รอพิจารณา</option>
          <option value="approved">อนุมัติ</option>
          <option value="rejected">ไม่ผ่าน</option>
        </select>
        <span className="text-xs text-gray-400">{filtered.length} รายการ</span>
        <button onClick={exportCSV} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
          <Download size={12} /> Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-4 py-2 text-gray-500 font-medium">ชื่อ</th>
              <th className="text-left px-4 py-2 text-gray-500 font-medium">ธุรกิจ</th>
              <th className="text-left px-4 py-2 text-gray-500 font-medium">ติดต่อ</th>
              <th className="text-left px-4 py-2 text-gray-500 font-medium">สถานะ</th>
              <th className="text-left px-4 py-2 text-gray-500 font-medium">วันที่</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => setDetail(a)}>
                <td className="px-4 py-2.5">
                  <div className="font-medium text-gray-800 text-xs">{a.prefix}{a.firstname} {a.lastname} {a.nickname ? `(${a.nickname})` : ''}</div>
                  {a.p2_firstname && <div className="text-[10px] text-orange-500 mt-0.5">+ {a.p2_firstname} {a.p2_lastname}</div>}
                </td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{a.business_name}{a.batch_number ? <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">รุ่น {a.batch_number}</span> : null}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{a.phone || a.email}</td>
                <td className="px-4 py-2.5">
                  <select
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer ${STATUS_COLORS[a.status] || 'bg-gray-100 text-gray-600'}`}
                    value={a.status}
                    onClick={e => e.stopPropagation()}
                    onChange={e => changeStatus(a.id, e.target.value)}
                  >
                    <option value="pending">รอพิจารณา</option>
                    <option value="approved">อนุมัติ</option>
                    <option value="rejected">ไม่ผ่าน</option>
                  </select>
                </td>
                <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{fmtDate(a.created_at)}</td>
                <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                  <button onClick={() => del(a.id)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">ยังไม่มีผู้สมัคร</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <div className="font-semibold text-gray-900 text-base">{detail.prefix}{detail.firstname} {detail.lastname} {detail.nickname ? `(${detail.nickname})` : ''}</div>
                <div className="text-xs text-gray-400 mt-0.5">{detail.business_name} · สมัครเมื่อ {fmtDate(detail.created_at)}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[detail.status] || 'bg-gray-100 text-gray-500'}`}>
                  {STATUS_LABEL[detail.status]}
                </span>
                <button onClick={() => setDetail(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
              </div>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {/* Section 1: ผู้เรียนคนที่ 1 */}
              <Section title="ผู้เรียนคนที่ 1" step="1">
                <Row2 label="ชื่อ-นามสกุล (TH)" value={`${detail.prefix||''}${detail.firstname||''} ${detail.lastname||''}`} label2="ชื่อเล่น" value2={detail.nickname} />
                {(detail.firstname_en || detail.lastname_en) && (
                  <Row2 label="Name (EN)" value={`${detail.prefix_en||''}${detail.firstname_en||''} ${detail.lastname_en||''}`} label2="Nickname" value2={detail.nickname_en} />
                )}
                <Row2 label="วันเกิด" value={[detail.birth_day, detail.birth_month, detail.birth_year].filter(Boolean).join(' ') || '—'} label2="เลขบัตรประชาชน" value2={detail.id_card} />
                <Row2 label="เบอร์โทร" value={detail.phone} label2="อีเมล" value2={detail.email} />
                <Row2 label="Facebook" value={detail.facebook} label2="LINE ID" value2={detail.line_id} />
              </Section>

              {/* Section 2: ผู้เรียนคนที่ 2 (optional) */}
              {detail.p2_firstname && (
                <Section title="ผู้เรียนคนที่ 2" step="1">
                  <Row2 label="ชื่อ-นามสกุล (TH)" value={`${detail.p2_prefix||''}${detail.p2_firstname||''} ${detail.p2_lastname||''}`} label2="ชื่อเล่น" value2={detail.p2_nickname} />
                  {(detail.p2_firstname_en || detail.p2_lastname_en) && (
                    <Row2 label="Name (EN)" value={`${detail.p2_prefix_en||''}${detail.p2_firstname_en||''} ${detail.p2_lastname_en||''}`} label2="Nickname" value2={detail.p2_nickname_en} />
                  )}
                  <Row2 label="วันเกิด" value={[detail.p2_birth_day, detail.p2_birth_month, detail.p2_birth_year].filter(Boolean).join(' ') || '—'} label2="เลขบัตรประชาชน" value2={detail.p2_id_card} />
                  <Row2 label="เบอร์โทร" value={detail.p2_phone} label2="อีเมล" value2={detail.p2_email} />
                  <Row2 label="Facebook" value={detail.p2_facebook} label2="LINE ID" value2={detail.p2_line_id} />
                </Section>
              )}

              {/* Section 3: ข้อมูลธุรกิจ */}
              <Section title="ข้อมูลธุรกิจ" step="2">
                <Row2 label="ชื่อธุรกิจ / แบรนด์" value={detail.business_name} label2="ชื่อนิติบุคคล" value2={detail.business_company} />
                {(detail.business_branch || detail.business_address) && (
                  <Row2 label="สาขา" value={detail.business_branch} label2="ที่อยู่" value2={detail.business_address} />
                )}
                {(detail.business_taxid || detail.business_phone) && (
                  <Row2 label="เลขภาษี" value={detail.business_taxid} label2="เบอร์ธุรกิจ" value2={detail.business_phone} />
                )}
                <Row2 label="ประเภทธุรกิจ" value={detail.business_type} label2="อายุธุรกิจ" value2={detail.business_age} />
                <Row2 label="รายได้ต่อปี" value={detail.revenue} label2="จำนวนพนักงาน" value2={detail.employees} />
                {detail.website && <Row1 label="เว็บไซต์ / โซเชียล" value={detail.website} />}
                <Row1 label="ความท้าทายหลักของธุรกิจ" value={detail.challenges} long />
                {detail.doc_delivery && (
                  <Row2 label="รับเอกสารที่" value={detail.doc_delivery} label2="ที่อยู่สำรอง" value2={detail.doc_alt_address} />
                )}
              </Section>

              {/* Section 4: ข้อมูลอื่นๆ */}
              <Section title="ข้อมูลอื่นๆ" step="3">
                <Row1 label="รู้จัก GREAT to GROWTH จาก" value={detail.referral} />
                <Row1 label="เหตุผลที่อยากเข้าร่วม" value={detail.reason} long />
                <Row1 label="สิ่งที่คาดหวังจากโปรแกรม" value={detail.expectation} long />
                {detail.note && <Row1 label="หมายเหตุ / คำถามเพิ่มเติม" value={detail.note} long />}
              </Section>

              {/* Status actions */}
              <div className="flex gap-2 pt-1 border-t border-gray-100">
                <span className="text-xs text-gray-400 self-center mr-1">เปลี่ยนสถานะ:</span>
                {(['pending', 'approved', 'rejected'] as const).map(st => (
                  <button key={st} onClick={() => changeStatus(detail.id, st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${detail.status === st ? STATUS_COLORS[st] : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    {STATUS_LABEL[st]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────────── PAYMENTS TAB ───────────── */
type Payment = {
  id: number; application_id: number; base_amount: number; coupon_code: string | null
  discount_amount: number; wht: boolean; wht_amount: number; final_amount: number
  method: string; omise_charge_id: string | null; status: string; paid_at: string | null
  email_sent: boolean; created_at: string
  firstname?: string; lastname?: string; business_name?: string; email?: string
}

const PAY_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'รอชำระ',  color: 'bg-amber-100 text-amber-800' },
  paid:    { label: 'ชำระแล้ว', color: 'bg-green-100 text-green-800' },
  failed:  { label: 'ล้มเหลว',  color: 'bg-red-100 text-red-700' },
  expired: { label: 'หมดอายุ',  color: 'bg-gray-100 text-gray-500' },
}
const METHOD_LABEL: Record<string, string> = { card: 'บัตร', promptpay: 'PromptPay', bank: 'โอน' }

function PaymentsTab({ initial }: { initial: Payment[] }) {
  const [payments, setPayments] = useState(initial)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const router = useRouter()
  const fmt = (n: number) => Number(n).toLocaleString('th-TH')

  const filtered = payments.filter(p => {
    const name = `${p.firstname || ''} ${p.lastname || ''} ${p.business_name || ''}`
    return (!search || name.toLowerCase().includes(search.toLowerCase())) &&
           (!statusFilter || p.status === statusFilter)
  })

  async function confirmPayment(id: number) {
    if (!window.confirm('ยืนยันการชำระเงินด้วยมือ?')) return
    await fetch(`/api/g2g-payments/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'paid' }) })
    setPayments(prev => prev.map(x => x.id === id ? { ...x, status: 'paid', paid_at: new Date().toISOString() } : x))
    router.refresh()
  }

  function exportCSV() {
    const header = 'ชื่อ,ธุรกิจ,อีเมล,ราคาปกติ,ส่วนลด,หัก ณ ที่จ่าย,ยอดสุทธิ,คูปอง,วิธีชำระ,สถานะ,วันที่ชำระ'
    const rows = filtered.map(p =>
      [`${p.firstname||''} ${p.lastname||''}`, p.business_name, p.email,
       p.base_amount, p.discount_amount, p.wht ? p.wht_amount : 0, p.final_amount,
       p.coupon_code || '', METHOD_LABEL[p.method] || p.method,
       PAY_STATUS[p.status]?.label || p.status,
       p.paid_at ? new Date(p.paid_at).toLocaleDateString('th-TH') : '']
       .map(v => `"${v ?? ''}"`).join(',')
    )
    const blob = new Blob(['﻿' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'g2g-payments.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.final_amount), 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'ยอดรับรวม', value: `${fmt(totalPaid)} ฿`, color: '#1D9E75' },
          { label: 'ชำระแล้ว', value: payments.filter(p => p.status === 'paid').length, color: '#1D9E75' },
          { label: 'รอชำระ', value: payments.filter(p => p.status === 'pending').length, color: '#D97706' },
          { label: 'ล้มเหลว', value: payments.filter(p => p.status === 'failed').length, color: '#DC2626' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-xs text-gray-500 mb-1">{s.label}</div>
            <div className="text-xl font-semibold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <input className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-52 focus:outline-none focus:border-orange-400"
          placeholder="ค้นหาชื่อ / ธุรกิจ…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">ทุกสถานะ</option>
          {Object.entries(PAY_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <span className="text-xs text-gray-400">{filtered.length} รายการ</span>
        <button onClick={exportCSV} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
          <Download size={12} /> Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-xs">
          <thead><tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">ชื่อ</th>
            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">ธุรกิจ</th>
            <th className="text-right px-4 py-2.5 text-gray-500 font-medium">ยอดสุทธิ</th>
            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">คูปอง</th>
            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">WHT</th>
            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">วิธีจ่าย</th>
            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">สถานะ</th>
            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">ส่งเมล</th>
            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">วันที่</th>
            <th className="px-4 py-2.5"></th>
          </tr></thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-800">{p.firstname} {p.lastname}</td>
                <td className="px-4 py-2.5 text-gray-500">{p.business_name}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-gray-800">{fmt(p.final_amount)}</td>
                <td className="px-4 py-2.5 text-orange-600 font-mono">{p.coupon_code || '—'}</td>
                <td className="px-4 py-2.5 text-gray-500">{p.wht ? `−${fmt(p.wht_amount)}` : '—'}</td>
                <td className="px-4 py-2.5 text-gray-500">{METHOD_LABEL[p.method] || p.method}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${PAY_STATUS[p.status]?.color || 'bg-gray-100 text-gray-500'}`}>
                    {PAY_STATUS[p.status]?.label || p.status}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  {p.email_sent
                    ? <span className="text-green-600">✓</span>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">
                  {p.paid_at ? new Date(p.paid_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : fmtDate(p.created_at)}
                </td>
                <td className="px-4 py-2.5">
                  {p.status === 'pending' && (
                    <button onClick={() => confirmPayment(p.id)} className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded text-[10px] font-medium hover:bg-green-100 whitespace-nowrap">
                      <Check size={10} /> Confirm
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">ยังไม่มีรายการชำระเงิน</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ───────────── MAIN ───────────── */
export default function G2GClient({ settings, speakers, entrepreneurs, applications, alumni, team, payments, initialTab = 0 }: {
  settings: Settings; speakers: Speaker[]; entrepreneurs: Entrepreneur[]; applications: Application[]; alumni: AlumniRow[]; team: TeamRow[]; payments: Payment[]
  initialTab?: number
}) {
  const subtitle = TABS[initialTab] ?? 'GREAT to GROWTH'

  return (
    <div>
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center gap-3">
        <div>
          <h1 className="font-semibold text-gray-900">{subtitle}</h1>
          <p className="text-xs text-gray-400 mt-0.5">GREAT to GROWTH</p>
        </div>
        {initialTab === 3 && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
              ผู้สมัคร {applications.length} ราย
            </span>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              รอพิจารณา {applications.filter(a => a.status === 'pending').length}
            </span>
          </div>
        )}
      </div>

      <div className="p-6">
        {initialTab === 0 && <SettingsTab init={settings} />}
        {initialTab === 1 && <PersonTab type="speaker" initial={speakers} />}
        {initialTab === 2 && <PersonTab type="entrepreneur" initial={entrepreneurs} />}
        {initialTab === 3 && <ApplicationsTab initial={applications} />}
        {initialTab === 4 && <PaymentsTab initial={payments} />}
      </div>
    </div>
  )
}
