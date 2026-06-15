# วิธี Setup โปรเจกต์

## 1. สร้าง Supabase Project

1. ไปที่ https://supabase.com → สมัคร/Login → New Project
2. ตั้งชื่อ project และรหัสผ่าน database
3. รอสักครู่จนระบบพร้อม

## 2. รัน SQL Schema

1. ใน Supabase Dashboard → SQL Editor
2. Copy เนื้อหาจาก `lib/supabase/schema.sql`
3. Paste แล้วกด Run

## 3. สร้าง Storage Bucket สำหรับรูปภาพ

1. ใน Supabase Dashboard → Storage → New Bucket
2. ตั้งชื่อว่า `media`
3. เลือก **Public bucket**

## 4. ตั้งค่า .env.local

เปิดไฟล์ `.env.local` แล้วใส่ค่าจาก Supabase:
- ไปที่ Settings → API
- Copy `Project URL` → วางใน `NEXT_PUBLIC_SUPABASE_URL`
- Copy `anon public` key → วางใน `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copy `service_role` key → วางใน `SUPABASE_SERVICE_ROLE_KEY`

## 5. สร้าง Admin User

1. Supabase Dashboard → Authentication → Users → Add User
2. ใส่อีเมลและรหัสผ่านของ Admin

## 6. Run โปรเจกต์

```bash
npm run dev
```

เปิด http://localhost:3000 → จะ redirect ไปหน้า Login อัตโนมัติ

## 7. Deploy บน Vercel (Optional)

1. สมัคร https://vercel.com
2. Import project จาก GitHub หรืออัปโหลดโฟลเดอร์
3. เพิ่ม Environment Variables เดียวกับ .env.local
4. Deploy
