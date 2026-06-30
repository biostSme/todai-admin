import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { put } from '@vercel/blob'
import crypto from 'crypto'
import { sendCertificateEmail } from '@/lib/email'
// @ts-ignore
import PDFDocument from 'pdfkit'

export const dynamic = 'force-dynamic'

// POST /api/certificates — Issue certificate for enrollment
export async function POST(req: NextRequest) {
  const unauth = await requireAdmin(req)
  if (unauth) return unauth

  try {
    const { enrollment_id } = await req.json()
    if (!enrollment_id) return NextResponse.json({ error: 'enrollment_id required' }, { status: 400 })

    const { rows } = await pool.query(
      `SELECT e.id, e.user_id, u.name, u.email, cs.title as session_title, cs.start_date, cs.end_date
       FROM enrollments e
       JOIN users u ON e.user_id = u.id
       JOIN course_sessions cs ON e.session_id = cs.id
       WHERE e.id = $1 AND e.checked_in_at IS NOT NULL`,
      [enrollment_id]
    )
    const enr = rows[0]
    if (!enr) return NextResponse.json({ error: 'enrollment not found or not checked in' }, { status: 404 })

    const verify_token = crypto.randomBytes(20).toString('hex')
    const pdfBuf = await generateCertPDF(enr, verify_token)

    const blob = await put(`certificates/cert-${enrollment_id}.pdf`, pdfBuf, {
      access: 'public', contentType: 'application/pdf',
    })

    const { rows: cert } = await pool.query(
      `INSERT INTO certificates (enrollment_id, user_id, verify_token, pdf_url)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (enrollment_id) DO UPDATE SET pdf_url=$4, verify_token=$3
       RETURNING *`,
      [enrollment_id, enr.user_id, verify_token, blob.url]
    )

    await pool.query('UPDATE enrollments SET certificate_url=$1 WHERE id=$2', [blob.url, enrollment_id])

    const verifyUrl = `${process.env.NEXTAUTH_URL}/verify/${verify_token}`
    try {
      await sendCertificateEmail({
        to: enr.email, name: enr.name,
        sessionTitle: enr.session_title,
        pdfUrl: blob.url, verifyUrl,
      })
    } catch (e) { console.error('Certificate email failed:', e) }

    return NextResponse.json({ pdf_url: blob.url, verify_token, verify_url: verifyUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET /api/certificates?verify_token=xxx — Public verify
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('verify_token')
  if (!token) return NextResponse.json({ error: 'verify_token required' }, { status: 400 })

  const { rows } = await pool.query(
    `SELECT c.*, u.name, u.email, cs.title as session_title, cs.start_date
     FROM certificates c
     JOIN users u ON c.user_id = u.id
     JOIN enrollments e ON c.enrollment_id = e.id
     JOIN course_sessions cs ON e.session_id = cs.id
     WHERE c.verify_token = $1`,
    [token]
  )
  if (!rows[0]) return NextResponse.json({ valid: false }, { status: 404 })
  return NextResponse.json({ valid: true, ...rows[0] })
}

async function generateCertPDF(enr: any, verifyToken: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 60 })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const orange = '#FF8B1C'
    const navy = '#1B2559'
    const w = 841, h = 595

    // Background border
    doc.rect(20, 20, w - 40, h - 40).lineWidth(3).strokeColor(orange).stroke()
    doc.rect(28, 28, w - 56, h - 56).lineWidth(1).strokeColor(navy).stroke()

    // Header
    doc.fillColor(navy).fontSize(11).font('Helvetica').text('BRANDI & COMPANIES', 0, 60, { align: 'center', width: w })
    doc.fillColor(orange).fontSize(32).font('Helvetica-Bold').text('CERTIFICATE', 0, 78, { align: 'center', width: w })
    doc.fillColor(navy).fontSize(14).font('Helvetica').text('OF COMPLETION', 0, 118, { align: 'center', width: w })

    // Divider
    doc.moveTo(w / 2 - 150, 148).lineTo(w / 2 + 150, 148).strokeColor(orange).lineWidth(2).stroke()

    doc.fillColor('#4B5563').fontSize(12).text('นี่เป็นการรับรองว่า', 0, 165, { align: 'center', width: w })
    doc.fillColor(navy).fontSize(28).font('Helvetica-Bold').text(enr.name, 0, 188, { align: 'center', width: w })

    doc.fillColor('#4B5563').fontSize(12).font('Helvetica').text('ได้สำเร็จการอบรมหลักสูตร', 0, 228, { align: 'center', width: w })
    doc.fillColor(navy).fontSize(16).font('Helvetica-Bold').text(enr.session_title, 0, 248, { align: 'center', width: w })

    const dateStr = enr.end_date && enr.end_date !== enr.start_date
      ? `${fmtDate(enr.start_date)} – ${fmtDate(enr.end_date)}`
      : fmtDate(enr.start_date)
    doc.fillColor('#4B5563').fontSize(11).font('Helvetica').text(`วันที่ ${dateStr}`, 0, 278, { align: 'center', width: w })

    // Verify URL
    doc.moveTo(w / 2 - 150, 310).lineTo(w / 2 + 150, 310).strokeColor('#E5E7EB').lineWidth(1).stroke()
    doc.fillColor('#9CA3AF').fontSize(8).text(`ตรวจสอบความถูกต้อง: ${process.env.NEXTAUTH_URL}/verify/${verifyToken}`, 0, 318, { align: 'center', width: w })

    // Signature area
    doc.moveTo(w / 2 - 80, 380).lineTo(w / 2 + 80, 380).strokeColor(navy).lineWidth(1).stroke()
    doc.fillColor(navy).fontSize(10).font('Helvetica-Bold').text('ผู้อำนวยการหลักสูตร', 0, 386, { align: 'center', width: w })
    doc.fillColor('#6B7280').fontSize(8).font('Helvetica').text('BRANDi & Companies', 0, 400, { align: 'center', width: w })

    doc.end()
  })
}

function fmtDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
}
