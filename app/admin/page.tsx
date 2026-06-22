export const dynamic = 'force-dynamic'

import db from '@/lib/db'
import Link from 'next/link'
import {
  Users, BookOpen, Building2, PenLine, TrendingUp,
  MessageSquare, GraduationCap, Briefcase, ClipboardList, Tag
} from 'lucide-react'

export default async function DashboardPage() {
  const [
    { rows: [kpi] },
    { rows: recentLeads },
    { rows: g2gRecent },
    { rows: courses },
    { rows: corpCourses },
    { rows: sessions },
  ] = await Promise.all([
    db.query(`
      SELECT
        (SELECT COUNT(*) FROM leads) AS leads_total,
        (SELECT COUNT(*) FROM courses WHERE status='open') AS courses_open,
        (SELECT COUNT(*) FROM corp_courses WHERE status='open') AS corp_open,
        (SELECT COUNT(*) FROM alumni) AS alumni_total,
        (SELECT COUNT(*) FROM articles WHERE status='published') AS articles_total,
        (SELECT COUNT(*) FROM enrollments WHERE status='active') AS enrollments_active,
        (SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE status='paid') AS revenue_total,
        (SELECT COUNT(*) FROM orders WHERE status='paid') AS orders_paid,
        (SELECT COUNT(*) FROM orders WHERE status='pending') AS orders_pending
    `),
    db.query(`SELECT name, email, created_at FROM leads ORDER BY created_at DESC LIMIT 5`),
    db.query(`
      SELECT o.id, u.name, u.email, o.total_amount, o.status, o.created_at,
             cs.title AS session_title
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN enrollments e ON e.order_id = o.id
      LEFT JOIN course_sessions cs ON e.session_id = cs.id
      ORDER BY o.created_at DESC LIMIT 5
    `),
    db.query(`SELECT id, title_th, status FROM courses ORDER BY sort_order LIMIT 6`),
    db.query(`SELECT id, title_th, status FROM corp_courses ORDER BY sort_order LIMIT 6`),
    db.query(`
      SELECT cs.title, cs.start_date, cs.total_seats, cs.available_seats,
             COUNT(e.id) AS enrolled
      FROM course_sessions cs
      LEFT JOIN enrollments e ON e.session_id = cs.id AND e.status='active'
      WHERE cs.start_date >= NOW()
      GROUP BY cs.id
      ORDER BY cs.start_date ASC LIMIT 5
    `),
  ])

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
  }
  function fmtBaht(n: number) {
    return Number(n).toLocaleString('th-TH', { minimumFractionDigits: 0 })
  }

  const statusBadge: Record<string, string> = {
    open:      'bg-green-100 text-green-700',
    upcoming:  'bg-amber-100 text-amber-700',
    closed:    'bg-gray-100 text-gray-500',
    paid:      'bg-green-100 text-green-700',
    pending:   'bg-amber-100 text-amber-700',
    refunded:  'bg-red-100 text-red-600',
    published: 'bg-blue-100 text-blue-700',
    draft:     'bg-gray-100 text-gray-500',
  }
  const statusLabel: Record<string, string> = {
    open: 'เปิดรับ', upcoming: 'เร็วๆ นี้', closed: 'ปิด',
    paid: 'จ่ายแล้ว', pending: 'รอชำระ', refunded: 'คืนเงิน',
    published: 'เผยแพร่', draft: 'ร่าง',
  }

  const kpiCards = [
    { label: 'Leads ทั้งหมด',     value: kpi.leads_total,        icon: MessageSquare, color: '#FF8B1C', href: '/admin/leads' },
    { label: 'ผู้ลงทะเบียน',      value: kpi.enrollments_active, icon: ClipboardList, color: '#185FA5', href: '/admin/enrollments' },
    { label: 'คำสั่งซื้อสำเร็จ', value: kpi.orders_paid,        icon: TrendingUp,    color: '#1D9E75', href: '/admin/revenue' },
    { label: 'รายได้รวม (฿)',      value: fmtBaht(kpi.revenue_total), icon: Tag,        color: '#9F5FDD', href: '/admin/revenue' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-gray-900">Overview Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">ภาพรวมระบบทั้งหมด</p>
        </div>
        <span className="text-xs text-gray-400">
          {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      <div className="p-6 flex flex-col gap-6">

        {/* KPI Row */}
        <div className="grid grid-cols-4 gap-4">
          {kpiCards.map(s => (
            <Link key={s.label} href={s.href}
              className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-2 hover:border-gray-200 hover:shadow-sm transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{s.label}</span>
                <s.icon size={16} style={{ color: s.color }} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            </Link>
          ))}
        </div>

        {/* คอร์ส 2 ประเภท */}
        <div className="grid grid-cols-2 gap-4">
          {/* คอร์สผู้บริหาร */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap size={15} className="text-emerald-600" />
                <h2 className="text-sm font-medium text-gray-700">คอร์สผู้บริหาร</h2>
                <span className="text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full">{kpi.courses_open} เปิดรับ</span>
              </div>
              <Link href="/admin/courses" className="text-xs text-orange-500">จัดการ →</Link>
            </div>
            <table className="w-full text-xs">
              <tbody>
                {courses.map((c: any) => (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800 truncate max-w-[180px]">{c.title_th}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadge[c.status]}`}>
                        {statusLabel[c.status]}
                      </span>
                    </td>
                  </tr>
                ))}
                {!courses.length && <tr><td colSpan={2} className="px-4 py-6 text-center text-gray-400">ยังไม่มีคอร์ส</td></tr>}
              </tbody>
            </table>
          </div>

          {/* คอร์สองค์กร */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase size={15} className="text-blue-600" />
                <h2 className="text-sm font-medium text-gray-700">คอร์สองค์กร</h2>
                <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">{kpi.corp_open} เปิดรับ</span>
              </div>
              <Link href="/admin/corp" className="text-xs text-orange-500">จัดการ →</Link>
            </div>
            <table className="w-full text-xs">
              <tbody>
                {corpCourses.map((c: any) => (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800 truncate max-w-[180px]">{c.title_th}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadge[c.status]}`}>
                        {statusLabel[c.status]}
                      </span>
                    </td>
                  </tr>
                ))}
                {!corpCourses.length && <tr><td colSpan={2} className="px-4 py-6 text-center text-gray-400">ยังไม่มีคอร์ส</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sessions + G2G ล่าสุด */}
        <div className="grid grid-cols-2 gap-4">
          {/* Sessions ที่กำลังจะมา */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-700">รอบอบรมที่กำลังจะมา</h2>
              <Link href="/admin/sessions" className="text-xs text-orange-500">ดูทั้งหมด →</Link>
            </div>
            <table className="w-full text-xs">
              <thead><tr className="bg-gray-50">
                <th className="text-left px-4 py-2 text-gray-400 font-medium">คอร์ส</th>
                <th className="text-left px-4 py-2 text-gray-400 font-medium">วันที่</th>
                <th className="text-right px-4 py-2 text-gray-400 font-medium">ที่นั่ง</th>
              </tr></thead>
              <tbody>
                {sessions.map((s: any, i: number) => (
                  <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800 truncate max-w-[140px]">{s.title}</td>
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{fmtDate(s.start_date)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`text-xs font-medium ${Number(s.available_seats) <= 3 ? 'text-red-500' : 'text-gray-600'}`}>
                        {s.available_seats}/{s.total_seats}
                      </span>
                    </td>
                  </tr>
                ))}
                {!sessions.length && <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">ยังไม่มีรอบอบรม</td></tr>}
              </tbody>
            </table>
          </div>

          {/* G2G คำสั่งซื้อล่าสุด */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-700">Great to Growth — ล่าสุด</h2>
              <Link href="/admin/g2g" className="text-xs text-orange-500">ดูทั้งหมด →</Link>
            </div>
            <table className="w-full text-xs">
              <thead><tr className="bg-gray-50">
                <th className="text-left px-4 py-2 text-gray-400 font-medium">ชื่อ</th>
                <th className="text-right px-4 py-2 text-gray-400 font-medium">ยอด (฿)</th>
                <th className="text-right px-4 py-2 text-gray-400 font-medium">สถานะ</th>
              </tr></thead>
              <tbody>
                {g2gRecent.map((o: any) => (
                  <tr key={o.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800 truncate max-w-[120px]">{o.name || '-'}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{fmtBaht(o.total_amount)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadge[o.status]}`}>
                        {statusLabel[o.status]}
                      </span>
                    </td>
                  </tr>
                ))}
                {!g2gRecent.length && <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">ยังไม่มีคำสั่งซื้อ</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leads ล่าสุด */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-700">Leads ล่าสุด</h2>
            <Link href="/admin/leads" className="text-xs text-orange-500">ดูทั้งหมด →</Link>
          </div>
          <table className="w-full text-xs">
            <thead><tr className="bg-gray-50">
              <th className="text-left px-4 py-2 text-gray-400 font-medium">ชื่อ</th>
              <th className="text-left px-4 py-2 text-gray-400 font-medium">อีเมล</th>
              <th className="text-left px-4 py-2 text-gray-400 font-medium">วันที่</th>
            </tr></thead>
            <tbody>
              {recentLeads.map((l: any, i: number) => (
                <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{l.name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{l.email}</td>
                  <td className="px-4 py-2.5 text-gray-400">{fmtDate(l.created_at)}</td>
                </tr>
              ))}
              {!recentLeads.length && <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">ยังไม่มี Leads</td></tr>}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
