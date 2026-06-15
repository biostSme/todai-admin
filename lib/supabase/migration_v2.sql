-- เพิ่ม fields ใหม่ให้ courses
alter table courses add column if not exists cover_url text;
alter table courses add column if not exists outcomes_th text[] default '{}';
alter table courses add column if not exists outcomes_en text[] default '{}';
alter table courses add column if not exists modules_th jsonb default '[]';
alter table courses add column if not exists modules_en jsonb default '[]';
alter table courses add column if not exists format_th text;
alter table courses add column if not exists format_en text;
alter table courses add column if not exists capacity text;
alter table courses add column if not exists open_date text;

-- เพิ่ม fields ใหม่ให้ alumni
alter table alumni add column if not exists avatar_url text;

-- เพิ่ม fields ใหม่ให้ alumni_companies
alter table alumni_companies add column if not exists logo_url text;
