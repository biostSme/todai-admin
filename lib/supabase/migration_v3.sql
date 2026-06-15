-- เพิ่ม 5C system และ outcome icons ให้ courses
alter table courses add column if not exists system_5c jsonb default '[]';
-- format: [{ label: "Class", title: "สู่กว้างระดับโลก", desc: "...", icon_url: "..." }, ...]

alter table courses add column if not exists outcomes_detail jsonb default '[]';
-- format: [{ label: "INSIGHT", title: "เข้าใจถึง Macro–Market–Micro", icon_url: "..." }, ...]
