-- =========================================================
-- FEXONIC DATABASE SCHEMA
-- Customer QR + Billing Session Architecture
-- =========================================================

create extension if not exists pgcrypto;


-- =========================================================
-- RESTAURANTS
-- =========================================================

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);


-- =========================================================
-- RESTAURANT MEMBERS
-- =========================================================

create table if not exists public.restaurant_members (
  restaurant_id uuid not null
    references public.restaurants(id) on delete cascade,

  user_id uuid not null
    references auth.users(id) on delete cascade,

  role text not null
    check(role in ('owner','manager','kitchen'))
    default 'owner',

  created_at timestamptz not null default now(),

  primary key (restaurant_id, user_id)
);


-- =========================================================
-- MENU CATEGORIES
-- =========================================================

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),

  restaurant_id uuid not null
    references public.restaurants(id) on delete cascade,

  name text not null,
  sort_order int not null default 0,

  created_at timestamptz not null default now()
);


-- =========================================================
-- MENU ITEMS
-- =========================================================

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),

  restaurant_id uuid not null
    references public.restaurants(id) on delete cascade,

  category_id uuid
    references public.menu_categories(id)
    on delete set null,

  name text not null,
  description text,

  price numeric(12,2) not null
    check(price >= 0),

  image jsonb,

  is_available boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =========================================================
-- TABLES
-- =========================================================

create table if not exists public.tables (
  id uuid primary key default gen_random_uuid(),

  restaurant_id uuid not null
    references public.restaurants(id) on delete cascade,

  name text not null,

  sort_order int not null default 0,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),

  unique (restaurant_id, name)
);


-- =========================================================
-- CUSTOMER QR SLOTS
--
-- Every physical table gets:
-- Customer A
-- Customer B
-- Customer C
-- Customer D
-- =========================================================

create table if not exists public.customer_slots (
  id uuid primary key default gen_random_uuid(),

  restaurant_id uuid not null
    references public.restaurants(id) on delete cascade,

  table_id uuid not null
    references public.tables(id) on delete cascade,

  slot_code text not null
    check (slot_code in ('A','B','C','D')),

  label text not null,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),

  unique (table_id, slot_code)
);


create index if not exists idx_customer_slots_table
on public.customer_slots(table_id);

create index if not exists idx_customer_slots_restaurant
on public.customer_slots(restaurant_id);


-- =========================================================
-- BILLING SESSIONS
--
-- One OPEN billing session per table.
--
-- Example:
--
-- Table 1
--   Session #1
--     Customer A
--     Customer B
--     Customer C
--
-- Done =>
--   Session #1 CLOSED
--
-- New order later =>
--   Session #2
-- =========================================================

create table if not exists public.billing_sessions (
  id uuid primary key default gen_random_uuid(),

  restaurant_id uuid not null
    references public.restaurants(id) on delete cascade,

  table_id uuid not null
    references public.tables(id) on delete cascade,

  status text not null default 'OPEN'
    check(status in ('OPEN','CLOSED')),

  created_at timestamptz not null default now(),

  closed_at timestamptz
);


create index if not exists idx_billing_sessions_restaurant
on public.billing_sessions(restaurant_id);

create index if not exists idx_billing_sessions_table
on public.billing_sessions(table_id);

create index if not exists idx_billing_sessions_status
on public.billing_sessions(restaurant_id, status);


create unique index if not exists
idx_one_open_billing_session_per_table
on public.billing_sessions(table_id)
where status = 'OPEN';


-- =========================================================
-- DEVICES
-- =========================================================

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),

  restaurant_id uuid not null
    references public.restaurants(id) on delete cascade,

  device_key text not null,

  name text not null default 'Customer Device',

  kind text not null default 'CUSTOMER'
    check(kind in ('CUSTOMER','KITCHEN','ADMIN')),

  last_seen_at timestamptz not null default now(),

  created_at timestamptz not null default now(),

  unique (restaurant_id, device_key)
);


create index if not exists idx_devices_restaurant
on public.devices(restaurant_id);

create index if not exists idx_devices_last_seen
on public.devices(restaurant_id, last_seen_at desc);


