'use client'
import { useState, useEffect } from 'react'
import { QrCode, CheckCircle, AlertCircle, Search, Users, UserCheck } from 'lucide-react'

type Session = { id: number; title: string; start_date: string }
type Attendee = {
  id: number; name: string; email: string; phone: string
  qr_token: string; checked_in_at: string | null; status: string
}

export default function CheckinClient({ sessions }: { sessions: Session[] }) {
  const [selectedSession, setSelectedSession] = useState<number | null>(null)
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [loading, setLoading] = useState(false)
  const [qrInput, setQrInput] = useState('')
  const [scanResult, setScanResult] = useState<{ ok: boolean; message: string; name?: string } | null>(null)
  const [search, setSearch] = useState('')

  async function loadAttendees(sessionId: number) {
    setLoading(true)
    const res = await fetch(`/api/checkin?session_id=${sessionId}`)
    const data = await res.json()
    setAttendees(data)
    setLoading(false)
  }

  async function doCheckin(token: string) {
    if (!token.trim()) return
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr_token: token.trim() }),
    })
    const data = await res.json()
    if (data.warning) {
      setScanResult({ ok: false, message: `⚠️ Check-in ซ้ำ: ${data.enrollment?.name || ''}` })
    } else if (data.ok) {
      setScanResult({ ok: true, message: 'Check-in สำเร็จ!', name: data.enrollment?.name })
      if (selectedSession) loadAttendees(selectedSession)
    } else {
      setScanResult({ ok: false, message: data.error || 'QR token ไม่ถูกต้อง' })
    }
    setQrInput('')
    setTimeout(() => setScanResult(null), 3000)
  }

  function fmt(d: string) {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const filtered = attendees.filter(a => {
    const q = search.toLowerCase()
    return !q || a.name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q)
  })
  const checkedIn = attendees.filter(a => a.checked_in_at).length

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">QR Check-in</h1>

      {/* Session selector */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        <label className="block text-xs text-gray-500 mb-1.5">เลือก Session</label>
        <select
          className="w-full border rounded-lg px-3 py-2 text-sm"
          value={selectedSession || ''}
          onChange={e => {
            const id = Number(e.target.value)
            setSelectedSession(id)
            if (id) loadAttendees(id)
          }}
        >
          <option value="">-- เลือก Session --</option>
          {sessions.map(s => (
            <option key={s.id} value={s.id}>
              {s.title} ({new Date(s.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })})
            </option>
          ))}
        </select>
      </div>

      {selectedSession && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <Users size={20} className="mx-auto mb-1 text-gray-400" />
              <div className="text-2xl font-bold text-gray-900">{attendees.length}</div>
              <div className="text-xs text-gray-500">ลงทะเบียนทั้งหมด</div>
            </div>
            <div className="bg-green-50 rounded-xl border border-green-100 p-4 text-center">
              <UserCheck size={20} className="mx-auto mb-1 text-green-500" />
              <div className="text-2xl font-bold text-green-700">{checkedIn}</div>
              <div className="text-xs text-green-600">Check-in แล้ว</div>
            </div>
            <div className="bg-orange-50 rounded-xl border border-orange-100 p-4 text-center">
              <QrCode size={20} className="mx-auto mb-1 text-orange-400" />
              <div className="text-2xl font-bold text-orange-700">{attendees.length - checkedIn}</div>
              <div className="text-xs text-orange-500">ยังไม่มา</div>
            </div>
          </div>

          {/* QR Scan */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-2">สแกน / วาง QR Token</label>
            <div className="flex gap-2">
              <input
                className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono"
                placeholder="วาง QR token ที่นี่..."
                value={qrInput}
                onChange={e => setQrInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doCheckin(qrInput)}
                autoFocus
              />
              <button
                onClick={() => doCheckin(qrInput)}
                className="px-4 py-2 text-sm text-white rounded-lg"
                style={{ background: 'var(--orange)' }}
              >Check-in</button>
            </div>
            {scanResult && (
              <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${scanResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {scanResult.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                {scanResult.message}{scanResult.name ? ` — ${scanResult.name}` : ''}
              </div>
            )}
          </div>

          {/* Attendee list */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="p-3 border-b">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="w-full border rounded-lg pl-8 pr-3 py-1.5 text-sm"
                  placeholder="ค้นหาชื่อ..."
                  value={search} onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
            {loading ? (
              <div className="text-center py-8 text-gray-400 text-sm">กำลังโหลด...</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">ชื่อ</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">อีเมล / โทร</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(a => (
                    <tr key={a.id} className={a.checked_in_at ? 'bg-green-50/30' : ''}>
                      <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                      <td className="px-4 py-3">
                        <div className="text-gray-600">{a.email}</div>
                        <div className="text-xs text-gray-400">{a.phone || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {a.checked_in_at ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                            <CheckCircle size={11} /> {fmt(a.checked_in_at).split(' ')[1] || 'มาแล้ว'}
                          </span>
                        ) : (
                          <button
                            onClick={() => doCheckin(a.qr_token)}
                            className="text-xs text-gray-500 border rounded-full px-2.5 py-0.5 hover:bg-gray-100"
                          >Check-in</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
