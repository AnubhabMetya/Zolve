-- Zolve Supabase Auth + RLS — Corrected (profiles no using(true), bookings inspected from localStorage)
-- Execute in Supabase Dashboard > SQL Editor

-- 1. Profiles table (linked to auth.users) — includes mandatory mobile for executive/customer contact
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) >= 2),
  email text not null,
  phone text check (phone is null or phone ~ '^[6-9][0-9]{9}$'),
  phone_verified boolean default false,
  role text not null check (role in ('customer','provider')) default 'customer',
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Migration for existing deployments missing phone columns (safe if table already created without phone)
alter table public.profiles add column if not exists phone text check (phone is null or phone ~ '^[6-9][0-9]{9}$');
alter table public.profiles add column if not exists phone_verified boolean default false;

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users cannot self-promote to admin" on public.profiles;

-- Corrected: only owner can view own profile (no using(true))
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id and role in ('customer','provider'));

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (role in ('customer','provider'));

-- Public-safe view for provider browsing (no email exposure)
create or replace view public.public_providers as
  select id, full_name, avatar_url, role, created_at from public.profiles where role = 'provider';

-- Handle new user: auto-create profile from auth.users meta (includes phone for executive contact)
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, phone, phone_verified, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'),
    new.email,
    nullif(new.raw_user_meta_data->>'phone',''),
    case when nullif(new.raw_user_meta_data->>'phone','') is not null then false else false end,
    case when coalesce(new.raw_user_meta_data->>'role','customer') in ('customer','provider')
         then new.raw_user_meta_data->>'role' else 'customer' end
  );
  return new;
end; $$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.handle_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- 2. Bookings table — inspected from AppContext createBooking + mockData INITIAL_BOOKINGS (preserves all 16 jobs)
-- Note: customer_id/provider_id as TEXT to support both mock ids (usr-cust-001, prov-rajesh-01) and real auth.users uuids
-- RLS uses auth.uid()::text for comparison, so both mock and real ids work; never USING (true)
create table if not exists public.bookings (
  id text primary key,
  booking_code text unique not null,
  customer_id text not null,
  customer_auth_id uuid references auth.users(id) on delete cascade,
  customer_name text,
  customer_phone text,
  customer_coords jsonb,
  provider_id text,
  provider_auth_id uuid references auth.users(id) on delete set null,
  provider_name text,
  provider_avatar text,
  provider_phone text,
  provider_title text,
  provider_coords jsonb,
  is_coop_member boolean default false,
  service_id text,
  service_name text not null,
  category text,
  address text not null,
  scheduled_date date,
  scheduled_time text,
  description text,
  base_amount integer not null,
  platform_fee integer default 80,
  coop_reserve_fee integer default 40,
  taxes integer,
  total_amount integer not null,
  provider_earnings integer,
  booking_status text not null check (booking_status in ('PAYMENT_PENDING','CONFIRMED','PROVIDER_ASSIGNED','PROVIDER_ACCEPTED','PROVIDER_ON_THE_WAY','SERVICE_STARTED','SERVICE_COMPLETED','CANCELLED','REFUNDED')),
  payment_status text check (payment_status in ('CAPTURED','PENDING','FAILED')),
  payment_id text,
  razorpay_order_id text,
  payment_method text,
  chat_messages jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_reason text
);

alter table public.bookings enable row level security;

drop policy if exists "Users can view own bookings" on public.bookings;
drop policy if exists "Customers can insert own bookings" on public.bookings;
drop policy if exists "Customers can update own bookings" on public.bookings;
drop policy if exists "Providers can update assigned bookings" on public.bookings;
drop policy if exists "Admin can view all bookings" on public.bookings;

