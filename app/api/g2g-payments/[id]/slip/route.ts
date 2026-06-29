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

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'todai/g2g-slips', resource_type: 'auto' },
        (err, res) => err ? reject(err) : resolve(res)
      ).end(buffer)
    })

    const slip_url = result.secure_url
    await db.query(`UPDATE g2g_payments SET slip_url=$1 WHERE id=$2`, [slip_url, id])

    return NextResponse.json({ ok: true, slip_url })
  } catch (err: any) {
    console.error('[slip upload]', err)
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
