'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Plus, Trash2, Edit2, Save, X, Download, ExternalLink, Check } from 'lucide-react'

type Settings = Record<string, string>
type Speaker = { id: number; name_th: string; name_en: string; role_th: string; role_en: string; org_th: string; org_en: string; bio_th: string; bio_en: string; avatar_url: string; sort_order: number }
type Entrepreneur = { id: number; name_th: string; name_en: string; role_th: string; role_en: string; company_th: string; company_en: string; bio_th: string; bio_en: string; avatar_url: string; sort_order: number }
type Application = { id: number; prefix: string; firstname: string; lastname: string; nickname: string; phone: string; email: string; business_name: string; business_type: string; revenue: string; status: string; created_at: string }
type AlumniRow = { id: number; name_th: string; role_th: string; company_th: string; avatar_url: string; gen: string }
type TeamRow = { id: number; name_th: string; role_th: string; avatar_url: string }

const TABS = ['ตั้งค่า & โบรชัวร์', 'วิทยากรผู้เชี่ยวชาญ', 'ผู้ประกอบการตัวจริง', 'ผู้สมัคร G2G']
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
  const router = useRouter()

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
        {field('brochure_url', 'URL โบรชัวร์ (Cloudinary หรือ link ไฟล์ PDF)', 'url', 'https://...')}
        {s.brochure_url && (
          <a href={s.brochure_url} target="_blank" rel="noopener" className="flex items-center gap-1 text-xs text-orange-500 hover:underline">
            <ExternalLink size={12} /> ดูโบรชัวร์ปัจจุบัน
          </a>
        )}
        {field('line_url', 'LINE URL (ปุ่มดาวน์โหลดโบรชัวร์นำไปที่นี่)', 'url', 'https://line.me/...')}
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
    const header = 'ชื่อ,ชื่อเล่น,อีเมล,โทร,ธุรกิจ,ประเภทธุรกิจ,รายได้,สถานะ,วันที่สมัคร'
    const rows = filtered.map(a =>
      [a.prefix + a.firstname + ' ' + a.lastname, a.nickname, a.email, a.phone,
       a.business_name, a.business_type, a.revenue, STATUS_LABEL[a.status] || a.status, fmtDate(a.created_at)]
       .map(v => `"${v ?? ''}"`).join(',')
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
                <td className="px-4 py-2.5 font-medium text-gray-800">{a.prefix}{a.firstname} {a.lastname} {a.nickname ? `(${a.nickname})` : ''}</td>
                <td className="px-4 py-2.5 text-gray-500">{a.business_name}</td>
                <td className="px-4 py-2.5 text-gray-500">{a.phone || a.email}</td>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <div className="font-semibold text-gray-800">{detail.prefix}{detail.firstname} {detail.lastname}</div>
                <div className="text-xs text-gray-500">{detail.business_name} · {fmtDate(detail.created_at)}</div>
              </div>
              <button onClick={() => setDetail(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
            </div>
            <div className="p-5 flex flex-col gap-3 text-sm">
              {([
                ['ชื่อเล่น', detail.nickname],
                ['เบอร์โทร', detail.phone],
                ['อีเมล', detail.email],
                ['Facebook', (detail as any).facebook],
                ['LINE ID', (detail as any).line_id],
                ['วันเกิด', [(detail as any).birth_day, (detail as any).birth_month, (detail as any).birth_year].filter(Boolean).join(' ')],
                ['เลขบัตรประชาชน', (detail as any).id_card],
                ['ประเภทธุรกิจ', detail.business_type],
                ['อายุธุรกิจ', (detail as any).business_age],
                ['รายได้ต่อปี', detail.revenue],
                ['จำนวนพนักงาน', (detail as any).employees],
                ['เว็บไซต์', (detail as any).website],
                ['ความท้าทาย', (detail as any).challenges],
                ['รู้จักจาก', (detail as any).referral],
                ['เหตุผลที่สมัคร', (detail as any).reason],
                ['ความคาดหวัง', (detail as any).expectation],
                ['หมายเหตุ', (detail as any).note],
              ] as [string, string][]).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-gray-400 w-36 flex-shrink-0">{k}</span>
                  <span className="text-gray-800">{v}</span>
                </div>
              ))}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                {['pending', 'approved', 'rejected'].map(st => (
                  <button key={st} onClick={() => changeStatus(detail.id, st)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${detail.status === st ? STATUS_COLORS[st] : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
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

/* ───────────── MAIN ───────────── */
export default function G2GClient({ settings, speakers, entrepreneurs, applications, alumni, team }: {
  settings: Settings; speakers: Speaker[]; entrepreneurs: Entrepreneur[]; applications: Application[]; alumni: AlumniRow[]; team: TeamRow[]
}) {
  const [tab, setTab] = useState(0)

  return (
    <div>
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center gap-3">
        <div>
          <h1 className="font-semibold text-gray-900">GREAT to GROWTH</h1>
          <p className="text-xs text-gray-400 mt-0.5">จัดการข้อมูลหน้า G2G ทั้งหมด</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
            ผู้สมัคร {applications.length} ราย
          </span>
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
            รอพิจารณา {applications.filter(a => a.status === 'pending').length}
          </span>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="px-6 pt-4 flex gap-1 border-b border-gray-100 bg-white">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`px-4 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors ${tab === i ? 'border-orange-400 text-orange-500 bg-orange-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === 0 && <SettingsTab init={settings} />}
        {tab === 1 && <PersonTab type="speaker" initial={speakers} />}
        {tab === 2 && <PersonTab type="entrepreneur" initial={entrepreneurs} />}
        {tab === 3 && <ApplicationsTab initial={applications} />}
      </div>
    </div>
  )
}
