import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { put } from '@vercel/blob'
// @ts-ignore
import PDFDocument from 'pdfkit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  try {
    const { invoice_id } = await req.json()
    if (!invoice_id) return NextResponse.json({ error: 'invoice_id required' }, { status: 400 })

    const { rows } = await pool.query(
      `SELECT i.*, u.name, u.email, u.phone, cs.title as session_title, cs.start_date
       FROM invoices i
       JOIN users u ON i.user_id = u.id
       LEFT JOIN orders o ON i.order_id = o.id
       LEFT JOIN course_sessions cs ON o.session_id = cs.id
       WHERE i.id = $1`,
      [invoice_id]
    )
    const inv = rows[0]
    if (!inv) return NextResponse.json({ error: 'invoice not found' }, { status: 404 })

    const pdfBuf = await generateInvoicePDF(inv)
    const blob = await put(`invoices/${inv.invoice_number}.pdf`, pdfBuf, {
      access: 'public',
      contentType: 'application/pdf',
    })

    await pool.query('UPDATE invoices SET pdf_url = $1 WHERE id = $2', [blob.url, invoice_id])
    return NextResponse.json({ pdf_url: blob.url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function generateInvoicePDF(inv: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const orange = '#FF8B1C'
    const navy = '#1B2559'
    const gray = '#6B7280'

    // Header
    doc.rect(0, 0, 595, 80).fill(navy)
    doc.fillColor('white').fontSize(22).font('Helvetica-Bold').text('BRANDI & COMPANIES', 50, 20)
    doc.fontSize(10).font('Helvetica').text('ใบกำกับภาษี / Tax Invoice', 50, 48)
    doc.fillColor('white').fontSize(9).text('เลขประจำตัวผู้เสียภาษี: 0105565011789', 350, 20)
    doc.text('123/456 ถนนสุขุมวิท กรุงเทพฯ 10110', 350, 34)
    doc.text('โทร: 02-XXX-XXXX', 350, 48)

    // Invoice number box
    doc.rect(395, 90, 150, 60).fill(orange)
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold').text('เลขที่ใบกำกับภาษี', 400, 96)
    doc.fontSize(13).text(inv.invoice_number, 400, 110)
    doc.fontSize(8).font('Helvetica').text(`วันที่: ${fmtDate(inv.issued_at)}`, 400, 130)

    // Bill to
    doc.fillColor(navy).fontSize(10).font('Helvetica-Bold').text('ออกให้แก่:', 50, 100)
    doc.fillColor('#374151').fontSize(10).font('Helvetica').text(inv.company_name || inv.name || '-', 50, 116)
    if (inv.tax_id) doc.fontSize(9).fillColor(gray).text(`เลขผู้เสียภาษี: ${inv.tax_id}`, 50, 130)
    if (inv.address) doc.fontSize(9).text(inv.address, 50, 144, { width: 280 })
    doc.fontSize(9).text(`อีเมล: ${inv.email}`, 50, 158)

    // Line
    doc.moveTo(50, 185).lineTo(545, 185).strokeColor('#E5E7EB').lineWidth(1).stroke()

    // Table header
    doc.rect(50, 192, 495, 24).fill('#F9FAFB')
    doc.fillColor(navy).fontSize(9).font('Helvetica-Bold')
    doc.text('รายการ', 58, 199)
    doc.text('ราคา (บาท)', 440, 199, { width: 90, align: 'right' })

    // Table row
    doc.fillColor('#374151').fontSize(10).font('Helvetica')
    const sessionLine = inv.session_title ? `${inv.session_title}` : 'คอร์สอบรม'
    const dateLine = inv.start_date ? ` (${fmtDate(inv.start_date)})` : ''
    doc.text(sessionLine + dateLine, 58, 228, { width: 360 })
    doc.text(num(inv.subtotal), 440, 228, { width: 90, align: 'right' })

    doc.moveTo(50, 252).lineTo(545, 252).strokeColor('#E5E7EB').stroke()

    // Totals
    let y = 262
    const addRow = (label: string, val: string, bold = false) => {
      doc.fillColor(bold ? navy : gray).fontSize(9)
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(label, 350, y)
        .fillColor(bold ? navy : '#374151')
        .text(val, 440, y, { width: 100, align: 'right' })
      y += 18
    }
    addRow('ราคาก่อน VAT:', num(inv.subtotal))
    if (Number(inv.vat) > 0) addRow('VAT 7%:', num(inv.vat))
    if (Number(inv.wht) > 0) addRow('หัก ณ ที่จ่าย 3%:', `(${num(inv.wht)})`)
    doc.moveTo(350, y).lineTo(545, y).strokeColor('#E5E7EB').stroke(); y += 6
    addRow('ยอดรวมสุทธิ:', num(inv.total), true)

    // Footer
    doc.moveTo(50, 700).lineTo(545, 700).strokeColor('#E5E7EB').stroke()
    doc.fillColor(gray).fontSize(8).text('ใบกำกับภาษีนี้ออกโดยคอมพิวเตอร์ไม่ต้องลงนาม', 50, 710, { align: 'center', width: 495 })
    doc.text(`สร้างโดยระบบ BRANDi ToDai — ${new Date().toLocaleString('th-TH')}`, 50, 722, { align: 'center', width: 495 })

    doc.end()
  })
}

function fmtDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
}
function num(n: any) {
  return Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })
}
