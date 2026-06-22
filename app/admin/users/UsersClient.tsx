'use client'
import { useState } from 'react'
import { Search, Shield, User } from 'lucide-react'

type UserRow = { id: number; email: string; name: string; phone: string; role: string; email_verified: boolean; created_at: string }

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  staff: 'bg-blue-100 text-blue-700',
  user: 'bg-gray-100 text-gray-600',
}

export default function UsersClient({ users }: { users: UserRow[] }) {
  const [search, setSearch] = useState('')

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
  })

  async function changeRole(id: number, role: string) {
    await fetch(`/api/users/${id}/role`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) })
    window.location.reload()
  }

  function fmt(d: string) {
    return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">ผู้ใช้งาน</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} คน</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm" placeholder="ค้นหาชื่อ อีเมล..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">ชื่อ / อีเมล</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">โทร</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Role</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">สมัครเมื่อ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="text-center py-12 text-gray-400">ไม่พบข้อมูล</td></tr>
            )}
            {filtered.map(u => (
              <tr key={u.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 flex items-center gap-1.5">
                    {u.role === 'admin' ? <Shield size={13} className="text-purple-500" /> : <User size={13} className="text-gray-400" />}
                    {u.name || '(ไม่มีชื่อ)'}
                  </div>
                  <div className="text-xs text-gray-400">{u.email}</div>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.phone || '-'}</td>
                <td className="px-4 py-3 text-center">
                  <select
                    className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer ${ROLE_STYLES[u.role]}`}
                    value={u.role}
                    onChange={e => changeRole(u.id, e.target.value)}
                  >
                    <option value="user">user</option>
                    <option value="staff">staff</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-center text-xs text-gray-500">{fmt(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
