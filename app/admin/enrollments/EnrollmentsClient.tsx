'use client'
import { useState } from 'react'
import { Search, QrCode, CheckCircle, Clock, Download } from 'lucide-react'

type Enrollment = {
  id: number; qr_token: string; checked_in_at: string | null; status: string; created_at: string
  name: string; email: string; phone: string
  session_title: string; start_date: string
  total_amount: string; payment_method: string; order_status: string
}
type Session = { id: number; title: string; start_date: string }

export default function EnrollmentsClient({ enrollments, sessions }: { enrollments: Enrollment[]; sessions: Session[] }) {
  const [search, setSearch] = useState('')
  const [sessionFilter, setSessionFilter] = useState('')

  const filtered = enrollments.filter(e => {
    const q = search.toLowerCase()
    const matchSearch = !q || e.name?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q) || e.qr_token?.includes(q)
    const matchSession = !sessionFilter || e.session_title === sessions.find(s => String(s.id) === sessionFilter)?.title
    return matchSearch && matchSession
  })

  const checkedIn = filtered.filter(e => e.checked_in_at).length

  function fmt(d: string) {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function exportCSV() {
    const header = ['ชื่อ', 'อีเมล', 'โทร', 'Session', 'วันอบรม', 'จำนวนเงิน', 'วิธีชำระ', 'Check-in', 'สถานะ']
    const rows = filtered.map(e => [
      e.name, e.email, e.phone, e.session_title, fmt(e.start_date),
      e.total_amount, e.payment_method,
      e.checked_in_at ? fmt(e.checked_in_at) : 'ยังไม่ check-in', e.status
    ])
    const csv = [header, ...rows].map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `enrollments-${Date.now()}.csv`; a.click()
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">ผู้ลงทะเบียน</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} คน · Check-in แล้ว {checkedIn} คน ({filtered.length ? Math.round(checkedIn / filtered.length * 100) : 0}%)
          </p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border hover:bg-gray-50 text-gray-700">
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm"
            placeholder="ค้นหาชื่อ อีเมล หรือ QR token..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="border rounded-lg px-3 py-2 text-sm min-w-48" value={sessionFilter} onChange={e => setSessionFilter(e.target.value)}>
          <option value="">ทุก Session</option>
          {sessions.map(s => <option key={s.id} value={String(s.id)}>{s.title}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">ชื่อ / อีเมล</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Session</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">ยอดชำระ</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Check-in</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">QR Token</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">ไม่พบข้อมูล</td></tr>
            )}
            {filtered.map(e => (
              <tr key={e.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{e.name}</div>
                  <div className="text-xs text-gray-400">{e.email} · {e.phone || '-'}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-gray-700">{e.session_title}</div>
                  <div className="text-xs text-gray-400">{fmt(e.start_date)}</div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="font-medium">฿{Number(e.total_amount || 0).toLocaleString()}</div>
                  <div className="text-xs text-gray-400">{e.payment_method || '-'}</div>
                </td>
                <td className="px-4 py-3 text-center">
                  {e.checked_in_at ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircle size={13} /> {fmt(e.checked_in_at)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                      <Clock size={13} /> รอ
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <code className="text-[10px] text-gray-400 font-mono">{e.qr_token?.slice(0, 16)}…</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
