import { notFound } from 'next/navigation'
import db from '@/lib/db'
import PayRemainingClient from './PayRemainingClient'
import { INSTALLMENT_BANKS, INSTALLMENT_TERMS, INSTALLMENT_FEE_RATES } from '@/lib/installment-config'

export const dynamic = 'force-dynamic'

export default async function PayRemainingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { rows } = await db.query(
    `SELECT p.*, a.firstname, a.lastname, a.business_name
     FROM g2g_payments p
     LEFT JOIN g2g_applications a ON a.id = p.application_id
     WHERE p.id = $1`,
    [id]
  )

  if (!rows.length) notFound()

  const p = rows[0]

  if (!p.is_deposit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-sm border border-gray-100">
          <p className="text-gray-500">การชำระเงินนี้ไม่ใช่แบบมัดจำ</p>
        </div>
      </div>
    )
  }

  if (p.remaining_status === 'paid') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">ชำระครบแล้ว</h2>
          <p className="text-gray-500 text-sm">ยอดส่วนที่เหลือถูกชำระเรียบร้อยแล้ว</p>
        </div>
      </div>
    )
  }

  // Fetch bank settings
  const { rows: settingRows } = await db.query(`SELECT key, value FROM g2g_settings`)
  const settings: Record<string, string> = {}
  settingRows.forEach((r: { key: string; value: string }) => { settings[r.key] = r.value })

  const omisePublicKey = process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY || ''

  return (
    <PayRemainingClient
      payment={{
        id: p.id,
        firstname: p.firstname || '',
        lastname: p.lastname || '',
        business_name: p.business_name || '',
        net_amount: Number(p.net_amount || p.final_amount),
        remaining_amount: Number(p.remaining_amount),
        deposit_amount: Number(p.deposit_amount || 50000),
        coupon_code: p.coupon_code || null,
        original_method: p.method,
      }}
      omisePublicKey={omisePublicKey}
      installmentConfig={{
        banks: INSTALLMENT_BANKS,
        terms: INSTALLMENT_TERMS,
        feeRates: INSTALLMENT_FEE_RATES,
      }}
      bankSettings={{
        bank_name: settings.bank_name || 'ไทยพาณิชย์',
        bank_branch: settings.bank_branch || 'สาขาถนนแจ้งวัฒนะ',
        bank_account_name: settings.bank_account_name || 'บริษัท ไบออสต์ จำกัด',
        bank_account_no: settings.bank_account_no || '324-403094-6',
      }}
    />
  )
}