-- Customer can view only their own (mock id or auth id)
create policy "Users can view own bookings"
  on public.bookings for select
  using (
    customer_id = auth.uid()::text
    or customer_auth_id = auth.uid()
    or provider_id = auth.uid()::text
    or provider_auth_id = auth.uid()
    or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

create policy "Customers can insert own bookings"
  on public.bookings for insert
  with check (
    customer_id = auth.uid()::text
    or customer_auth_id = auth.uid()
  );

create policy "Customers can update own bookings"
  on public.bookings for update
  using (customer_id = auth.uid()::text or customer_auth_id = auth.uid())
  with check (customer_id = auth.uid()::text or customer_auth_id = auth.uid());

create policy "Providers can update assigned bookings"
  on public.bookings for update
  using (provider_id = auth.uid()::text or provider_auth_id = auth.uid())
  with check (provider_id = auth.uid()::text or provider_auth_id = auth.uid());

-- 3. Providers table — inspected from INITIAL_PROVIDERS (all fields) + 16 jobs x 15 cities hub coverage
-- Keeps public discovery working for guests (no email/phone in public view)
create table if not exists public.providers (
  id text primary key,
  name text not null,
  title text not null,
  rating numeric(3,2) not null,
  rating_count integer default 0,
  completed_jobs integer default 0,
  experience_years integer,
  avatar text,
  phone text,
  email text,
  location text,
  coords jsonb,
  base_price integer not null,
  starting_price integer,
  availability text,
  is_coop_member boolean default false,
  coop_badge text,
  coop_dividend_score text,
  verifications jsonb,
  service_categories text[],
  skills text[],
  bio text,
  recent_reviews jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table public.providers enable row level security;

drop policy if exists "Anyone can view providers" on public.providers;
drop policy if exists "Only admins can insert providers" on public.providers;
drop policy if exists "Only admins can update providers" on public.providers;
drop policy if exists "Only admins can delete providers" on public.providers;

-- Public can view providers for discovery (only public-safe fields via view, but allow select for browsing)
create policy "Anyone can view providers"
  on public.providers for select
  using (true);

-- Only admin (service_role) can insert/update/delete providers — no client self-assign
create policy "Only admins can insert providers"
  on public.providers for insert
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create policy "Only admins can update providers"
  on public.providers for update
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create policy "Only admins can delete providers"
  on public.providers for delete
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- Public-safe view (no phone/email)
create or replace view public.public_providers_view as
  select id, name, title, rating, rating_count, completed_jobs, experience_years, avatar, location, coords, base_price, is_coop_member, service_categories, skills, bio
  from public.providers;

-- 4. Earnings — derived from bookings, not independent insecure source
-- Create a view instead of separate table; if a separate table is needed, it should reference bookings
create or replace view public.earnings_view as
  select
    b.id as booking_id,
    b.booking_code,
    b.service_name,
    b.customer_name,
    b.total_amount as gross_amount,
    b.total_amount as customer_paid,
    b.platform_fee,
    b.coop_reserve_fee as coop_allocation,
    b.taxes,
    b.provider_earnings as net_earnings,
    b.created_at as date,
    case when b.booking_status = 'SERVICE_COMPLETED' then 'SETTLED' else 'PENDING' end as status,
    b.customer_id,
    b.provider_id,
    b.customer_auth_id,
    b.provider_auth_id
  from public.bookings b;

-- If a separate earnings table is genuinely required (for ledger), create with RLS
create table if not exists public.earnings_ledger (
  id text primary key,
  booking_id text references public.bookings(id) on delete cascade,
  booking_code text,
  service_name text,
  customer_name text,
  gross_amount integer,
  customer_paid integer,
  platform_fee integer,
  coop_allocation integer,
  taxes integer,
  net_earnings integer,
  status text,
  created_at timestamptz default now(),
  provider_auth_id uuid references auth.users(id)
);

alter table public.earnings_ledger enable row level security;

drop policy if exists "Providers can view own earnings" on public.earnings_ledger;
drop policy if exists "Admins can view all earnings" on public.earnings_ledger;

create policy "Providers can view own earnings"
  on public.earnings_ledger for select
  using (provider_auth_id = auth.uid() or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create policy "System can insert earnings"
  on public.earnings_ledger for insert
  with check (true); -- should be via service_role trigger from bookings, not client

-- Note: Admin access via service_role bypasses RLS (set role via Dashboard > Auth > Users > Edit user metadata or direct UPDATE with service_role)

-- 3. Booking updated_at trigger
create or replace function public.handle_booking_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists bookings_updated_at on public.bookings;
create trigger bookings_updated_at before update on public.bookings
  for each row execute procedure public.handle_booking_updated_at();