-- =========================================================
-- ORDERS
-- =========================================================

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),

  restaurant_id uuid not null
    references public.restaurants(id) on delete cascade,

  table_id uuid not null
    references public.tables(id),

  -- Customer A/B/C/D
  customer_slot_id uuid
    references public.customer_slots(id)
    on delete set null,

  -- Current table billing session
  billing_session_id uuid
    references public.billing_sessions(id)
    on delete set null,

  -- Device which created the order
  device_id uuid
    references public.devices(id)
    on delete set null,

  status text not null
    check(status in (
      'NEW',
      'PREPARING',
      'READY',
      'SERVED',
      'CANCELLED'
    ))
    default 'NEW',

  total numeric(12,2) not null
    check(total >= 0),

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);


-- =========================================================
-- ORDER ITEMS
-- =========================================================

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),

  order_id uuid not null
    references public.orders(id)
    on delete cascade,

  restaurant_id uuid not null
    references public.restaurants(id)
    on delete cascade,

  menu_item_id uuid not null,

  name text not null,

  price numeric(12,2) not null,

  quantity int not null
    check(quantity between 1 and 99)
);


-- =========================================================
-- SUBSCRIPTIONS
-- =========================================================

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),

  restaurant_id uuid not null
    references public.restaurants(id) on delete cascade,

  plan text not null default 'starter',

  status text not null default 'active',

  started_at timestamptz,

  expires_at timestamptz,

  created_at timestamptz not null default now()
);


-- =========================================================
-- PAYMENTS
-- =========================================================

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),

  restaurant_id uuid not null
    references public.restaurants(id) on delete cascade,

  subscription_id uuid
    references public.subscriptions(id)
    on delete set null,

  amount numeric(12,2) not null,

  currency text not null default 'INR',

  provider text,

  provider_payment_id text,

  status text not null default 'pending',

  created_at timestamptz not null default now()
);


-- =========================================================
-- EXISTING DATABASE MIGRATIONS
-- =========================================================

-- Existing databases need these columns too.

alter table public.orders
add column if not exists customer_slot_id uuid
references public.customer_slots(id)
on delete set null;

alter table public.orders
add column if not exists billing_session_id uuid
references public.billing_sessions(id)
on delete set null;

alter table public.orders
add column if not exists device_id uuid
references public.devices(id)
on delete set null;


-- =========================================================
-- INDEXES
-- =========================================================

create index if not exists idx_members_user
on public.restaurant_members(user_id);

create index if not exists idx_menu_restaurant
on public.menu_items(restaurant_id);

create index if not exists idx_tables_restaurant
on public.tables(restaurant_id);

create index if not exists idx_orders_restaurant_created
on public.orders(restaurant_id, created_at desc);

create index if not exists idx_order_items_order
on public.order_items(order_id);

create index if not exists idx_orders_customer_slot
on public.orders(customer_slot_id);

create index if not exists idx_orders_billing_session
on public.orders(billing_session_id);

create index if not exists idx_orders_device
on public.orders(device_id);


-- =========================================================
-- AUTH / MEMBERSHIP HELPERS
-- =========================================================

create or replace function public.is_member(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.restaurant_members m
    where m.restaurant_id = rid
      and m.user_id = auth.uid()
  );
$$;


create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt()->>'email')
      = current_setting('app.platform_admin_email', true),
    false
  );
$$;


-- =========================================================
-- AUTOMATIC CUSTOMER QR CREATION
--
-- Every table automatically gets A/B/C/D.
-- =========================================================

create or replace function public.create_customer_slots_for_table()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  insert into public.customer_slots (
    restaurant_id,
    table_id,
    slot_code,
    label
  )
  values
    (new.restaurant_id, new.id, 'A', 'Customer A'),
    (new.restaurant_id, new.id, 'B', 'Customer B'),
    (new.restaurant_id, new.id, 'C', 'Customer C'),
    (new.restaurant_id, new.id, 'D', 'Customer D')
  on conflict (table_id, slot_code) do nothing;

  return new;

end;
$$;


drop trigger if exists on_table_created_customer_slots
on public.tables;


create trigger on_table_created_customer_slots
after insert on public.tables
for each row
execute function public.create_customer_slots_for_table();


-- =========================================================
-- CREATE A/B/C/D FOR EXISTING TABLES
-- =========================================================

insert into public.customer_slots (
  restaurant_id,
  table_id,
  slot_code,
  label
)
select
  t.restaurant_id,
  t.id,
  slots.slot_code,
  'Customer ' || slots.slot_code
