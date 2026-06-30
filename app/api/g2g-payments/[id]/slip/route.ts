import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import db from '@/lib/db'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const form = await req.formData()
    const file = form.get('slip') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
    // This endpoint is public/unauthenticated — without a strict allowlist, anyone
    // could upload an SVG with an embedded <script>, which Cloudinary serves back as
    // image/svg+xml; admin staff open slip links directly (target="_blank") to verify
    // payment proof, so that script would execute when they click it.
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'รองรับเฉพาะไฟล์ JPG, PNG, WEBP หรือ PDF เท่านั้น' }, { status: 400 })
    }
    // Deposit + remaining-balance slips share this endpoint but must not share a
    // column — otherwise uploading the remaining-balance slip overwrites (and
    // permanently loses) the original deposit's transfer proof.
    const isRemaining = form.get('type') === 'remaining'

    // This route is otherwise public/unauthenticated by design — without this,
    // anyone guessing a payment id could overwrite a stranger's slip with garbage.
    await db.query(`ALTER TABLE g2g_payments ADD COLUMN IF NOT EXISTS access_token TEXT`).catch(() => {})
    const { rows: tokenRows } = await db.query(`SELECT access_token FROM g2g_payments WHERE id=$1`, [id])
    const accessToken = form.get('access_token')
    if (!tokenRows.length) return NextResponse.json({ error: 'not found' }, { status: 404 })
    if (!tokenRows[0].access_token || accessToken !== tokenRows[0].access_token) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 403 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'todai/g2g-slips', resource_type: file.type === 'application/pdf' ? 'raw' : 'image' },
        (err, res) => err ? reject(err) : resolve(res)
      ).end(buffer)
    })

    const slip_url = result.secure_url
    if (isRemaining) {
      await db.query(`ALTER TABLE g2g_payments ADD COLUMN IF NOT EXISTS remaining_slip_url TEXT`).catch(() => {})
      await db.query(`UPDATE g2g_payments SET remaining_slip_url=$1 WHERE id=$2`, [slip_url, id])
    } else {
      await db.query(`UPDATE g2g_payments SET slip_url=$1 WHERE id=$2`, [slip_url, id])
    }

    return NextResponse.json({ ok: true, slip_url })
  } catch (err: any) {
    console.error('[slip upload]', err)
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
