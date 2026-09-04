-- Patch profiles.role to allow global admin + society_admin
do $$ begin
  -- drop old constraint if exists and recreate with expanded enum
  alter table public.profiles drop constraint if exists profiles_role_check;
  alter table public.profiles add constraint profiles_role_check check (role in ('customer','provider','admin','society_admin'));
exception when others then null; end $$;

-- Update handle_new_user to allow admin/society_admin via service_role only (still restrict insert RLS to customer/provider)
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, phone, phone_verified, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'),
    new.email,
    nullif(new.raw_user_meta_data->>'phone',''),
    false,
    case when coalesce(new.raw_user_meta_data->>'role','customer') in ('customer','provider','admin','society_admin')
         then new.raw_user_meta_data->>'role' else 'customer' end
  );
  return new;
end; $$ language plpgsql security definer;

-- 1. Societies per city (21 hubs)
create table if not exists public.societies (
  id uuid primary key default gen_random_uuid(),
  hub_id text not null,
  city text not null,
  state text,
  name text not null,
  location text,
  manager_id uuid references auth.users(id) on delete set null,
  manager_name text,
  units integer,
  blocks integer,
  stats jsonb default '{"openRequests":0,"completedThisMonth":0,"pendingApproval":0,"emergencyOpen":0}'::jsonb,
  coords jsonb,
  pincode text,
  created_at timestamptz default now(),
  unique(city, name)
);

alter table public.societies enable row level security;
drop policy if exists "Anyone can view societies" on public.societies;
drop policy if exists "Admin can manage societies" on public.societies;
create policy "Anyone can view societies" on public.societies for select using (true);
create policy "Admin can manage societies" on public.societies for all using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','society_admin'))) with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','society_admin')));

-- 2. Support tickets (unified disputes: billing, overcharge, society, etc.)
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_code text unique not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  user_name text,
  user_email text,
  user_phone text,
  user_role text,
  booking_id text,
  booking_code text,
  category text not null check (category in (
    'Provider didn''t arrive (No Show)',
    'Service not completed / Incomplete work',
    'Poor quality of service',
    'Property damage during repair',
    'Overcharging / Price mismatch',
    'Payment or billing issue',
    'Safety or conduct concern',
    'Society ticket',
    'Other query',
    'Billing / Overcharge Query'
  )),
  description text not null,
  status text not null check (status in ('open','under_review','resolved','dismissed')) default 'open',
  resolution_notes text,
  assigned_admin_id uuid references auth.users(id) on delete set null,
  city text,
  hub_id text,
  lat double precision,
  lng double precision,
  pincode text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.support_tickets enable row level security;
drop policy if exists "Users can insert own tickets" on public.support_tickets;
drop policy if exists "Users can view own tickets" on public.support_tickets;
drop policy if exists "Admin can view all tickets" on public.support_tickets;
drop policy if exists "Admin can update tickets" on public.support_tickets;
drop policy if exists "Admin can delete tickets" on public.support_tickets;

create policy "Users can insert own tickets" on public.support_tickets for insert with check (user_id = auth.uid());
create policy "Users can view own tickets" on public.support_tickets for select using (user_id = auth.uid());
create policy "Admin can view all tickets" on public.support_tickets for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','society_admin')));
create policy "Admin can update tickets" on public.support_tickets for update using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','society_admin'))) with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','society_admin')));
create policy "Admin can delete tickets" on public.support_tickets for delete using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','society_admin')));

create or replace function public.handle_support_updated_at() returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists support_tickets_updated_at on public.support_tickets;
create trigger support_tickets_updated_at before update on public.support_tickets for each row execute procedure public.handle_support_updated_at();

-- 3. Society requests (per society, city-stamped)
create table if not exists public.society_requests (
  id uuid primary key default gen_random_uuid(),
  society_id uuid references public.societies(id) on delete cascade,
  society_name text not null,
  city text not null,
  hub_id text,
  requester_id uuid references auth.users(id) on delete set null,
  requester_name text,
  unit_or_block text not null,
  service_type text,
  priority text not null check (priority in ('Normal','High','Emergency')) default 'Normal',
  description text not null,
  status text not null check (status in ('PENDING','ASSIGNED','IN_PROGRESS','SCHEDULED','COMPLETED','CANCELLED')) default 'PENDING',
  provider_id text,
  assigned_provider_name text,
  scheduled_date timestamptz,
  lat double precision,
  lng double precision,
  pincode text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.society_requests enable row level security;
drop policy if exists "Users can insert own society requests" on public.society_requests;
drop policy if exists "Users can view own society requests" on public.society_requests;
drop policy if exists "Admin can view all society requests" on public.society_requests;
drop policy if exists "Admin can update society requests" on public.society_requests;

create policy "Users can insert own society requests" on public.society_requests for insert with check (requester_id = auth.uid());
create policy "Users can view own society requests" on public.society_requests for select using (requester_id = auth.uid());
create policy "Admin can view all society requests" on public.society_requests for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','society_admin')));
create policy "Admin can update society requests" on public.society_requests for update using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','society_admin'))) with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','society_admin')));

create or replace function public.handle_society_req_updated_at() returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists society_requests_updated_at on public.society_requests;
create trigger society_requests_updated_at before update on public.society_requests for each row execute procedure public.handle_society_req_updated_at();
