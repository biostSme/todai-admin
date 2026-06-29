import { NextResponse } from 'next/server'
import { INSTALLMENT_BANKS, INSTALLMENT_TERMS, INSTALLMENT_FEE_RATES } from '@/lib/installment-config'

export async function GET() {
  return NextResponse.json({
    public_key: process.env.OMISE_PUBLIC_KEY || '',
    installment_banks: INSTALLMENT_BANKS,
    installment_terms: INSTALLMENT_TERMS,
    installment_fee_rates: INSTALLMENT_FEE_RATES,
  })
}
