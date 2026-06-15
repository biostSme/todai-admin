'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
      setLoading(false)
    } else {
      router.push('/admin')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--navy)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">โตได้โตดี</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Admin Panel</p>
        </div>
        <form onSubmit={handleLogin} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-white/60">อีเมล</label>
            <input
              type="email" required value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm bg-white/10 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-orange-400"
              placeholder="admin@brandi.co.th"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-white/60">รหัสผ่าน</label>
            <input
              type="password" required value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm bg-white/10 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-orange-400"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-[#010C4A] transition-opacity disabled:opacity-60"
            style={{ background: 'linear-gradient(90deg,#FF8B1C,#FED403)' }}
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  )
}
