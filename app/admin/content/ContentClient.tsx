'use client'
import { useState } from 'react'
import { Save } from 'lucide-react'

const CONTENT_FIELDS = [
  { section: 'หน้าแรก', fields: [
    { key: 'home_h1a', label: 'Hero — บรรทัดที่ 1', placeholder: 'วิถีใหม่ของการโต' },
    { key: 'home_h1b', label: 'Hero — บรรทัดที่ 2', placeholder: 'สำหรับ SME ไทยที่' },
    { key: 'home_sub', label: 'Hero — คำอธิบาย', placeholder: 'ชุมชนที่ชวน SME ไทย...' },
    { key: 'home_cta1', label: 'ปุ่ม CTA หลัก', placeholder: 'เข้าร่วมชุมชน' },
    { key: 'home_quote', label: 'Quote ส่วน Closing', placeholder: 'มาร่วมค้นหาวิถี...' },
  ]},
  { section: 'Core Idea', fields: [
    { key: 'core_h', label: 'หัวข้อ Core Idea', placeholder: 'การโตที่ดี ต้องโตได้ และโตดี ไปพร้อมกัน' },
    { key: 'core_p', label: 'คำอธิบาย', placeholder: 'โตได้คือความสามารถ...' },
    { key: 'dai_p', label: 'โตได้ — คำอธิบาย', placeholder: 'เติบโตอย่างมีความสามารถ...' },
    { key: 'dee_p', label: 'โตดี — คำอธิบาย', placeholder: 'เติบโตอย่างมีความหมาย...' },
  ]},
  { section: 'เกี่ยวกับเรา', fields: [
    { key: 'about_mission_h', label: 'Mission Heading', placeholder: 'ชวน SME ไทยโตด้วยวิธีคิดใหม่ทั้งระบบ' },
    { key: 'about_mission_p1', label: 'Mission ย่อหน้า 1', placeholder: '' },
    { key: 'about_mission_p2', label: 'Mission ย่อหน้า 2', placeholder: '' },
  ]},
  { section: 'เข้าร่วมชุมชน', fields: [
    { key: 'join_benefit_1', label: 'Benefit ข้อ 1', placeholder: 'มุมมองและ framework การโต...' },
    { key: 'join_benefit_2', label: 'Benefit ข้อ 2', placeholder: 'เครือข่าย SME...' },
    { key: 'join_benefit_3', label: 'Benefit ข้อ 3', placeholder: 'คอนเทนต์และกิจกรรม...' },
  ]},
  { section: 'Footer', fields: [
    { key: 'footer_desc', label: 'คำอธิบาย Footer', placeholder: 'Future-Ready SME Community...' },
  ]},
]

export default function ContentClient({ content: init }: { content: Record<string, string> }) {
  const [form, setForm] = useState(init)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    await fetch('/api/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-gray-900">เนื้อหาเว็บ</h1>
          <p className="text-xs text-gray-400 mt-0.5">แก้ข้อความที่แสดงบนเว็บหน้าบ้าน</p>
        </div>
        <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-60" style={{ background: 'var(--orange)' }}>
          <Save size={13} /> {saved ? 'บันทึกแล้ว ✓' : saving ? 'กำลังบันทึก...' : 'บันทึกทั้งหมด'}
        </button>
      </div>
      <div className="p-6 flex flex-col gap-4 max-w-2xl">
        {CONTENT_FIELDS.map(({ section, fields }) => (
          <div key={section} className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide">{section}</h2>
            {fields.map(f => (
              <div key={f.key} className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 font-medium">{f.label}</label>
                <textarea
                  rows={2} value={form[f.key] ?? ''} placeholder={f.placeholder}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 resize-none"
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
