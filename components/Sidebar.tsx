'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, BookOpen, Building2,
  PenLine, Type, Settings, LogOut, UserCircle, Briefcase, TrendingUp, Tag,
  CalendarDays, ClipboardList, QrCode, MessageSquare
} from 'lucide-react'

const nav = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { label: 'ระบบลงทะเบียน', section: true },
  { href: '/admin/sessions', label: 'Course Sessions', icon: CalendarDays },
  { href: '/admin/enrollments', label: 'ผู้ลงทะเบียน', icon: ClipboardList },
  { href: '/admin/checkin', label: 'QR Check-in', icon: QrCode },
  { href: '/admin/users', label: 'ผู้ใช้งาน', icon: Users },
  { label: 'จัดการข้อมูล', section: true },
  { href: '/admin/leads', label: 'Leads (ชุมชน)', icon: Users },
  { href: '/admin/g2g', label: 'GREAT to GROWTH', icon: TrendingUp },
  { href: '/admin/coupons', label: 'คูปองส่วนลด', icon: Tag },
  { href: '/admin/courses', label: 'คอร์สเรียน', icon: BookOpen },
  { href: '/admin/corp', label: 'คอร์สองค์กร', icon: Briefcase },
  { href: '/admin/alumni', label: 'ทำเนียบศิษย์เก่า', icon: Building2 },
  { href: '/admin/team', label: 'ทีมงานที่ปรึกษา', icon: UserCircle },
  { href: '/admin/articles', label: 'บทความ', icon: PenLine },
  { label: 'ตั้งค่า', section: true },
  { href: '/admin/content', label: 'เนื้อหาเว็บ', icon: Type },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const path = usePathname()
  return (
    <aside className="w-52 flex-shrink-0 flex flex-col h-screen sticky top-0" style={{ background: 'var(--navy)' }}>
      <div className="px-4 py-4 border-b border-white/10">
        <div className="font-semibold text-white text-sm">โตได้โตดี</div>
        <div className="text-xs mt-0.5 tracking-widest uppercase" style={{ color: 'var(--muted)', fontSize: '10px' }}>Admin Panel</div>
      </div>
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto">
        {nav.map((item, i) =>
          item.section ? (
            <div key={i} className="text-[10px] uppercase tracking-widest px-2 pt-3 pb-1" style={{ color: 'var(--muted)' }}>{item.label}</div>
          ) : (
            <Link
              key={item.href}
              href={item.href!}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                path === item.href
                  ? 'text-orange-400'
                  : 'text-[#A7B0E6] hover:bg-white/5 hover:text-white'
              }`}
              style={path === item.href ? { background: 'rgba(255,139,28,0.15)' } : {}}
            >
              {item.icon && <item.icon size={15} />}
              {item.label}
            </Link>
          )
        )}
      </nav>
      <div className="px-2 py-3 border-t border-white/10">
        <form action="/auth/signout" method="post">
          <button type="submit" className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs w-full text-left" style={{ color: 'var(--muted)' }}>
            <LogOut size={14} /> ออกจากระบบ
          </button>
        </form>
      </div>
    </aside>
  )
}
