'use client'
import { TrendingUp, ShoppingCart, Calendar, DollarSign } from 'lucide-react'

type Summary = { total_orders: string; total_revenue: string; orders_30d: string; revenue_30d: string }
type Monthly = { month: string; orders: string; revenue: string }
type SessionStat = { title: string; start_date: string; enrolled: string; capacity: number; revenue: string }
type Order = { id: number; total_amount: string; payment_method: string; paid_at: string; status: string; name: string; email: string; session_title: string }

export default function RevenueClient({ summary, monthly, sessions, recent }: {
  summary: Summary; monthly: Monthly[]; sessions: SessionStat[]; recent: Order[]
}) {
  function num(n: any) { return Number(n || 0).toLocaleString('th-TH') }
  function fmt(d: string) {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  function fmtMonth(m: string) {
    const [y, mo] = m.split('-')
    return new Date(Number(y), Number(mo) - 1).toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })
  }

  const maxRev = monthly.length ? Math.max(...monthly.map(m => Number(m.revenue))) : 1

  const STATUS_COLORS: Record<string, string> = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    failed: 'bg-red-100 text-red-600',
    refunded: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Revenue Dashboard</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'ยอดรวมทั้งหมด', value: `฿${num(summary.total_revenue)}`, sub: `${num(summary.total_orders)} คำสั่งซื้อ`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
          { label: '30 วันล่าสุด', value: `฿${num(summary.revenue_30d)}`, sub: `${num(summary.orders_30d)} คำสั่งซื้อ`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Sessions ทั้งหมด', value: String(sessions.length), sub: 'รอบอบรม', icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'ผู้ลงทะเบียน', value: String(sessions.reduce((s, r) => s + Number(r.enrolled), 0)), sub: 'คนทั้งหมด', icon: ShoppingCart, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500">{c.label}</span>
              <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center`}>
                <c.icon size={16} className={c.color} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{c.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Bar chart */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-4">รายได้รายเดือน</h2>
          {monthly.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">ยังไม่มีข้อมูล</div>
          ) : (
            <div className="flex items-end gap-2 h-40">
              {monthly.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[9px] text-gray-500">{num(m.revenue)}</div>
                  <div
                    className="w-full rounded-t-sm"
                    style={{ height: `${Math.max((Number(m.revenue) / maxRev) * 100, 4)}%`, background: 'var(--orange)' }}
                  />
                  <div className="text-[9px] text-gray-400">{fmtMonth(m.month)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Session stats */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 overflow-y-auto max-h-64">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Session Breakdown</h2>
          <div className="space-y-3">
            {sessions.map((s, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-700 truncate flex-1 mr-2">{s.title}</span>
                  <span className="text-gray-500 shrink-0">{s.enrolled}/{s.capacity}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(Number(s.enrolled) / s.capacity * 100, 100)}%`, background: 'var(--orange)' }} />
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">฿{num(s.revenue)}</div>
              </div>
            ))}
            {sessions.length === 0 && <div className="text-sm text-gray-400 text-center py-4">ยังไม่มีข้อมูล</div>}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-medium text-gray-700">คำสั่งซื้อล่าสุด</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">ชื่อ</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Session</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">ยอด</th>
              <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">วิธีชำระ</th>
              <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">สถานะ</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">วันที่</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {recent.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">ยังไม่มีคำสั่งซื้อ</td></tr>
            )}
            {recent.map(o => (
              <tr key={o.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{o.name || '-'}</div>
                  <div className="text-xs text-gray-400">{o.email}</div>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">{o.session_title || '-'}</td>
                <td className="px-4 py-3 text-right font-medium">฿{num(o.total_amount)}</td>
                <td className="px-4 py-3 text-center text-xs text-gray-500">{o.payment_method || '-'}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status] || 'bg-gray-100'}`}>{o.status}</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{fmt(o.paid_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
