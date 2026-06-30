import { INSTALLMENT_FEE_RATES, InstallmentBank } from './installment-config'

export const G2G_BASE = 200_000
export const DEPOSIT_FIXED = 50_000
export const VAT_RATE = 0.07
export const WHT_RATE = 0.03
export const FEE_RATES: Record<string, number> = {
  card: 0.0365,
  promptpay: 0.0165,
  transfer: 0,
}

export interface G2GCalcInput {
  coupon_discount?: number   // fixed baht discount applied to base (server-validated)
  wht?: boolean
  method: 'card' | 'promptpay' | 'transfer' | 'installment'
  installment_bank?: InstallmentBank
  is_deposit?: boolean
}

export interface G2GCalcResult {
  base: number            // 200,000
  coupon_discount: number // e.g. 13,000
  effective_base: number  // base − coupon_discount
  vat: number             // effective_base × 7%
  gross: number           // effective_base + vat
  wht_amount: number      // effective_base × 3% (or 0)
  net: number             // gross − wht_amount  ← what customer owes
  fee_rate: number        // 0 / 0.0165 / 0.0365
  is_deposit: boolean
  charge_now: number      // 50,000 (deposit) or net (full)
  charge_with_fee: number // charge_now × (1 + fee_rate), ceil
  remaining: number       // net − 50,000 (if deposit), else 0
  remaining_with_fee: number // remaining × (1 + fee_rate), ceil
}

export function calcG2G(input: G2GCalcInput): G2GCalcResult {
  const coupon_discount = Math.min(Math.max(input.coupon_discount || 0, 0), G2G_BASE)
  const effective_base = G2G_BASE - coupon_discount
  const vat = Math.round(effective_base * VAT_RATE)
  const gross = effective_base + vat
  const wht_amount = input.wht ? Math.round(effective_base * WHT_RATE) : 0
  const net = gross - wht_amount
  const fee_rate = input.method === 'installment'
    ? (input.installment_bank ? INSTALLMENT_FEE_RATES[input.installment_bank] : 0)
    : (FEE_RATES[input.method] ?? 0)
  const is_deposit = !!input.is_deposit
  // Cap the deposit at the actual amount owed — otherwise a coupon that brings
  // net below the fixed deposit would overcharge upfront and drive `remaining` negative.
  const charge_now = is_deposit ? Math.min(DEPOSIT_FIXED, net) : net
  const charge_with_fee = Math.ceil(charge_now * (1 + fee_rate))
  const remaining = is_deposit ? Math.max(0, net - DEPOSIT_FIXED) : 0
  const remaining_with_fee = remaining > 0 ? Math.ceil(remaining * (1 + fee_rate)) : 0

  return {
    base: G2G_BASE,
    coupon_discount,
    effective_base,
    vat,
    gross,
    wht_amount,
    net,
    fee_rate,
    is_deposit,
    charge_now,
    charge_with_fee,
    remaining,
    remaining_with_fee,
  }
}
