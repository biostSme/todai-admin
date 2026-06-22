'use client'
import { signOut } from 'next-auth/react'
import { QrCode, Download, CheckCircle, Clock, Award, Calendar, MapPin, LogOut } from 'lucide-react'

type Enrollment = {
  id: number; qr_token: string; checked_in_at: string | null; certificate_url: string | null; created_at: string
  title: string; start_date: string; end_date: string; location: string
  total_amount: string; payment_method: string; order_status: string
}

export default function UserDashboardClient({ user, enrollments }: { user: any; enrollments: Enrollment[] }) {
  function fmt(d: string) {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  async function downloadQR(token: string, title: string) {
    try {
      const QRCode = (await import('qrcode')).default
      const dataUrl = await QRCode.toDataURL(token, { width: 300, margin: 2 })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `qr-${title.replace(/\s+/g, '-')}.png`
      a.click()
    } catch (e) {
      alert('ไม่สามารถสร้าง QR ได้')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="font-semibold text-gray-900" style={{ color: 'var(--navy, #1B2559)' }}>โตได้โตดี</div>
          <div className="text-xs text-gray-500">สวัสดี, {user.name || user.email}</div>
        </div>
        <button onClick={() => signOut({ callbackUrl: '/user/login' })} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-500">
          <LogOut size={14} /> ออก
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <h2 className="font-semibold text-gray-900 mt-2">คอร์สของฉัน ({enrollments.length})</h2>

        {enrollments.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
            <Calendar size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">ยังไม่มีคอร์สที่ลงทะเบียน</p>
          </div>
        )}

        {enrollments.map(e => (
          <div key={e.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-gray-900">{e.title}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Calendar size={11} />{fmt(e.start_date)}{e.end_date && e.end_date !== e.start_date ? ` – ${fmt(e.end_date)}` : ''}</span>
                    {e.location && <span className="flex items-center gap-1"><MapPin size={11} />{e.location}</span>}
                  </div>
                </div>
                {e.checked_in_at ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full shrink-0">
                    <CheckCircle size={12} /> มาแล้ว
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full shrink-0">
                    <Clock size={12} /> รอ check-in
                  </span>
                )}
              </div>
            </div>

            <div className="border-t border-gray-50 px-4 py-3 flex items-center gap-2 flex-wrap">
              {!e.checked_in_at && (
                <button
                  onClick={() => downloadQR(e.qr_token, e.title)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700"
                >
                  <QrCode size={13} /> ดาวน์โหลด QR
                </button>
              )}
              {e.certificate_url && (
                <a
                  href={e.certificate_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white"
                  style={{ background: 'var(--orange, #FF8B1C)' }}
                >
                  <Award size={13} /> ดาวน์โหลด Certificate
                </a>
              )}
              <span className="ml-auto text-xs text-gray-400">฿{Number(e.total_amount || 0).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
