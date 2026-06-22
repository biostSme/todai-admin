'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '', name: '', phone: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'เกิดข้อผิดพลาด'); setLoading(false); return }

    // Auto login after register
    const login = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, password: form.password }),
    })
    if (login.ok) router.push('/user/dashboard')
    else router.push('/user/login')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-2xl font-bold" style={{ color: 'var(--navy, #1B2559)' }}>โตได้โตดี</div>
          <p className="text-gray-500 text-sm mt-1">สร้างบัญชีใหม่</p>
        </div>
        <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
            <input required className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">อีเมล</label>
            <input type="email" required className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">เบอร์โทร</label>
            <input type="tel" className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">รหัสผ่าน</label>
            <input type="password" required minLength={8} className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            <p className="text-[10px] text-gray-400 mt-0.5">อย่างน้อย 8 ตัวอักษร</p>
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--orange, #FF8B1C)' }}>
            {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
          </button>
          <p className="text-center text-xs text-gray-500">
            มีบัญชีแล้ว? <Link href="/user/login" className="text-orange-500 font-medium">เข้าสู่ระบบ</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
