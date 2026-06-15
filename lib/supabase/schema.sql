-- Leads (ข้อมูลผู้สนใจเข้าร่วมชุมชน)
create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  business text not null,
  industry text,
  size text,
  contact text not null,
  created_at timestamptz default now()
);

-- Courses (คอร์สเรียน)
create table if not exists courses (
  id text primary key,
  flagship boolean default false,
  xk text,
  gradient text default 'linear-gradient(135deg,#1a1a1a,#FED403)',
  mode_th text[] default '{}',
  mode_en text[] default '{}',
  title_th text not null,
  title_en text,
  tagline_th text,
  tagline_en text,
  desc_th text,
  desc_en text,
  price_th text default 'ติดต่อสอบถาม',
  price_en text default 'Contact us',
  duration_th text,
  duration_en text,
  status text default 'open' check (status in ('open','upcoming','closed')),
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Alumni People (ทำเนียบศิษย์เก่า - บุคคล)
create table if not exists alumni (
  id uuid default gen_random_uuid() primary key,
  name_th text not null,
  name_en text,
  role_th text,
  role_en text,
  company_th text,
  company_en text,
  sector text,
  courses text[] default '{}',
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- Alumni Companies (ทำเนียบศิษย์เก่า - บริษัท)
create table if not exists alumni_companies (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  sector text,
  generation text,
  is_sample boolean default false,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- Articles (บทความ)
create table if not exists articles (
  id text primary key,
  category_th text,
  category_en text,
  gradient text default 'linear-gradient(135deg,#FF6A00,#FF8B1C)',
  title_th text not null,
  title_en text,
  desc_th text,
  desc_en text,
  body_th text[] default '{}',
  body_en text[] default '{}',
  cover_url text,
  status text default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Site Content (เนื้อหาเว็บ)
create table if not exists site_content (
  key text primary key,
  value text not null,
  label text,
  updated_at timestamptz default now()
);

-- Site Settings (ตั้งค่าระบบ)
create table if not exists site_settings (
  key text primary key,
  value text not null,
  label text,
  updated_at timestamptz default now()
);

-- Seed default settings
insert into site_settings (key, value, label) values
  ('line_url', 'https://line.me/R/ti/p/@447xwbvu', 'LINE OA URL'),
  ('facebook_url', 'https://facebook.com/todai.todee', 'Facebook URL'),
  ('brochure_filename', 'GREAT-to-GROWTH-Brochure.pdf', 'Brochure PDF')
on conflict (key) do nothing;

-- RLS Policies (เฉพาะ admin ที่ login แล้วแก้ได้)
alter table leads enable row level security;
alter table courses enable row level security;
alter table alumni enable row level security;
alter table alumni_companies enable row level security;
alter table articles enable row level security;
alter table site_content enable row level security;
alter table site_settings enable row level security;

-- Leads: admin อ่านได้อย่างเดียว, หน้าบ้าน insert ได้
create policy "admin_read_leads" on leads for select using (auth.role() = 'authenticated');
create policy "public_insert_leads" on leads for insert with check (true);

-- ที่เหลือ: authenticated เท่านั้น
create policy "admin_all_courses" on courses for all using (auth.role() = 'authenticated');
create policy "public_read_courses" on courses for select using (status != 'draft');

create policy "admin_all_alumni" on alumni for all using (auth.role() = 'authenticated');
create policy "public_read_alumni" on alumni for select using (true);

create policy "admin_all_companies" on alumni_companies for all using (auth.role() = 'authenticated');
create policy "public_read_companies" on alumni_companies for select using (true);

create policy "admin_all_articles" on articles for all using (auth.role() = 'authenticated');
create policy "public_read_articles" on articles for select using (status = 'published');

create policy "admin_all_content" on site_content for all using (auth.role() = 'authenticated');
create policy "public_read_content" on site_content for select using (true);

create policy "admin_all_settings" on site_settings for all using (auth.role() = 'authenticated');
