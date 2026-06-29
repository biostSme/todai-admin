'use client'
import { useState, useEffect } from 'react'

type PaymentInfo = {
  id: number
  firstname: string
  lastname: string
  business_name: string
  net_amount: number
  remaining_amount: number
  deposit_amount: number
  coupon_code: string | null
  original_method: string
}

type BankSettings = {
  bank_name: string
  bank_branch: string
  bank_account_name: string
  bank_account_no: string
}

const FEE_RATES: Record<string, number> = { card: 0.0365, promptpay: 0.0165, transfer: 0 }

export default function PayRemainingClient({
  payment, omisePublicKey, bankSettings,
}: {
  payment: PaymentInfo
  omisePublicKey: string
  bankSettings: BankSettings
}) {
  const [method, setMethod] = useState<'transfer' | 'card' | 'promptpay'>('transfer')
  const [cardToken, setCardToken] = useState<string | null>(null)
  const [cardReady, setCardReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<{ method: string; qr_image?: string; charge_amount: number } | null>(null)
  const [qrStatus, setQrStatus] = useState<'pending' | 'paid' | 'expired'>('pending')
  const [slipUrl, setSlipUrl] = useState<string | null>(null)
  const [slipStatus, setSlipStatus] = useState('')
  const [error, setError] = useState('')

  const feeRate = FEE_RATES[method] || 0
  const chargeAmount = Math.ceil(payment.remaining_amount * (1 + feeRate))
  const fmt = (n: number) => n.toLocaleString('th-TH')

  // Load Omise.js
  useEffect(() => {
    if (document.getElementById('omise-js')) return
    const s = document.createElement('script')
    s.id = 'omise-js'
    s.src = 'https://cdn.omise.co/omise.js'
    document.head.appendChild(s)
  }, [])

  // Poll QR payment
  useEffect(() => {
    if (!done || done.method !== 'promptpay') return
    let elapsed = 0
    const timer = setInterval(async () => {
      elapsed += 5
      if (elapsed > 900) { clearInterval(timer); setQrStatus('expired'); return }
      try {
        const r = await fetch(`/api/g2g-payments/${payment.id}`)
        const d = await r.json()
        if (d.remaining_status === 'paid') { clearInterval(timer); setQrStatus('paid') }
      } catch {}
    }, 5000)
    return () => clearInterval(timer)
  }, [done])

  function openCardForm() {
    const OmiseCard = (window as any).OmiseCard
    if (!OmiseCard) { alert('กำลังโหลด Omise กรุณารอสักครู่'); return }
    OmiseCard.configure({ publicKey: omisePublicKey, frameLabel: 'BRANDi · GREAT to GROWTH', submitLabel: 'บันทึกข้อมูลบัตร', currency: 'THB' })
    OmiseCard.open({
      amount: chargeAmount * 100,
      onCreateTokenSuccess: (token: string) => {
        setCardToken(token)
        setCardReady(true)
      },
      onFormClosed: () => {},
    })
  }

  async function submitPayment() {
    if (method === 'card' && !cardToken) { alert('กรุณากดกรอกข้อมูลบัตรก่อน'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/g2g-payments/${payment.id}/pay-remaining`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, token_or_source: cardToken }),
      })
      const text = await res.text()
      let d: any
      try { d = JSON.parse(text) } catch { throw new Error('API Error: ' + text.slice(0, 100)) }
      if (!res.ok) throw new Error(d.error || 'เกิดข้อผิดพลาด')

      if (d.authorize_uri && d.charge_status !== 'paid') {
        window.location.href = d.authorize_uri
        return
      }
      setDone({ method, qr_image: d.qr_image || undefined, charge_amount: d.charge_amount || chargeAmount })
    } catch (e: any) {
      setError(e.message)
      // Card tokens are single-use — never retry with a stale/possibly-consumed token
      if (method === 'card') { setCardToken(null); setCardReady(false) }
    } finally {
      setLoading(false)
    }
  }

  async function uploadSlip(file: File) {
    setSlipStatus('กำลังอัปโหลด...')
    const fd = new FormData()
    fd.append('slip', file)
    try {
      const res = await fetch(`/api/g2g-payments/${payment.id}/slip`, { method: 'POST', body: fd })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setSlipUrl(d.slip_url)
      setSlipStatus('✓ อัปโหลดสลิปเรียบร้อย — ทีมงานจะตรวจสอบและยืนยัน')
    } catch (e: any) {
      setSlipStatus('อัปโหลดไม่สำเร็จ: ' + e.message)
    }
  }

  const methodCard = (val: 'transfer' | 'card' | 'promptpay', label: string, sub: string) => (
    <button
      type="button"
      onClick={() => { setMethod(val); if (val !== 'card') { setCardToken(null); setCardReady(false) } }}
      className={`flex-1 border-2 rounded-xl p-3 text-center transition-colors ${method === val ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
    >
      <p className={`font-semibold text-sm ${method === val ? 'text-orange-600' : 'text-gray-700'}`}>{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </button>
  )

  // ── Success screen ──
  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full">
          {done.method === 'promptpay' ? (
            <>
              <h2 className="text-lg font-bold text-center text-gray-800 mb-1">สแกน QR เพื่อชำระเงิน</h2>
              <p className="text-center text-gray-500 text-sm mb-4">สแกนด้วยแอปธนาคาร · หมดอายุใน 15 นาที</p>
              {done.qr_image && (
                <div className="flex justify-center mb-4">
                  <div className="bg-white border border-gray-200 rounded-xl p-3 inline-block">
                    <img src={done.qr_image} alt="QR PromptPay" className="w-52 h-52" />
                  </div>
                </div>
              )}
              <p className="text-center font-bold text-orange-500 text-lg mb-4">฿{fmt(done.charge_amount)}</p>
              {qrStatus === 'paid' && <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center text-green-700 font-semibold">✓ ชำระเงินสำเร็จแล้ว!</div>}
              {qrStatus === 'expired' && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center text-red-600 text-sm">QR หมดอายุ กรุณาติดต่อทีมงาน</div>}
            </>
          ) : done.method === 'transfer' ? (
            <>
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🏦</div>
              <h2 className="text-lg font-bold text-center text-gray-800 mb-4">โอนเงินมาที่บัญชีด้านล่าง</h2>
              <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm space-y-2">
                <div className="flex justify-between"><span className="text-gray-500">ธนาคาร</span><span className="font-medium">{bankSettings.bank_name} · {bankSettings.bank_branch}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">ชื่อบัญชี</span><span className="font-medium">{bankSettings.bank_account_name}</span></div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">เลขบัญชี</span>
                  <span className="font-bold tracking-wide">{bankSettings.bank_account_no}
                    <button
                      onClick={() => navigator.clipboard.writeText(bankSettings.bank_account_no)}
                      className="ml-2 text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded"
                    >คัดลอก</button>
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                  <span className="text-gray-500">ยอดโอน</span>
                  <span className="font-bold text-orange-600 text-base">฿{fmt(done.charge_amount)}</span>
                </div>
              </div>
              {/* Slip upload */}
              <p className="text-sm font-medium text-gray-700 mb-2">แนบสลิปการโอน</p>
              {slipUrl
                ? <img src={slipUrl} alt="สลิป" className="w-full max-h-40 object-contain rounded-xl border border-gray-200 mb-2" />
                : (
                  <label className="block border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-orange-400 transition-colors mb-2">
                    <span className="text-sm text-gray-400">คลิกเพื่อเลือกรูปสลิป</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadSlip(e.target.files[0])} />
                  </label>
                )
              }
              {slipStatus && <p className={`text-xs mt-1 ${slipStatus.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>{slipStatus}</p>}
            </>
          ) : (
            <>
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
              <h2 className="text-lg font-bold text-center text-gray-800 mb-2">ชำระเงินสำเร็จ!</h2>
              <p className="text-center text-gray-500 text-sm">ยอดที่เหลือชำระครบแล้ว ขอบคุณครับ</p>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Payment form ──
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">GREAT to GROWTH</p>
          <h1 className="text-xl font-bold text-gray-800">ชำระยอดคงเหลือ</h1>
          <p className="text-sm text-gray-500 mt-1">{payment.firstname} {payment.lastname} · {payment.business_name}</p>
        </div>

        {/* Amount summary */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm">
          <div className="flex justify-between mb-2 text-gray-500">
            <span>ยอดสุทธิทั้งหมด</span>
            <span className="font-medium text-gray-700">฿{fmt(payment.net_amount)}</span>
          </div>
          <div className="flex justify-between mb-2 text-gray-500">
            <span>มัดจำชำระแล้ว</span>
            <span className="text-green-600 font-medium">−฿{fmt(payment.deposit_amount)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
            <span className="font-semibold text-gray-700">ยอดคงเหลือ</span>
            <span className="font-bold text-gray-800">฿{fmt(payment.remaining_amount)}</span>
          </div>
        </div>

        {/* Method selector */}
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">วิธีชำระเงิน</p>
        <div className="flex gap-2 mb-5">
          {methodCard('transfer', 'โอนธนาคาร', 'ฟรีค่าธรรมเนียม')}
          {methodCard('card', 'บัตรเครดิต', '+3.65%')}
          {methodCard('promptpay', 'QR PromptPay', '+1.65%')}
        </div>

        {/* Charge total */}
        <div className="flex justify-between items-center bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-5">
          <span className="text-sm text-gray-600">ยอดที่ชำระ</span>
          <div className="text-right">
            <span className="text-xl font-bold text-orange-500">฿{fmt(chargeAmount)}</span>
            {feeRate > 0 && <p className="text-xs text-gray-400">รวมค่า gateway {(feeRate * 100).toFixed(2)}%</p>}
          </div>
        </div>

        {/* Card form */}
        {method === 'card' && (
          <div className="mb-4">
            {cardReady ? (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
                <span>✓</span> บันทึกข้อมูลบัตรแล้ว — พร้อมชำระ
              </div>
            ) : (
              <button
                type="button"
                onClick={openCardForm}
                className="w-full border-2 border-dashed border-orange-300 rounded-xl py-3 text-sm font-medium text-orange-500 hover:border-orange-400 hover:bg-orange-50 transition-colors"
              >
                กรอกข้อมูลบัตรเครดิต / เดบิต
              </button>
            )}
          </div>
        )}

        {error && <p className="text-red-500 text-sm mb-3 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <button
          type="button"
          onClick={submitPayment}
          disabled={loading}
          className="w-full bg-orange-400 hover:bg-orange-500 disabled:opacity-60 text-white font-bold rounded-xl py-3.5 transition-colors"
        >
          {loading ? 'กำลังดำเนินการ...' : 'ชำระเงิน'}
        </button>

        <p className="text-center text-xs text-gray-400 mt-3">ชำระเงินผ่าน Omise · SSL 256-bit</p>
      </div>
    </div>
  )
}
