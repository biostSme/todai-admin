export const INSTALLMENT_BANKS = [
  { id: 'kbank', label: 'กสิกรไทย', source_type: 'installment_wlb_kbank' },
  { id: 'ktc', label: 'กรุงไทย (KTC)', source_type: 'installment_wlb_ktc' },
  { id: 'scb', label: 'ไทยพาณิชย์', source_type: 'installment_wlb_scb' },
  { id: 'first_choice', label: 'กรุงศรี เฟิร์สช้อยส์', source_type: 'installment_wlb_first_choice' },
] as const

export type InstallmentBank = typeof INSTALLMENT_BANKS[number]['id']

export function isInstallmentBank(value: unknown): value is InstallmentBank {
  return INSTALLMENT_BANKS.some(b => b.id === value)
}

export function installmentSourceType(bank: InstallmentBank): string {
  return INSTALLMENT_BANKS.find(b => b.id === bank)!.source_type
}

export function installmentBankLabel(bank: string): string {
  return INSTALLMENT_BANKS.find(b => b.id === bank)?.label || bank
}

// PLACEHOLDER — confirm against Omise Dashboard → Settings → Payment Methods → Installment, then edit here only
export const INSTALLMENT_TERMS: Record<InstallmentBank, number[]> = {
  kbank: [3, 4, 6, 10],
  ktc: [3, 4, 5, 6, 7, 8, 9, 10],
  scb: [3, 4, 6, 10],
  first_choice: [3, 4, 6, 9, 10],
}

// PLACEHOLDER fee rate passed to customer — confirm real MDR % per bank from Omise Dashboard, then edit here only
export const INSTALLMENT_FEE_RATES: Record<InstallmentBank, number> = {
  kbank: 0.0365,
  ktc: 0.0365,
  scb: 0.0365,
  first_choice: 0.0365,
}

export function installmentFeeRate(bank: InstallmentBank): number {
  return INSTALLMENT_FEE_RATES[bank] ?? 0
}
