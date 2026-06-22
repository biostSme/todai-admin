'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await signIn('credentials', { ...form, redirect: false })
    if (res?.ok) {
      router.push('/user/dashboard')
    } else {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-2xl font-bold" style={{ color: 'var(--navy, #1B2559)' }}>โตได้โตดี</div>
          <p className="text-gray-500 text-sm mt-1">เข้าสู่ระบบสมาชิก</p>
        </div>
        <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">อีเมล</label>
            <input
              type="email" required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': 'var(--orange, #FF8B1C)' } as any}
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">รหัสผ่าน</label>
            <input
              type="password" required
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--orange, #FF8B1C)' }}
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
          <p className="text-center text-xs text-gray-500">
            ยังไม่มีบัญชี? <Link href="/user/register" className="text-orange-500 font-medium">สมัครสมาชิก</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
