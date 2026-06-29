import { NextRequest, NextResponse } from 'next/server'
import { getOmise, isOmiseConfigured } from '@/lib/omise'

export const dynamic = 'force-dynamic'

/**
 * POST /api/pay-test
 * Test-only endpoint — no DB, no auth required
 * Body: { method: 'card'|'promptpay', token?: string, amount: number, description?: string }
 *
 * Returns:
 *   card      → { ok, charge_id, status, authorize_uri }
 *   promptpay → { ok, charge_id, status, qr_image }
 */
export async function POST(req: NextRequest) {
  try {
    if (!isOmiseConfigured()) {
      return NextResponse.json({ error: 'Omise keys not configured' }, { status: 503 })
    }

    const { method, token, amount = 100, description = 'Test Payment' } = await req.json()
    if (!method) return NextResponse.json({ error: 'method required' }, { status: 400 })

    const omise = getOmise()
    const amountSatang = Math.round(Number(amount) * 100)

    if (method === 'card') {
      if (!token) return NextResponse.json({ error: 'token required for card payment' }, { status: 400 })

      const charge = await new Promise<any>((resolve, reject) =>
        omise.charges.create({
          amount: amountSatang,
          currency: 'thb',
          card: token,
          description,
          capture: true,
          return_uri: `${req.nextUrl.origin}/pay-test?payment=done`,
        }, (e: any, r: any) => (e ? reject(e) : resolve(r)))
      )

      return NextResponse.json({
        ok: true,
        charge_id: charge.id,
        status: charge.status,
        authorize_uri: charge.authorize_uri || null,
        failure_message: charge.failure_message || null,
      })
    }

    if (method === 'promptpay') {
      const source = await new Promise<any>((resolve, reject) =>
        omise.sources.create(
          { amount: amountSatang, currency: 'thb', type: 'promptpay' },
          (e: any, r: any) => (e ? reject(e) : resolve(r))
        )
      )

      const charge = await new Promise<any>((resolve, reject) =>
        omise.charges.create({
          amount: amountSatang,
          currency: 'thb',
          source: source.id,
          description,
          return_uri: `${req.nextUrl.origin}/pay-test?payment=done`,
        }, (e: any, r: any) => (e ? reject(e) : resolve(r)))
      )

      const qrDownloadUri =
        charge.source?.scannable_code?.image?.download_uri ||
        charge.source?.scannable_code?.image?.uri ||
        null

      // Proxy the QR image through our server (Omise download_uri needs Basic Auth)
      let qrImage: string | null = null
      if (qrDownloadUri) {
        try {
          const basicAuth = Buffer.from(`${process.env.OMISE_SECRET_KEY}:`).toString('base64')
          const imgRes = await fetch(qrDownloadUri, {
            headers: { Authorization: `Basic ${basicAuth}` },
          })
          const svgText = await imgRes.text()
          qrImage = `data:image/svg+xml;base64,${Buffer.from(svgText).toString('base64')}`
        } catch {
          qrImage = null
        }
      }

      return NextResponse.json({
        ok: true,
        charge_id: charge.id,
        status: charge.status,
        qr_image: qrImage,
        expires_at: charge.expires_at || null,
      })
    }

    return NextResponse.json({ error: 'method must be card or promptpay' }, { status: 400 })
  } catch (err: any) {
    console.error('[pay-test]', err)
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
}
