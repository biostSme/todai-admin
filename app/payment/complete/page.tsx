export const dynamic = 'force-dynamic'

// Omise lands the customer here after 3D Secure / bank authentication — by then the
// original registration tab is gone (it was a same-tab redirect, not a popup), so this
// page must stand on its own: confirm what happened and give a real way back to the site.
export default function PaymentCompletePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
        <h1 className="text-lg font-bold text-gray-800 mb-2">ยืนยันการชำระเงินกับธนาคารเสร็จสิ้น</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          ระบบกำลังตรวจสอบผลการชำระเงินของคุณ หากสำเร็จ เราจะส่งอีเมลยืนยันพร้อมรายละเอียดการลงทะเบียนให้ภายในไม่กี่นาที
        </p>
        <a
          href="https://todai-frontend.vercel.app/#g2g"
          className="mt-6 inline-block w-full py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: 'var(--orange, #FF8B1C)' }}
        >
          กลับสู่หน้า GREAT to GROWTH
        </a>
        <p className="text-gray-400 text-xs mt-4">
          หากไม่ได้รับอีเมลภายใน 15 นาที ติดต่อ Line: @todaitodee หรืออีเมล info@brandi.co
        </p>
        <p className="text-gray-300 text-xs mt-6">BRANDi & Companies</p>
      </div>
    </div>
  )
}
