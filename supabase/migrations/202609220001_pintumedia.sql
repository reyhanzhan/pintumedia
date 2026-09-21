create extension if not exists pgcrypto;

create type public.order_status as enum ('pending', 'paid', 'failed', 'refunded');
create type public.payment_provider as enum ('midtrans', 'xendit');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  referral_code text not null unique default upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10)),
  referred_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.platforms (
  id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null,
  position integer not null default 0, is_active boolean not null default true
);

create table public.series (
  id uuid primary key default gen_random_uuid(), platform_id uuid not null references public.platforms(id),
  slug text not null unique, title text not null, synopsis text, poster_url text,
  is_published boolean not null default false, created_at timestamptz not null default now()
);

create table public.episodes (
  id uuid primary key default gen_random_uuid(), series_id uuid not null references public.series(id) on delete cascade,
  episode_number integer not null check (episode_number > 0), title text not null, video_url text,
  is_free boolean not null default false, published_at timestamptz, unique(series_id, episode_number)
);

create table public.orders (
  id uuid primary key, user_id uuid references public.profiles(id), email text not null,
  referrer_profile_id uuid references public.profiles(id), provider public.payment_provider not null,
  provider_reference text not null unique, plan_id text not null check (plan_id in ('series', 'monthly', 'weekly')),
  series_id uuid references public.series(id), amount integer not null check (amount > 0),
  status public.order_status not null default 'pending', created_at timestamptz not null default now(), paid_at timestamptz
);

create table public.entitlements (
  id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete cascade,
  email text not null, order_id uuid not null unique references public.orders(id), series_id uuid references public.series(id),
  starts_at timestamptz not null default now(), expires_at timestamptz
);

create table public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(), partner_id uuid not null references public.profiles(id),
  order_id uuid not null unique references public.orders(id), amount integer not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'available', 'paid', 'reversed')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.fulfill_paid_order() returns trigger language plpgsql security definer set search_path = '' as $$
declare entitlement_expiry timestamptz;
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    entitlement_expiry := case new.plan_id when 'weekly' then now() + interval '7 days' when 'monthly' then now() + interval '1 month' else null end;
    insert into public.entitlements (user_id, email, order_id, series_id, expires_at)
    values (new.user_id, new.email, new.id, new.series_id, entitlement_expiry) on conflict (order_id) do nothing;
    if new.referrer_profile_id is not null and new.referrer_profile_id is distinct from new.user_id then
      insert into public.affiliate_commissions (partner_id, order_id, amount, status)
      values (new.referrer_profile_id, new.id, floor(new.amount * 0.20), 'available') on conflict (order_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;
create trigger on_order_paid after update of status on public.orders for each row execute procedure public.fulfill_paid_order();

alter table public.profiles enable row level security;
alter table public.platforms enable row level security;
alter table public.series enable row level security;
alter table public.episodes enable row level security;
alter table public.orders enable row level security;
alter table public.entitlements enable row level security;
alter table public.affiliate_commissions enable row level security;
create policy "catalog platforms public" on public.platforms for select using (is_active);
create policy "catalog series public" on public.series for select using (is_published);
create policy "catalog episodes public" on public.episodes for select using (published_at <= now());
create policy "profile own read" on public.profiles for select using (auth.uid() = id);
create policy "profile own update" on public.profiles for update using (auth.uid() = id);
create policy "orders own read" on public.orders for select using (auth.uid() = user_id);
create policy "entitlements own read" on public.entitlements for select using (auth.uid() = user_id);
create policy "commissions own read" on public.affiliate_commissions for select using (auth.uid() = partner_id);

insert into public.platforms (slug, name, position) values
  ('nunomix','NunoMix',1),('dramabox','DramaBox',2),('dramaverse','DramaVerse',3),('dramawave','DramaWave',4),
  ('flextv','FlexTV',5),('flickreels','FlickReels',6),('freereels','FreeReels',7),('goodshort','GoodShort',8),
  ('idrama','iDrama',9),('melolo','Melolo',10),('netshort','NetShort',11),('shortmax','ShortMax',12),
  ('stardust','Stardust',13),('anime','Anime',14),('anyreel','AnyReel',15);
