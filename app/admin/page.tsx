export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, BookOpen, Building2, PenLine, TrendingUp } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const [
    { count: leadsCount },
    { count: coursesOpen },
    { count: alumniCount },
    { count: articlesCount },
    { data: recentLeads },
    { data: openCourses },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('courses').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('alumni').select('*', { count: 'exact', head: true }),
    supabase.from('articles').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('courses').select('id,title_th,status').order('sort_order').limit(5),
  ])

  const stats = [
    { label: 'Leads ทั้งหมด', value: leadsCount ?? 0, icon: Users, color: '#FF8B1C', href: '/admin/leads' },
    { label: 'คอร์สที่เปิดรับ', value: coursesOpen ?? 0, icon: BookOpen, color: '#1D9E75', href: '/admin/courses' },
    { label: 'ศิษย์เก่า', value: alumniCount ?? 0, icon: Building2, color: '#185FA5', href: '/admin/alumni' },
    { label: 'บทความ', value: articlesCount ?? 0, icon: PenLine, color: '#9F5FDD', href: '/admin/articles' },
  ]

  const statusLabel: Record<string, { label: string; color: string }> = {
    open: { label: 'เปิดรับ', color: 'bg-green-100 text-green-800' },
    upcoming: { label: 'เร็วๆ นี้', color: 'bg-amber-100 text-amber-800' },
    closed: { label: 'ปิดแล้ว', color: 'bg-gray-100 text-gray-600' },
  }

  return (
    <div>
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
        <h1 className="font-semibold text-gray-900">Dashboard</h1>
        <span className="text-xs text-gray-400">{new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
      <div className="p-6 flex flex-col gap-6">
        <div className="grid grid-cols-4 gap-4">
          {stats.map(s => (
            <Link key={s.label} href={s.href} className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-2 hover:border-gray-200 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{s.label}</span>
                <s.icon size={16} style={{ color: s.color }} />
              </div>
              <div className="text-3xl font-semibold text-gray-900">{s.value}</div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-700">Leads ล่าสุด</h2>
              <Link href="/admin/leads" className="text-xs" style={{ color: 'var(--orange)' }}>ดูทั้งหมด →</Link>
            </div>
            <table className="w-full text-xs">
              <thead><tr className="bg-gray-50">
                <th className="text-left px-4 py-2 text-gray-500 font-medium">ชื่อ</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">ธุรกิจ</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">วันที่</th>
              </tr></thead>
              <tbody>
                {recentLeads?.map(l => (
                  <tr key={l.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{l.name}</td>
                    <td className="px-4 py-2.5 text-gray-500">{l.business}</td>
                    <td className="px-4 py-2.5 text-gray-400">{new Date(l.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</td>
                  </tr>
                ))}
                {!recentLeads?.length && <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">ยังไม่มี Leads</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-700">คอร์สทั้งหมด</h2>
              <Link href="/admin/courses" className="text-xs" style={{ color: 'var(--orange)' }}>จัดการ →</Link>
            </div>
            <table className="w-full text-xs">
              <thead><tr className="bg-gray-50">
                <th className="text-left px-4 py-2 text-gray-500 font-medium">คอร์ส</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">สถานะ</th>
              </tr></thead>
              <tbody>
                {openCourses?.map(c => (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[200px] truncate">{c.title_th}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusLabel[c.status]?.color}`}>
                        {statusLabel[c.status]?.label}
                      </span>
                    </td>
                  </tr>
                ))}
                {!openCourses?.length && <tr><td colSpan={2} className="px-4 py-6 text-center text-gray-400">ยังไม่มีคอร์ส</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
