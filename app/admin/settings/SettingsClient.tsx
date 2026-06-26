'use client'
import { useState, useRef } from 'react'
import { Save, Upload, ImageIcon } from 'lucide-react'

export default function SettingsClient({ settings: init }: { settings: Record<string, string> }) {
  const [form, setForm] = useState(init)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const execRef = useRef<HTMLInputElement>(null)
  const corpRef = useRef<HTMLInputElement>(null)

  async function save() {
    setSaving(true)
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function uploadBg(key: string, file: File) {
    setUploading(key)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', 'backgrounds')
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const { url } = await res.json()
    setUploading(null)
    if (url) {
      setForm(p => ({ ...p, [key]: url }))
      await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: url }) })
    }
  }

  const fields = [
    { key: 'line_url', label: 'LINE OA URL', placeholder: 'https://line.me/R/ti/p/@...' },
    { key: 'facebook_url', label: 'Facebook URL', placeholder: 'https://facebook.com/...' },
    { key: 'brochure_filename', label: 'ชื่อไฟล์ Brochure PDF', placeholder: 'GREAT-to-GROWTH-Brochure.pdf' },
  ]

  const BgUploadField = ({ bgKey, label, accent, ref: inputRef }: { bgKey: string; label: string; accent: string; ref: React.RefObject<HTMLInputElement | null> }) => (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-500 font-medium">{label}</label>
      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <input
            value={form[bgKey] ?? ''}
            placeholder="https://res.cloudinary.com/..."
            onChange={e => setForm(p => ({ ...p, [bgKey]: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400"
          />
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading === bgKey}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white whitespace-nowrap disabled:opacity-50"
          style={{ background: accent }}
        >
          <Upload size={12} /> {uploading === bgKey ? 'กำลังอัพโหลด…' : 'อัพโหลดรูป'}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={e => e.target.files?.[0] && uploadBg(bgKey, e.target.files[0])} />
      </div>
      {form[bgKey] && (
        <div className="relative rounded-xl overflow-hidden h-28 border border-gray-100">
          <img src={form[bgKey]} alt="preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: bgKey === 'exec_bg_url' ? 'linear-gradient(135deg,rgba(255,139,28,.7),rgba(254,212,3,.7))' : 'linear-gradient(135deg,rgba(30,107,255,.7),rgba(14,28,110,.75))' }}>
            <span className="text-white font-bold text-sm font-mono">{bgKey === 'exec_bg_url' ? 'EXECUTIVE' : 'ORGANIZATION'}</span>
          </div>
        </div>
      )}
    </div>
  )

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
        <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <ImageIcon size={14} className="text-gray-400" />
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide">รูปพื้นหลังกล่องคอร์ส (หน้าแรก)</h2>
          </div>
          <BgUploadField bgKey="exec_bg_url" label="EXECUTIVE — พื้นหลังกล่องสีส้ม" accent="#FF8B1C" ref={execRef} />
          <BgUploadField bgKey="corp_bg_url" label="ORGANIZATION — พื้นหลังกล่องสีน้ำเงิน" accent="#1E6BFF" ref={corpRef} />
        </div>
      </div>
    </div>
  )
}
