'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Users, BookOpen, Building2, PenLine,
  Settings, LogOut, UserCircle, Briefcase, TrendingUp, Tag,
  CalendarDays, ClipboardList, ChevronDown, ChevronRight,
  GraduationCap, Megaphone, BarChart2, FileText, MessageSquare,
  Mic2, Store, CreditCard, Settings2
} from 'lucide-react'

type NavItem =
  | { section: string }
  | { href: string; label: string; icon: React.ElementType; match?: string[] }
  | { group: string; icon: React.ElementType; color?: string; children: { href: string; label: string; icon: React.ElementType; match?: string[] }[] }

const nav: NavItem[] = [
  // ── Overview ──
  { href: '/admin', label: 'Overview Dashboard', icon: LayoutDashboard, match: ['/admin'] },
  { href: '/admin/leads', label: 'Leads', icon: MessageSquare },

  // ── คอร์สทั้งหมด ──
  { section: 'คอร์สทั้งหมด' },
  {
    group: 'Control Panel คอร์ส', icon: BookOpen, color: '#1D9E75',
    children: [
      { href: '/admin/courses', label: 'คอร์สผู้บริหาร', icon: GraduationCap },
      { href: '/admin/corp', label: 'คอร์สองค์กร', icon: Briefcase },
      { href: '/admin/sessions', label: 'รอบอบรม (Sessions)', icon: CalendarDays },
      { href: '/admin/coupons', label: 'คูปองส่วนลด', icon: Tag },
    ],
  },

  // ── Great to Growth ──
  { section: 'Great to Growth' },
  {
    group: 'Control Panel G2G', icon: TrendingUp, color: '#FF8B1C',
    children: [
      { href: '/admin/g2g', label: 'ตั้งค่า & โบรชัวร์', icon: Settings2, match: ['/admin/g2g'] },
      { href: '/admin/g2g/speakers', label: 'วิทยากรผู้เชี่ยวชาญ', icon: Mic2 },
      { href: '/admin/g2g/entrepreneurs', label: 'ผู้ประกอบการตัวจริง', icon: Store },
      { href: '/admin/g2g/applications', label: 'ผู้สมัคร G2G', icon: ClipboardList },
      { href: '/admin/g2g/payments', label: 'การชำระเงิน', icon: CreditCard },
      { href: '/admin/g2g/team', label: 'ทีมงาน BRANDi (G2G)', icon: UserCircle },
      { href: '/admin/alumni', label: 'ศิษย์เก่า', icon: Building2 },
    ],
  },

  // ── บทความ & Content ──
  { section: 'บทความ & Content' },
  {
    group: 'บทความ & เนื้อหาเว็บ', icon: PenLine, color: '#9F5FDD',
    children: [
      { href: '/admin/articles', label: 'บทความ', icon: FileText },
      { href: '/admin/content', label: 'เนื้อหาเว็บ', icon: Megaphone },
    ],
  },

  // ── ตั้งค่า ──
  { section: 'ระบบ' },
  { href: '/admin/users', label: 'ผู้ใช้งาน', icon: Users },
  { href: '/admin/revenue', label: 'Revenue', icon: TrendingUp },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const path = usePathname()

  const groupDefaultOpen = (children: { href: string }[]) =>
    children.some(c => path.startsWith(c.href))

  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {}
    nav.forEach(item => {
      if ('group' in item) state[item.group] = groupDefaultOpen(item.children)
    })
    return state
  })

  function toggle(group: string) {
    setOpen(prev => ({ ...prev, [group]: !prev[group] }))
  }

  function isActive(item: { href: string; match?: string[] }) {
    if (item.match) return item.match.includes(path)
    return path === item.href || path.startsWith(item.href + '/')
  }

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col h-screen sticky top-0" style={{ background: 'var(--navy)' }}>
      <div className="px-4 py-4 border-b border-white/10">
        <div className="font-semibold text-white text-sm">โตได้โตดี</div>
        <div className="text-[10px] mt-0.5 tracking-widest uppercase" style={{ color: 'var(--muted)' }}>Admin Panel</div>
      </div>

      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto">
        {nav.map((item, i) => {
          if ('section' in item) {
            return (
              <div key={i} className="text-[10px] uppercase tracking-widest px-2 pt-4 pb-1" style={{ color: 'var(--muted)' }}>
                {item.section}
              </div>
            )
          }

          if ('group' in item) {
            const isOpen = open[item.group]
            const anyChildActive = item.children.some(c => path === c.href || path.startsWith(c.href + '/'))
            return (
              <div key={i}>
                <button
                  onClick={() => toggle(item.group)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    anyChildActive ? 'text-white' : 'text-[#A7B0E6] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon size={15} style={{ color: anyChildActive ? item.color : undefined }} />
                  <span className="flex-1 text-left font-medium">{item.group}</span>
                  {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
                {isOpen && (
                  <div className="ml-3 pl-3 border-l border-white/10 mt-0.5 flex flex-col gap-0.5">
                    {item.children.map(child => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                          isActive(child)
                            ? 'text-orange-400'
                            : 'text-[#8A93C9] hover:bg-white/5 hover:text-white'
                        }`}
                        style={isActive(child) ? { background: 'rgba(255,139,28,0.12)' } : {}}
                      >
                        <child.icon size={13} />
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          // flat link
          const active = isActive(item)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                active ? 'text-orange-400' : 'text-[#A7B0E6] hover:bg-white/5 hover:text-white'
              }`}
              style={active ? { background: 'rgba(255,139,28,0.15)' } : {}}
            >
              <item.icon size={15} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-2 py-3 border-t border-white/10">
        <form action="/auth/signout" method="post">
          <button type="submit" className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs w-full text-left hover:bg-white/5 transition-colors" style={{ color: 'var(--muted)' }}>
            <LogOut size={14} /> ออกจากระบบ
          </button>
        </form>
      </div>
    </aside>
  )
}
