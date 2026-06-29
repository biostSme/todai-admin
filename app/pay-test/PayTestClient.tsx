'use client'
import { useEffect, useRef, useState } from 'react'
import { CreditCard, QrCode, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react'

declare global {
  interface Window {
    OmiseCard: any
  }
}

type Tab = 'promptpay' | 'card'
type Status = 'idle' | 'loading' | 'success' | 'error'

const OMISE_JS = 'https://cdn.omise.co/omise.js'

export default function PayTestClient() {
  const [tab, setTab] = useState<Tab>('promptpay')
  const [amount, setAmount] = useState('100')
  const [desc, setDesc] = useState('Test charge — BRANDi ToDai')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<any>(null)
  const [pubKey, setPubKey] = useState('')
  const omiseReady = useRef(false)

  // Load public key + Omise.js
  useEffect(() => {
    fetch('/api/omise-pubkey')
      .then(r => r.json())
      .then(d => {
        setPubKey(d.public_key || '')
      })

    if (!document.getElementById('omise-js')) {
      const script = document.createElement('script')
      script.id = 'omise-js'
      script.src = OMISE_JS
      script.onload = () => { omiseReady.current = true }
      document.head.appendChild(script)
    } else {
      omiseReady.current = true
    }
  }, [])

  // ─── PromptPay ─────────────────────────────────────────────
  async function handlePromptPay() {
    setStatus('loading')
    setResult(null)
    try {
      const res = await fetch('/api/pay-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'promptpay', amount: Number(amount), description: desc }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setStatus('success')
      setResult(data)
    } catch (e: any) {
      setStatus('error')
      setResult({ error: e.message })
    }
  }

  // ─── Credit Card via Omise.js ──────────────────────────────
  function handleCard() {
    if (!omiseReady.current || !window.OmiseCard) {
      alert('Omise.js ยังโหลดไม่เสร็จ กรุณารอสักครู่')
      return
    }
    setStatus('loading')
    setResult(null)

    window.OmiseCard.configure({ publicKey: pubKey })
    window.OmiseCard.open({
      amount: Math.round(Number(amount) * 100),
      currency: 'THB',
      frameLabel: 'BRANDi ToDai (Test)',
      submitLabel: 'ชำระเงิน',
      onCreateTokenSuccess: async (token: string) => {
        try {
          const res = await fetch('/api/pay-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method: 'card', token, amount: Number(amount), description: desc }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Request failed')
          setStatus('success')
          setResult(data)
          if (data.authorize_uri) {
            // 3DS redirect
            window.location.href = data.authorize_uri
          }
        } catch (e: any) {
          setStatus('error')
          setResult({ error: e.message })
        }
      },
      onFormClosed: () => {
        if (status === 'loading') setStatus('idle')
      },
    })
  }

  const isLoading = status === 'loading'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-md mb-3">
            <span className="text-2xl">💳</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ทดสอบการชำระเงิน</h1>
          <p className="text-sm text-gray-500 mt-1">Omise Test Mode — ข้อมูลจริงจะไม่ถูกเรียกเก็บ</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Amount + Desc */}
          <div className="p-6 border-b border-gray-100 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">จำนวนเงิน (บาท)</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">฿</span>
                <input
                  type="number"
                  min="20"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">คำอธิบาย</label>
              <input
                type="text"
                value={desc}
                onChange={e => setDesc(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {([['promptpay', 'QR PromptPay', QrCode], ['card', 'บัตรเครดิต', CreditCard]] as const).map(
              ([key, label, Icon]) => (
                <button
                  key={key}
                  onClick={() => { setTab(key); setStatus('idle'); setResult(null) }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors ${
                    tab === key
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={16} /> {label}
                </button>
              )
            )}
          </div>

          {/* Content */}
          <div className="p-6">

            {/* PromptPay */}
            {tab === 'promptpay' && (
              <div className="space-y-4">
                <div className="bg-purple-50 rounded-2xl p-4 text-sm text-purple-700">
                  <p className="font-medium mb-1">วิธีทดสอบ PromptPay</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-purple-600">
                    <li>กด "สร้าง QR Code" เพื่อสร้าง charge</li>
                    <li>ระบบจะแสดง QR Code จาก Omise</li>
                    <li>ใน Test mode QR นี้ไม่ตัดเงินจริง</li>
                    <li>ใช้ Omise Dashboard ยืนยัน charge</li>
                  </ol>
                </div>

                <button
                  onClick={handlePromptPay}
                  disabled={isLoading || !amount}
                  className="w-full py-3.5 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                >
                  {isLoading ? <><Loader2 size={18} className="animate-spin" /> กำลังสร้าง...</> : <><QrCode size={18} /> สร้าง QR Code</>}
                </button>

                {status === 'success' && result?.qr_image && (
                  <div className="mt-4 text-center space-y-3">
                    <p className="text-xs text-gray-500">สแกน QR ด้วยแอปธนาคาร (Test mode — ไม่ตัดเงินจริง)</p>
                    <div className="inline-block bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                      <img src={result.qr_image} alt="PromptPay QR" className="w-52 h-52 mx-auto" />
                    </div>
                    <ResultBadge label="Charge ID" value={result.charge_id} />
                    <ResultBadge label="Status" value={result.status} />
                  </div>
                )}

                {status === 'success' && !result?.qr_image && (
                  <InfoBox type="warning" message="Omise ไม่ส่ง QR Image กลับมา อาจเกิดจาก Test key ที่ใช้ไม่รองรับ PromptPay" />
                )}
              </div>
            )}

            {/* Credit Card */}
            {tab === 'card' && (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-2xl p-4 text-sm text-blue-700">
                  <p className="font-medium mb-1">บัตรทดสอบ Omise</p>
                  <div className="mt-2 space-y-1.5 text-xs text-blue-600 font-mono">
                    <div className="flex justify-between"><span>✓ Success:</span><span>4242 4242 4242 4242</span></div>
                    <div className="flex justify-between"><span>✗ Declined:</span><span>4111 1111 1111 1111</span></div>
                    <div className="flex justify-between"><span>CVV / Exp:</span><span>123 / 12/{new Date().getFullYear() + 2}</span></div>
                  </div>
                </div>

                <button
                  onClick={handleCard}
                  disabled={isLoading || !pubKey}
                  className="w-full py-3.5 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #2563eb)' }}
                >
                  {isLoading
                    ? <><Loader2 size={18} className="animate-spin" /> กำลังประมวลผล...</>
                    : <><CreditCard size={18} /> กรอกข้อมูลบัตร</>
                  }
                </button>

                {!pubKey && (
                  <InfoBox type="warning" message="โหลด Omise public key ไม่สำเร็จ ตรวจสอบ .env.local" />
                )}
              </div>
            )}

            {/* Result */}
            {status === 'success' && result && !result.qr_image && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-green-600 font-medium">
                  <CheckCircle size={18} /> ชำระเงินสำเร็จ
                </div>
                <ResultBadge label="Charge ID" value={result.charge_id} />
                <ResultBadge label="Status" value={result.status} />
                {result.authorize_uri && (
                  <a
                    href={result.authorize_uri}
                    className="block text-center py-2 px-4 rounded-xl bg-amber-50 text-amber-700 text-sm font-medium border border-amber-200"
                  >
                    ยืนยัน 3DS Authentication →
                  </a>
                )}
              </div>
            )}

            {status === 'error' && result?.error && (
              <div className="mt-4">
                <InfoBox type="error" message={result.error} />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-5 text-center">
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Omise Test Mode — ไม่มีการเรียกเก็บเงินจริง
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ResultBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="font-mono text-gray-700 font-medium">{value}</span>
    </div>
  )
}

function InfoBox({ type, message }: { type: 'warning' | 'error'; message: string }) {
  const styles = {
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    error: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <div className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${styles[type]}`}>
      {type === 'error' ? <XCircle size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
      <span>{message}</span>
    </div>
  )
}
