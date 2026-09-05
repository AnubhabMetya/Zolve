create table if not exists public.executive_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) >= 2),
  email text not null,
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  vertical text not null check (vertical in ('household','personal','community')),
  services text[] default '{}',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  rejection_reason text
);
alter table public.executive_applications enable row level security;
drop policy if exists "Applicants can insert own application" on public.executive_applications;
drop policy if exists "Applicants can view own application" on public.executive_applications;
drop policy if exists "Applicants can update own application" on public.executive_applications;
drop policy if exists "Admin can view all applications" on public.executive_applications;
drop policy if exists "Admin can update applications" on public.executive_applications;
drop policy if exists "Admin can delete applications" on public.executive_applications;

create policy "Applicants can insert own application"
  on public.executive_applications for insert
  with check (applicant_id = auth.uid());

-- Guest executive registration (no sign-in required): allow public insert with applicant_id IS NULL so admin can still review
drop policy if exists "Guests can insert executive applications" on public.executive_applications;
create policy "Guests can insert executive applications"
  on public.executive_applications for insert
  with check (applicant_id IS NULL and auth.uid() IS NULL);

create policy "Applicants can view own application"
  on public.executive_applications for select
  using (applicant_id = auth.uid());

create policy "Admin can view all applications"
  on public.executive_applications for select
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and (profiles.role = 'admin' or profiles.role = 'society_admin')));

create policy "Admin can update applications"
  on public.executive_applications for update
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and (profiles.role = 'admin' or profiles.role = 'society_admin')))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and (profiles.role = 'admin' or profiles.role = 'society_admin')));

create policy "Admin can delete applications"
  on public.executive_applications for delete
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and (profiles.role = 'admin' or profiles.role = 'society_admin')));

create or replace function public.handle_executive_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists executive_applications_updated_at on public.executive_applications;
create trigger executive_applications_updated_at before update on public.executive_applications for each row execute procedure public.handle_executive_updated_at();