from public.tables t
cross join (
  values
    ('A'),
    ('B'),
    ('C'),
    ('D')
) as slots(slot_code)
on conflict (table_id, slot_code) do nothing;


-- =========================================================
-- ENABLE RLS
-- =========================================================

alter table public.restaurants enable row level security;

alter table public.restaurant_members enable row level security;

alter table public.menu_categories enable row level security;

alter table public.menu_items enable row level security;

alter table public.tables enable row level security;

alter table public.customer_slots enable row level security;

alter table public.billing_sessions enable row level security;

alter table public.devices enable row level security;

alter table public.orders enable row level security;

alter table public.order_items enable row level security;

alter table public.subscriptions enable row level security;

alter table public.payments enable row level security;


-- =========================================================
-- DROP OLD POLICIES
-- =========================================================

drop policy if exists "public read active restaurants"
on public.restaurants;

drop policy if exists "members manage restaurants"
on public.restaurants;

drop policy if exists "member own rows"
on public.restaurant_members;

drop policy if exists "owner membership insert"
on public.restaurant_members;

drop policy if exists "members categories"
on public.menu_categories;

drop policy if exists "public read available menu"
on public.menu_items;

drop policy if exists "members menu write"
on public.menu_items;

drop policy if exists "public read active tables"
on public.tables;

drop policy if exists "members tables write"
on public.tables;

drop policy if exists "members read customer slots"
on public.customer_slots;

drop policy if exists "members manage customer slots"
on public.customer_slots;

drop policy if exists "members read billing sessions"
on public.billing_sessions;

drop policy if exists "members manage billing sessions"
on public.billing_sessions;

drop policy if exists "members read devices"
on public.devices;

drop policy if exists "members manage devices"
on public.devices;

drop policy if exists "members read orders"
on public.orders;

drop policy if exists "public create orders"
on public.orders;

drop policy if exists "members update orders"
on public.orders;

drop policy if exists "members read order items"
on public.order_items;

drop policy if exists "public create order items"
on public.order_items;

drop policy if exists "members subscriptions"
on public.subscriptions;

drop policy if exists "members payments"
on public.payments;


-- =========================================================
-- RESTAURANT POLICIES
-- =========================================================

create policy "public read active restaurants"
on public.restaurants
for select
using (
  is_active = true
  or public.is_member(id)
);


create policy "members manage restaurants"
on public.restaurants
for all
using (
  public.is_member(id)
)
with check (
  public.is_member(id)
);


-- =========================================================
-- MEMBER POLICIES
-- =========================================================

create policy "member own rows"
on public.restaurant_members
for select
using (
  user_id = auth.uid()
  or public.is_member(restaurant_id)
);


create policy "owner membership insert"
on public.restaurant_members
for insert
with check (
  user_id = auth.uid()
);


-- =========================================================
-- CATEGORY POLICIES
-- =========================================================

create policy "members categories"
on public.menu_categories
for all
using (
  public.is_member(restaurant_id)
)
with check (
  public.is_member(restaurant_id)
);


-- =========================================================
-- MENU POLICIES
-- =========================================================

create policy "public read available menu"
on public.menu_items
for select
using (
  is_available = true
  or public.is_member(restaurant_id)
);


create policy "members menu write"
on public.menu_items
for all
using (
  public.is_member(restaurant_id)
)
with check (
  public.is_member(restaurant_id)
);


-- =========================================================
-- TABLE POLICIES
-- =========================================================

create policy "public read active tables"
on public.tables
for select
using (
  is_active = true
  or public.is_member(restaurant_id)
);


create policy "members tables write"
on public.tables
for all
using (
  public.is_member(restaurant_id)
)
with check (
  public.is_member(restaurant_id)
);


-- =========================================================
-- CUSTOMER SLOT POLICIES
-- =========================================================

create policy "members read customer slots"
on public.customer_slots
for select
using (
  public.is_member(restaurant_id)
);


create policy "members manage customer slots"
on public.customer_slots
for all
using (
  public.is_member(restaurant_id)
)
with check (
  public.is_member(restaurant_id)
);


-- =========================================================
-- BILLING SESSION POLICIES
-- =========================================================

