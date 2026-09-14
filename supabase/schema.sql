create extension if not exists pgcrypto;

create table if not exists public.restaurants(
 id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null,
 description text, is_active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.restaurant_members(
 restaurant_id uuid not null references public.restaurants(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in('owner','manager','kitchen')) default 'owner',
 created_at timestamptz not null default now(), primary key(restaurant_id,user_id)
);
create table if not exists public.menu_categories(
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants(id) on delete cascade,
 name text not null, sort_order int not null default 0, created_at timestamptz not null default now()
);
create table if not exists public.menu_items(
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants(id) on delete cascade,
 category_id uuid references public.menu_categories(id) on delete set null, name text not null, description text,
 price numeric(12,2) not null check(price>=0), image jsonb, is_available boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.tables(
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants(id) on delete cascade,
 name text not null, sort_order int not null default 0, is_active boolean not null default true, created_at timestamptz not null default now(), unique(restaurant_id,name)
);
create table if not exists public.orders(
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants(id) on delete cascade,
 table_id uuid not null references public.tables(id), status text not null check(status in('NEW','PREPARING','READY','SERVED','CANCELLED')) default 'NEW',
 total numeric(12,2) not null check(total>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.order_items(
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
 restaurant_id uuid not null references public.restaurants(id) on delete cascade, menu_item_id uuid not null,
 name text not null, price numeric(12,2) not null, quantity int not null check(quantity between 1 and 99)
);
create table if not exists public.subscriptions(
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants(id) on delete cascade,
 plan text not null default 'starter', status text not null default 'active', started_at timestamptz, expires_at timestamptz,
 created_at timestamptz not null default now()
);
create table if not exists public.payments(
 id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants(id) on delete cascade,
 subscription_id uuid references public.subscriptions(id) on delete set null, amount numeric(12,2) not null,
 currency text not null default 'INR', provider text, provider_payment_id text, status text not null default 'pending', created_at timestamptz not null default now()
);

create index if not exists idx_members_user on public.restaurant_members(user_id);
create index if not exists idx_menu_restaurant on public.menu_items(restaurant_id);
create index if not exists idx_tables_restaurant on public.tables(restaurant_id);
create index if not exists idx_orders_restaurant_created on public.orders(restaurant_id,created_at desc);
create index if not exists idx_order_items_order on public.order_items(order_id);

create or replace function public.is_member(rid uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.restaurant_members m where m.restaurant_id=rid and m.user_id=auth.uid());$$;
create or replace function public.is_platform_admin() returns boolean language sql stable security definer set search_path=public as $$select coalesce((auth.jwt()->>'email')=current_setting('app.platform_admin_email',true),false);$$;

alter table public.restaurants enable row level security;alter table public.restaurant_members enable row level security;alter table public.menu_categories enable row level security;alter table public.menu_items enable row level security;alter table public.tables enable row level security;alter table public.orders enable row level security;alter table public.order_items enable row level security;alter table public.subscriptions enable row level security;alter table public.payments enable row level security;

drop policy if exists "public read active restaurants" on public.restaurants;
drop policy if exists "members manage restaurants" on public.restaurants;
drop policy if exists "member own rows" on public.restaurant_members;
drop policy if exists "owner membership insert" on public.restaurant_members;
drop policy if exists "members categories" on public.menu_categories;
drop policy if exists "public read available menu" on public.menu_items;
drop policy if exists "members menu write" on public.menu_items;
drop policy if exists "public read active tables" on public.tables;
drop policy if exists "members tables write" on public.tables;
drop policy if exists "members read orders" on public.orders;
drop policy if exists "public create orders" on public.orders;
drop policy if exists "members update orders" on public.orders;
drop policy if exists "members read order items" on public.order_items;
drop policy if exists "public create order items" on public.order_items;
drop policy if exists "members subscriptions" on public.subscriptions;
drop policy if exists "members payments" on public.payments;

create policy "public read active restaurants" on public.restaurants for select using(is_active=true or public.is_member(id));
create policy "members manage restaurants" on public.restaurants for all using(public.is_member(id)) with check(public.is_member(id));
create policy "member own rows" on public.restaurant_members for select using(user_id=auth.uid() or public.is_member(restaurant_id));
create policy "owner membership insert" on public.restaurant_members for insert with check(user_id=auth.uid());
create policy "members categories" on public.menu_categories for all using(public.is_member(restaurant_id)) with check(public.is_member(restaurant_id));
create policy "public read available menu" on public.menu_items for select using(is_available=true or public.is_member(restaurant_id));
create policy "members menu write" on public.menu_items for all using(public.is_member(restaurant_id)) with check(public.is_member(restaurant_id));
create policy "public read active tables" on public.tables for select using(is_active=true or public.is_member(restaurant_id));
create policy "members tables write" on public.tables for all using(public.is_member(restaurant_id)) with check(public.is_member(restaurant_id));
create policy "members read orders" on public.orders for select using(public.is_member(restaurant_id));
create policy "public create orders" on public.orders for insert with check(exists(select 1 from public.restaurants r join public.tables t on t.restaurant_id=r.id where r.id=restaurant_id and t.id=table_id and r.is_active=true and t.is_active=true));
create policy "members update orders" on public.orders for update using(public.is_member(restaurant_id)) with check(public.is_member(restaurant_id));
create policy "members read order items" on public.order_items for select using(public.is_member(restaurant_id));
create policy "public create order items" on public.order_items for insert with check(exists(select 1 from public.orders o where o.id=order_id and o.restaurant_id=restaurant_id));
create policy "members subscriptions" on public.subscriptions for select using(public.is_member(restaurant_id));
create policy "members payments" on public.payments for select using(public.is_member(restaurant_id));

create or replace function public.handle_new_user_restaurant() returns trigger language plpgsql security definer set search_path=public as $$
declare rid uuid; rname text; rslug text;
begin rname:=coalesce(new.raw_user_meta_data->>'restaurant_name','My Restaurant'); rslug:=lower(regexp_replace(rname,'[^a-zA-Z0-9]+','-','g'))||'-'||substr(new.id::text,1,6);
insert into public.restaurants(name,slug) values(rname,rslug) returning id into rid;insert into public.restaurant_members(restaurant_id,user_id,role) values(rid,new.id,'owner');insert into public.subscriptions(restaurant_id,status) values(rid,'trial');return new;end;$$;
drop trigger if exists on_auth_user_created_restaurant on auth.users;
create trigger on_auth_user_created_restaurant after insert on auth.users for each row execute function public.handle_new_user_restaurant();

-- IMPORTANT: set your platform admin email in Supabase database settings if you use the helper above.

-- Food images: one JSON object is stored on menu_items.image, while bytes live in one Storage bucket.
insert into storage.buckets(id,name,public) values('food-images','food-images',true) on conflict(id) do nothing;
drop policy if exists "public food image read" on storage.objects;
drop policy if exists "restaurant members upload food images" on storage.objects;
drop policy if exists "restaurant members update food images" on storage.objects;
drop policy if exists "restaurant members delete food images" on storage.objects;
create policy "public food image read" on storage.objects for select using(bucket_id='food-images');
create policy "restaurant members upload food images" on storage.objects for insert to authenticated with check(bucket_id='food-images' and public.is_member((storage.foldername(name))[1]::uuid));
create policy "restaurant members update food images" on storage.objects for update to authenticated using(bucket_id='food-images' and public.is_member((storage.foldername(name))[1]::uuid));
create policy "restaurant members delete food images" on storage.objects for delete to authenticated using(bucket_id='food-images' and public.is_member((storage.foldername(name))[1]::uuid));
