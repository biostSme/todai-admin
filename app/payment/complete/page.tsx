export const dynamic = 'force-dynamic'

export default function PaymentCompletePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
        <h1 className="text-lg font-bold text-gray-800 mb-2">ทำรายการชำระเงินเสร็จสิ้น</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          คุณสามารถปิดหน้านี้ได้เลย ระบบจะอัปเดตสถานะการชำระเงิน<br />ในหน้าลงทะเบียนเดิมให้โดยอัตโนมัติ
        </p>
        <p className="text-gray-300 text-xs mt-6">BRANDi & Companies</p>
      </div>
    </div>
  )
}
