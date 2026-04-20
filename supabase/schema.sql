create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_name text,
  phone text,
  business_email text,
  license_number text,
  logo_url text,
  hourly_labor_rate numeric not null default 45,
  paint_cost_per_gallon numeric not null default 50,
  wall_coverage_sq_ft_per_gallon numeric not null default 375,
  trim_coverage_sq_ft_per_gallon numeric not null default 250,
  default_coats numeric not null default 2,
  material_markup_percent numeric not null default 40,
  tax_percent numeric not null default 0,
  minimum_job_charge numeric not null default 0,
  billing_status text not null default 'inactive',
  billing_cycle text,
  paypal_subscription_id text,
  paypal_payer_id text,
  guarantee_eligible_until timestamptz,
  refund_used_at timestamptz,
  rates_configured_at timestamptz,
  free_quotes_used integer not null default 0,
  free_quotes_limit integer not null default 3,
  lifetime_deal_claimed_at timestamptz,
  website text,
  custom_fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_name text not null default '',
  project_address text not null default '',
  total numeric not null default 0,
  tax_total numeric not null default 0,
  labor_total numeric not null default 0,
  materials_total numeric not null default 0,
  pdf_url text,
  quote_data jsonb not null,
  version integer not null default 1,
  parent_quote_id uuid references public.quotes(id) on delete set null,
  is_latest boolean not null default true,
  share_token text unique,
  is_unlocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.quotes enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can read own quotes"
  on public.quotes for select
  using (auth.uid() = user_id);

create policy "Users can insert own quotes"
  on public.quotes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own quotes"
  on public.quotes for update
  using (auth.uid() = user_id);

create policy "Users can delete own quotes"
  on public.quotes for delete
  using (auth.uid() = user_id);

create policy "Anyone can read quotes by share_token"
  on public.quotes for select
  using (share_token is not null);

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload logos"
  on storage.objects for insert
  with check (bucket_id = 'logos' and auth.role() = 'authenticated');

create policy "Public logos are readable"
  on storage.objects for select
  using (bucket_id = 'logos');

-- Atomic increment to prevent race conditions on free quote counting
create or replace function public.increment_free_quotes_used(user_id uuid)
returns void
language sql
security definer
as $$
  update public.profiles
  set free_quotes_used = free_quotes_used + 1
  where id = user_id
    and free_quotes_used < free_quotes_limit;
$$;

-- Auto-update updated_at on row changes
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger quotes_updated_at
  before update on public.quotes
  for each row execute function public.handle_updated_at();
