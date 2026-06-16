'use client'
import { useState } from 'react'
import { Save } from 'lucide-react'

export default function SettingsClient({ settings: init }: { settings: Record<string, string> }) {
  const [form, setForm] = useState(init)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const fields = [
    { key: 'line_url', label: 'LINE OA URL', placeholder: 'https://line.me/R/ti/p/@...' },
    { key: 'facebook_url', label: 'Facebook URL', placeholder: 'https://facebook.com/...' },
    { key: 'brochure_filename', label: 'ชื่อไฟล์ Brochure PDF', placeholder: 'GREAT-to-GROWTH-Brochure.pdf' },
  ]

  return (
    <div>
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
        <h1 className="font-semibold text-gray-900">Settings</h1>
        <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-60" style={{ background: 'var(--orange)' }}>
          <Save size={13} /> {saved ? 'บันทึกแล้ว ✓' : saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>
      <div className="p-6 flex flex-col gap-4 max-w-xl">
        <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide">ลิงก์โซเชียล & ระบบ</h2>
          {fields.map(f => (
            <div key={f.key} className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">{f.label}</label>
              <input
                value={form[f.key] ?? ''} placeholder={f.placeholder}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
