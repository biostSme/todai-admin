@AGENTS.md

# BRANDi — ToDai Admin Panel

Admin panel สำหรับจัดการเนื้อหาเว็บไซต์ ToDai/ToDee ของ BRANDi & Companies

---

## Overview

| ส่วน | รายละเอียด |
|------|-----------|
| **Admin Panel** | Next.js App Router · TypeScript · Tailwind CSS |
| **Database** | Supabase (PostgreSQL) |
| **Storage** | Supabase Storage bucket: `media` |
| **Deploy Admin** | Vercel ← GitHub repo `karinbrandi/todai-admin` |
| **Deploy Frontend** | Vercel ← GitHub repo `karinbrandi/todai-todee` |
| **Frontend** | Static HTML SPA (`index.html`) · Fetch ข้อมูลจาก Supabase โดยตรง |

---

## Supabase

- **Project URL**: `https://ylfodtcitwktuaarsodi.supabase.co`
- **Keys**: อยู่ใน `.env.local` (ไม่ commit ขึ้น GitHub)
- **Storage bucket**: `media` (public)
  - `team/` — avatar สมาชิกทีม
  - `alumni/` — avatar ศิษย์เก่า
  - `articles/` — cover รูปบทความ
  - `courses/` — cover รูปคอร์ส
  - `corp/` — cover รูปคอร์สองค์กร
  - `misc/team-featured.jpg` — รูป Featured กล่อง NBM หน้าทีมงาน

### Tables

| Table | ใช้ใน | คอลัมน์หลัก |
|-------|-------|-------------|
| `team` | หน้าทีมงานที่ปรึกษา | `id, name_th, name_en, role_th, role_en, bio_th, bio_en, avatar_url, sort_order` |
| `alumni` | ทำเนียบศิษย์เก่า (คน) | `id, name_th, name_en, role_th, role_en, company_th, company_en, avatar_url, sort_order` |
| `alumni_companies` | ทำเนียบศิษย์เก่า (บริษัท) | `id, name_th, name_en, logo_url, sort_order` |
| `courses` | คอร์สทั่วไป | `id, title_th, title_en, category, cover_url, gradient, status, sort_order` |
| `corp_courses` | คอร์สสำหรับองค์กร | `id, title_th, title_en, category, cover_url, gradient, status, sort_order` |
| `articles` | บทความ | `id, title_th, title_en, category_th, category_en, desc_th, desc_en, body_th[], body_en[], cover_url, gradient, status, published_at` |
| `leads` | ฟอร์มสนใจจาก Frontend | `id, name, email, phone, message, created_at` |

---

## โครงสร้างไฟล์ Admin

```
app/
  admin/
    layout.tsx          — Sidebar layout
    page.tsx            — Dashboard
    team/               — จัดการทีมงาน
    alumni/             — จัดการศิษย์เก่า
    courses/            — จัดการคอร์ส
    corp/               — จัดการคอร์สองค์กร
    articles/           — จัดการบทความ
    leads/              — ดู leads
    content/            — จัดการเนื้อหาทั่วไป
    settings/           — ตั้งค่า
  login/                — Login page (Supabase Auth)
  auth/signout/         — Sign out route
lib/
  supabase/
    client.ts           — Supabase client (browser)
    server.ts           — Supabase client (server)
  resizeImage.ts        — Resize รูปก่อน upload
```

### Pattern: แต่ละ Section

```
page.tsx        → server component, fetch จาก Supabase, ส่งให้ Client
XxxClient.tsx   → client component, มี modal สำหรับ add/edit/delete
```

**ทุก page.tsx ต้องมี:**
```ts
export const dynamic = 'force-dynamic'  // ป้องกัน Vercel cache ข้อมูลเก่า
```

---

## Image Upload Pattern

ทุกการอัพโหลดรูปใช้ `resizeImage()` ก่อน upload เสมอ:

```ts
import { resizeImage } from '@/lib/resizeImage'

const resized = await resizeImage(file, 'avatar')   // 400×400px
const resized = await resizeImage(file, 'cover')    // 800×450px
const resized = await resizeImage(file, 'article')  // 1200×630px
```

Upload path รูปทั่วไป: `{folder}/{Date.now()}.jpg` + `upsert: true`
Upload path รูป fixed: `misc/team-featured.jpg` + `upsert: true`

---

## การ Deploy

ทั้ง Admin และ Frontend deploy ผ่าน **Vercel + GitHub** (auto deploy เมื่อ push)

```bash
# Push Admin
git add .
git commit -m "..."
git push https://[TOKEN]@github.com/karinbrandi/todai-admin.git main

# Push Frontend (index.html)
git push https://[TOKEN]@github.com/karinbrandi/todai-todee.git main
```

Token: GitHub → Settings → Developer settings → Personal access tokens (classic) scope: `repo`
**ลบ Token ทันทีหลังใช้**

---

## Frontend (todai-todee)

- ไฟล์: `index.html` ไฟล์เดียว (SPA)
- เก็บใน: `/Users/test/Downloads/todai-todee-TH-final.html` (local)
- Fetch ข้อมูลจาก Supabase โดยตรงผ่าน JS
- มี translations object `T` สำหรับ TH / EN / ZH
- รูปจาก Supabase Storage จะอัพเดทอัตโนมัติเมื่อ admin เปลี่ยน (ไม่ต้อง deploy ใหม่)
- แก้ text ต้องแก้ใน local file แล้ว push GitHub

---

## Supabase Storage RLS Policy

bucket `media` ต้องมี policy:
- `SELECT`: public (ทุกคนดูได้)
- `INSERT/UPDATE/DELETE`: authenticated users เท่านั้น
