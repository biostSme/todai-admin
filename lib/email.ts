import nodemailer from 'nodemailer'

export function isEmailConfigured() {
  return !!(process.env.EMAIL_FROM && process.env.EMAIL_PASS)
}

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '465'),
    secure: true,
    auth: {
      user: process.env.EMAIL_FROM,
      pass: process.env.EMAIL_PASS,
    },
  })
}

export type PaymentEmailData = {
  to: string
  applicantName: string
  businessName: string
  batchNumber: string
  baseAmount: number
  discountAmount: number
  wht: boolean
  whtAmount: number
  finalAmount: number
  couponCode?: string
  method: string
  paymentId: number
  paidAt: string
}

export async function sendPaymentConfirmationEmail(data: PaymentEmailData) {
  if (!isEmailConfigured()) {
    console.warn('Email not configured — skipping send')
    return
  }

  const methodLabel = data.method === 'card' ? 'บัตรเครดิต/เดบิต' : 'PromptPay QR'
  const fmt = (n: number) => n.toLocaleString('th-TH')

  const html = `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ยืนยันการลงทะเบียน GREAT to GROWTH</title></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 0">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">

  <!-- Header -->
  <tr><td style="background:linear-gradient(125deg,#010C4A,#0E1C6E);padding:32px 40px;text-align:center">
    <div style="color:#FED403;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px">GREAT to GROWTH · Masterclass #${data.batchNumber}</div>
    <div style="color:#fff;font-size:22px;font-weight:700">ยืนยันการชำระเงินเรียบร้อยแล้ว ✓</div>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:36px 40px">
    <p style="color:#374151;font-size:15px;margin:0 0 24px">สวัสดีคุณ <strong>${data.applicantName}</strong></p>
    <p style="color:#6B7280;font-size:14px;margin:0 0 28px;line-height:1.7">
      เราได้รับการชำระเงินของคุณเรียบร้อยแล้ว ขอบคุณที่สมัครเข้าร่วมโปรแกรม GREAT to GROWTH
      ทีมงานจะติดต่อกลับเพื่อยืนยันข้อมูลเพิ่มเติมและรายละเอียดโปรแกรมภายใน 2–3 วันทำการ
    </p>

    <!-- Receipt Box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;margin-bottom:28px">
      <tr><td style="padding:20px 24px">
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9CA3AF;margin-bottom:16px">รายละเอียดการชำระเงิน</div>
        ${row('ชื่อ-นามสกุล', data.applicantName)}
        ${row('ชื่อธุรกิจ', data.businessName)}
        ${row('โปรแกรม', `GREAT to GROWTH รุ่นที่ ${data.batchNumber}`)}
        ${row('ราคาปกติ', `${fmt(data.baseAmount)} บาท`)}
        ${data.discountAmount > 0 ? row('ส่วนลด' + (data.couponCode ? ` (${data.couponCode})` : ''), `− ${fmt(data.discountAmount)} บาท`, '#16A34A') : ''}
        ${data.wht ? row('หัก ณ ที่จ่าย 3%', `− ${fmt(data.whtAmount)} บาท`, '#2563EB') : ''}
        <tr><td colspan="2" style="padding:8px 0 0"><div style="border-top:1px solid #e5e7eb;margin:4px 0"></div></td></tr>
        ${row('ยอดที่ชำระ', `<strong style="color:#010C4A;font-size:16px">${fmt(data.finalAmount)} บาท</strong>`)}
        ${row('ช่องทาง', methodLabel)}
        ${row('เลขที่ใบเสร็จ', `#${String(data.paymentId).padStart(5, '0')}`)}
        ${row('วันที่ชำระ', data.paidAt)}
      </td></tr>
    </table>

    ${data.wht ? `
    <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:16px 20px;margin-bottom:28px;font-size:13px;color:#1E40AF;line-height:1.6">
      <strong>ข้อมูลสำหรับหัก ณ ที่จ่าย</strong><br>
      กรุณาออกหนังสือรับรองการหัก ณ ที่จ่าย 3% (${fmt(data.whtAmount)} บาท) นำส่งสรรพากรและส่งสำเนามาที่<br>
      <strong>info@brandi.co</strong> หรือ Line: @todaitodee
    </div>` : ''}

    <div style="text-align:center;margin-top:8px">
      <a href="https://todai-frontend.vercel.app/#g2g" style="display:inline-block;background:linear-gradient(125deg,#FF6A00,#FF8B1C,#FED403);color:#010C4A;font-weight:700;font-size:14px;padding:12px 28px;border-radius:100px;text-decoration:none">กลับสู่หน้า GREAT to GROWTH</a>
    </div>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:20px 40px;text-align:center">
    <p style="color:#9CA3AF;font-size:12px;margin:0">BRANDi & Companies · <a href="mailto:info@brandi.co" style="color:#FF8B1C">info@brandi.co</a> · Line: @todaitodee</p>
    <p style="color:#D1D5DB;font-size:11px;margin:6px 0 0">อีเมลนี้ส่งอัตโนมัติ กรุณาอย่าตอบกลับโดยตรง</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

  await getTransport().sendMail({
    from: `"โตได้โตดี × BRANDi" <${process.env.EMAIL_FROM}>`,
    to: data.to,
    subject: `✅ ยืนยันการชำระเงิน GREAT to GROWTH รุ่นที่ ${data.batchNumber} — ${data.applicantName}`,
    html,
  })
}

function row(label: string, value: string, color = '#374151') {
  return `<tr>
    <td style="padding:5px 0;color:#9CA3AF;font-size:13px;width:44%">${label}</td>
    <td style="padding:5px 0;color:${color};font-size:13px;text-align:right">${value}</td>
  </tr>`
}
