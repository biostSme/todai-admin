'use client'
import { useState } from 'react'
import { Download, Search } from 'lucide-react'

type Lead = { id: string; name: string; business: string; industry: string; size: string; contact: string; created_at: string }

export default function LeadsClient({ leads }: { leads: Lead[] }) {
  const [search, setSearch] = useState('')
  const [sizeFilter, setSizeFilter] = useState('')

  const filtered = leads.filter(l => {
    const matchSearch = !search || l.name.includes(search) || l.business.includes(search)
    const matchSize = !sizeFilter || l.size === sizeFilter
    return matchSearch && matchSize
  })

  function exportCSV() {
    const header = 'ชื่อ,ธุรกิจ,อุตสาหกรรม,ขนาดธุรกิจ,ช่องทางติดต่อ,วันที่'
    const rows = filtered.map(l =>
      [l.name, l.business, l.industry, l.size, l.contact,
        new Date(l.created_at).toLocaleDateString('th-TH')].map(v => `"${v ?? ''}"`).join(',')
    )
    const blob = new Blob(['﻿' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'leads.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const sizes = [...new Set(leads.map(l => l.size).filter(Boolean))]

  return (
    <div>
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-gray-900">Leads</h1>
          <p className="text-xs text-gray-400 mt-0.5">ผู้สนใจเข้าร่วมชุมชน {leads.length} ราย</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
          <Download size={13} /> Export CSV
        </button>
      </div>
      <div className="p-6">
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-orange-400"
              placeholder="ค้นหาชื่อ / ธุรกิจ..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 focus:outline-none"
            value={sizeFilter} onChange={e => setSizeFilter(e.target.value)}
          >
            <option value="">ทุกขนาดธุรกิจ</option>
            {sizes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-xs">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-2.5 text-gray-500 font-medium">ชื่อ</th>
              <th className="text-left px-4 py-2.5 text-gray-500 font-medium">ธุรกิจ</th>
              <th className="text-left px-4 py-2.5 text-gray-500 font-medium">อุตสาหกรรม</th>
              <th className="text-left px-4 py-2.5 text-gray-500 font-medium">ขนาดธุรกิจ</th>
              <th className="text-left px-4 py-2.5 text-gray-500 font-medium">ช่องทางติดต่อ</th>
              <th className="text-left px-4 py-2.5 text-gray-500 font-medium">วันที่</th>
            </tr></thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{l.name}</td>
                  <td className="px-4 py-2.5 text-gray-600">{l.business}</td>
                  <td className="px-4 py-2.5 text-gray-500">{l.industry || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{l.size || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{l.contact}</td>
                  <td className="px-4 py-2.5 text-gray-400">{new Date(l.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">ไม่พบข้อมูล</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
