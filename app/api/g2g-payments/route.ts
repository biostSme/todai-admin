import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getOmise, isOmiseConfigured } from '@/lib/omise'

export async function GET() {
  const { rows } = await db.query(
    `SELECT p.*, a.firstname, a.lastname, a.business_name, a.email
     FROM g2g_payments p
     LEFT JOIN g2g_applications a ON a.id = p.application_id
     ORDER BY p.created_at DESC`
  )
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const d = await req.json()
  // d: { application_id, base_amount, coupon_code, discount_amount, wht, wht_amount, final_amount, method, token_or_source }

  // Validate coupon usage count if coupon provided
  if (d.coupon_code) {
    await db.query(
      `UPDATE coupons SET used_count = used_count + 1 WHERE code=$1`,
      [d.coupon_code]
    )
  }

  const finalAmountSatang = Math.round(Number(d.final_amount) * 100)

  let chargeId: string | null = null
  let sourceId: string | null = null
  let chargeStatus = 'pending'
  let qrImage: string | null = null
  let chargeAuthorizeUri: string | null = null

  if (!isOmiseConfigured()) {
    // Dev mode — skip Omise
    console.warn('Omise not configured — creating mock payment')
  } else {
    const omise = getOmise()

    if (d.method === 'card') {
      // Token-based charge
      const charge = await new Promise<any>((resolve, reject) =>
        omise.charges.create({
          amount: finalAmountSatang,
          currency: 'thb',
          card: d.token_or_source,
          description: `G2G รุ่น ${d.batch_number} — ${d.applicant_name}`,
          metadata: { application_id: d.application_id },
          capture: true,
        }, (err: any, res: any) => err ? reject(err) : resolve(res))
      )
      chargeId = charge.id
      chargeStatus = charge.status === 'successful' ? 'paid' : charge.status
    } else if (d.method === 'promptpay') {
      const source = await new Promise<any>((resolve, reject) =>
        omise.sources.create({
          amount: finalAmountSatang,
          currency: 'thb',
          type: 'promptpay',
        }, (err: any, res: any) => err ? reject(err) : resolve(res))
      )
      sourceId = source.id
      const charge = await new Promise<any>((resolve, reject) =>
        omise.charges.create({
          amount: finalAmountSatang,
          currency: 'thb',
          source: sourceId,
          description: `G2G รุ่น ${d.batch_number} — ${d.applicant_name}`,
          metadata: { application_id: d.application_id },
          return_uri: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://todai-admin.vercel.app'}/payment/complete`,
        }, (err: any, res: any) => err ? reject(err) : resolve(res))
      )
      chargeId = charge.id
      chargeStatus = charge.status
      chargeAuthorizeUri = charge.authorize_uri || null

      // Proxy QR image — download_uri requires Omise Basic Auth, browsers can't load it directly
      const qrDownloadUri = charge.source?.scannable_code?.image?.download_uri || null
      if (qrDownloadUri) {
        try {
          const basicAuth = Buffer.from(`${process.env.OMISE_SECRET_KEY}:`).toString('base64')
          const imgRes = await fetch(qrDownloadUri, { headers: { Authorization: `Basic ${basicAuth}` } })
          const svgText = await imgRes.text()
          qrImage = `data:image/svg+xml;base64,${Buffer.from(svgText).toString('base64')}`
        } catch { qrImage = null }
      }
    }
  }

  const { rows } = await db.query(
    `INSERT INTO g2g_payments
     (application_id, base_amount, coupon_code, discount_amount, wht, wht_amount, final_amount, method, omise_charge_id, omise_source_id, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [d.application_id, d.base_amount, d.coupon_code || null, d.discount_amount || 0,
     d.wht || false, d.wht_amount || 0, d.final_amount,
     d.method, chargeId, sourceId, chargeStatus]
  )

  return NextResponse.json({
    payment: rows[0],
    qr_image: qrImage,
    authorize_uri: chargeAuthorizeUri,
    charge_status: chargeStatus,
  })
}
