import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getOmise, isOmiseConfigured } from '@/lib/omise'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { rows } = await db.query(`SELECT * FROM g2g_payments WHERE id=$1`, [id])
    if (!rows.length) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const p = rows[0]
    // This route is otherwise public/unauthenticated by design — without this,
    // anyone guessing a payment id could expire and replace a stranger's live QR.
    if (!p.access_token || body.access_token !== p.access_token) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 403 })
    }
    if (p.method !== 'promptpay') return NextResponse.json({ error: 'not a QR payment' }, { status: 400 })
    if (p.status === 'paid') return NextResponse.json({ error: 'already paid' }, { status: 400 })

    if (!isOmiseConfigured()) return NextResponse.json({ error: 'Omise not configured' }, { status: 503 })

    const omise = getOmise()
    const chargeSatang = Number(p.charge_amount || p.final_amount) * 100

    // Expire the old charge before issuing a new QR — otherwise the old QR stays
    // scannable on Omise's side even after we stop tracking it (we overwrite
    // omise_charge_id below), so a customer paying the stale QR would have real
    // money taken with no webhook match, leaving the payment permanently unrecorded.
    if (p.omise_charge_id) {
      await new Promise<void>((resolve) =>
        omise.charges.expire(p.omise_charge_id, () => resolve())
      )
    }

    const source = await new Promise<any>((resolve, reject) =>
      omise.sources.create(
        { amount: chargeSatang, currency: 'thb', type: 'promptpay' },
        (e: any, r: any) => e ? reject(e) : resolve(r)
      )
    )
    const charge = await new Promise<any>((resolve, reject) =>
      omise.charges.create({
        amount: chargeSatang, currency: 'thb',
        source: source.id,
        description: `G2G (renew QR) — payment #${id}`,
        return_uri: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://todai-admin.vercel.app'}/payment/complete`,
      }, (e: any, r: any) => e ? reject(e) : resolve(r))
    )

    let qrImage: string | null = null
    const qrDownloadUri = charge.source?.scannable_code?.image?.download_uri || null
    if (qrDownloadUri) {
      try {
        const basicAuth = Buffer.from(`${process.env.OMISE_SECRET_KEY}:`).toString('base64')
        const imgRes = await fetch(qrDownloadUri, { headers: { Authorization: `Basic ${basicAuth}` } })
        qrImage = `data:image/svg+xml;base64,${Buffer.from(await imgRes.text()).toString('base64')}`
      } catch { qrImage = null }
    }

    await db.query(
      `UPDATE g2g_payments SET omise_charge_id=$1, omise_source_id=$2, status='pending' WHERE id=$3`,
      [charge.id, source.id, id]
    )

    return NextResponse.json({ ok: true, qr_image: qrImage, charge_id: charge.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
