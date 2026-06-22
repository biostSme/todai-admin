export const dynamic = 'force-dynamic'
import pool from '@/lib/db'
import { CheckCircle, XCircle, Award } from 'lucide-react'

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const { rows } = await pool.query(
    `SELECT c.*, u.name, u.email, cs.title as session_title, cs.start_date, cs.end_date
     FROM certificates c
     JOIN users u ON c.user_id = u.id
     JOIN enrollments e ON c.enrollment_id = e.id
     JOIN course_sessions cs ON e.session_id = cs.id
     WHERE c.verify_token = $1`,
    [token]
  )
  const cert = rows[0]

  function fmt(d: string) {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {!cert ? (
          <div className="bg-white rounded-2xl border border-red-100 p-8 text-center">
            <XCircle size={48} className="mx-auto mb-4 text-red-400" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">ไม่พบ Certificate</h1>
            <p className="text-gray-500 text-sm">Token นี้ไม่ถูกต้องหรือหมดอายุแล้ว</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-green-100 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <Award size={32} className="text-green-500" />
            </div>
            <div className="flex items-center justify-center gap-2 mb-4">
              <CheckCircle size={18} className="text-green-500" />
              <span className="text-green-600 font-semibold text-sm">Certificate ถูกต้อง</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{cert.name}</h1>
            <p className="text-gray-500 text-sm mb-4">ได้สำเร็จหลักสูตร</p>
            <div className="bg-orange-50 rounded-xl px-4 py-3 mb-4">
              <div className="font-semibold text-gray-900">{cert.session_title}</div>
              <div className="text-sm text-gray-500 mt-0.5">
                {fmt(cert.start_date)}{cert.end_date && cert.end_date !== cert.start_date ? ` – ${fmt(cert.end_date)}` : ''}
              </div>
            </div>
            <p className="text-xs text-gray-400">ออกโดย BRANDi & Companies · {fmt(cert.issued_at)}</p>
            {cert.pdf_url && (
              <a href={cert.pdf_url} target="_blank" rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white"
                style={{ background: 'var(--orange, #FF8B1C)' }}>
                <Award size={15} /> ดาวน์โหลด Certificate PDF
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