create policy "members read billing sessions"
on public.billing_sessions
for select
using (
  public.is_member(restaurant_id)
);


create policy "members manage billing sessions"
on public.billing_sessions
for all
using (
  public.is_member(restaurant_id)
)
with check (
  public.is_member(restaurant_id)
);


-- =========================================================
-- DEVICE POLICIES
-- =========================================================

create policy "members read devices"
on public.devices
for select
using (
  public.is_member(restaurant_id)
);


create policy "members manage devices"
on public.devices
for all
using (
  public.is_member(restaurant_id)
)
with check (
  public.is_member(restaurant_id)
);


-- =========================================================
-- ORDER POLICIES
-- =========================================================

create policy "members read orders"
on public.orders
for select
using (
  public.is_member(restaurant_id)
);


create policy "public create orders"
on public.orders
for insert
with check (
  exists(
    select 1
    from public.restaurants r
    join public.tables t
      on t.restaurant_id = r.id
    where r.id = restaurant_id
      and t.id = table_id
      and r.is_active = true
      and t.is_active = true
  )
);


create policy "members update orders"
on public.orders
for update
using (
  public.is_member(restaurant_id)
)
with check (
  public.is_member(restaurant_id)
);


-- =========================================================
-- ORDER ITEM POLICIES
-- =========================================================

create policy "members read order items"
on public.order_items
for select
using (
  public.is_member(restaurant_id)
);


create policy "public create order items"
on public.order_items
for insert
with check (
  exists(
    select 1
    from public.orders o
    where o.id = order_id
      and o.restaurant_id = restaurant_id
  )
);


-- =========================================================
-- SUBSCRIPTION POLICIES
-- =========================================================

create policy "members subscriptions"
on public.subscriptions
for select
using (
  public.is_member(restaurant_id)
);


-- =========================================================
-- PAYMENT POLICIES
-- =========================================================

create policy "members payments"
on public.payments
for select
using (
  public.is_member(restaurant_id)
);


-- =========================================================
-- NEW USER → RESTAURANT
-- =========================================================

create or replace function public.handle_new_user_restaurant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$

declare
  rid uuid;
  rname text;
  rslug text;

begin

  rname :=
    coalesce(
      new.raw_user_meta_data->>'restaurant_name',
      'My Restaurant'
    );

  rslug :=
    lower(
      regexp_replace(
        rname,
        '[^a-zA-Z0-9]+',
        '-',
        'g'
      )
    )
    || '-'
    || substr(new.id::text, 1, 6);


  insert into public.restaurants(
    name,
    slug
  )
  values(
    rname,
    rslug
  )
  returning id into rid;


  insert into public.restaurant_members(
    restaurant_id,
    user_id,
    role
  )
  values(
    rid,
    new.id,
    'owner'
  );


  insert into public.subscriptions(
    restaurant_id,
    status
  )
  values(
    rid,
    'trial'
  );


  return new;

end;
$$;


drop trigger if exists on_auth_user_created_restaurant
on auth.users;


create trigger on_auth_user_created_restaurant
after insert on auth.users
for each row
execute function public.handle_new_user_restaurant();


-- =========================================================
-- FOOD IMAGES STORAGE
-- =========================================================

insert into storage.buckets(
  id,
  name,
  public
)
values(
  'food-images',
  'food-images',
  true
)
on conflict(id) do nothing;


drop policy if exists "public food image read"
on storage.objects;

drop policy if exists "restaurant members upload food images"
on storage.objects;

drop policy if exists "restaurant members update food images"
on storage.objects;

drop policy if exists "restaurant members delete food images"
on storage.objects;


create policy "public food image read"
on storage.objects
for select
using(
  bucket_id = 'food-images'
);


create policy "restaurant members upload food images"
on storage.objects
for insert
to authenticated
with check(
  bucket_id = 'food-images'
  and public.is_member(
    (storage.foldername(name))[1]::uuid
  )
);


create policy "restaurant members update food images"
on storage.objects
for update
to authenticated
using(
  bucket_id = 'food-images'
  and public.is_member(
    (storage.foldername(name))[1]::uuid
  )
);


create policy "restaurant members delete food images"
on storage.objects
for delete
to authenticated
using(
  bucket_id = 'food-images'
  and public.is_member(
    (storage.foldername(name))[1]::uuid
  )
);