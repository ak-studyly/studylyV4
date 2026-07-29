-- ============================================================
-- STUDYLY — SCHEMA
-- Run in Supabase SQL Editor
-- ============================================================

create extension if not exists "uuid-ossp";

-- COLLEGES
create table public.colleges (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  city       text not null,
  state      text not null,
  approved   boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.colleges enable row level security;
create policy "Public read approved colleges"
  on public.colleges for select using (approved = true);
create policy "Anyone can submit college"
  on public.colleges for insert with check (approved = false);

-- MATERIALS
create table public.materials (
  id            uuid primary key default uuid_generate_v4(),
  college_id    uuid not null references public.colleges(id),
  branch        text not null,
  semester      smallint not null check (semester between 1 and 8),
  cycle         text check (cycle in ('chemistry', 'physics')),
  subject       text,
  title         text not null,
  -- notes = general, cie1/2/3 = internal assessments, exam = end sem
  type          text not null default 'notes'
                check (type in ('notes', 'cie1', 'cie2', 'cie3', 'exam')),
  file_url      text not null,
  file_name     text not null,
  file_size     bigint,
  uploader_name text not null default 'anonymous',
  upvotes       integer not null default 0,
  approved      boolean not null default false,
  created_at    timestamptz not null default now()
);

alter table public.materials enable row level security;
create policy "Public read approved materials"
  on public.materials for select using (approved = true);
create policy "Anyone can upload"
  on public.materials for insert with check (true);

-- UPVOTES
create table public.material_votes (
  material_id uuid not null references public.materials(id) on delete cascade,
  voter_key   text not null,
  created_at  timestamptz not null default now(),
  primary key (material_id, voter_key)
);

alter table public.material_votes enable row level security;
create policy "Public read votes"   on public.material_votes for select using (true);
create policy "Anyone can vote"     on public.material_votes for insert with check (true);

-- Atomic upvote (prevents double voting)
create or replace function public.upvote_material(
  p_material_id uuid,
  p_voter_key   text
)
returns boolean language plpgsql security definer as $$
begin
  insert into public.material_votes (material_id, voter_key)
  values (p_material_id, p_voter_key);
  update public.materials set upvotes = upvotes + 1 where id = p_material_id;
  return true;
exception
  when unique_violation then return false;
end;
$$;

-- Indexes
create index on public.materials (college_id, branch, semester, approved, upvotes desc);
create index on public.materials (college_id, branch, semester, cycle, subject, type, approved);

-- Seed BMSCE
insert into public.colleges (name, city, state, approved)
values ('BMS College of Engineering', 'Bengaluru', 'Karnataka', true);

-- ──────────────────────────────────────────
-- STORAGE: create bucket "materials" in Dashboard
-- Storage → New bucket → name: materials
-- Public: OFF, Max size: 10MB, MIME: application/pdf
--
-- Then run in SQL Editor:
-- create policy "Anyone can upload PDFs"
--   on storage.objects for insert
--   with check (bucket_id = 'materials');
-- create policy "Anyone can read materials"
--   on storage.objects for select
--   using (bucket_id = 'materials');
-- ──────────────────────────────────────────
