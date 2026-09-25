-- Replace the fixed 3-plan price map with an admin-editable, orderable list of
-- plans. Each plan carries everything needed to fulfill it: price, whether it
-- unlocks one drama or everything, and how many days the access lasts.
alter table public.app_settings add column if not exists plans jsonb not null default '[
  {"id":"series","label":"Buka drama ini","meta":"Akses selamanya","amount":25000,"scope":"drama","durationDays":null},
  {"id":"monthly","label":"Paket bulanan","meta":"Semua drama","amount":39000,"scope":"global","durationDays":30},
  {"id":"weekly","label":"Paket 7 hari","meta":"Semua drama","amount":19000,"scope":"global","durationDays":7}
]'::jsonb;

alter table public.app_settings drop column if exists plan_prices;

-- plan_id used to be locked to ('series','monthly','weekly'); admins can now
-- define arbitrary plans, so drop that check constraint (whatever Postgres
-- auto-named it) and let plan_id be any text referencing app_settings.plans[].id.
do $$
declare
  found_constraint text;
begin
  select con.conname into found_constraint
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'orders' and con.contype = 'c' and pg_get_constraintdef(con.oid) like '%plan_id%';
  if found_constraint is not null then
    execute format('alter table public.orders drop constraint %I', found_constraint);
  end if;
end $$;

-- The entitlement's expiry now comes from the plan's own durationDays
-- (captured on the order at checkout time) instead of a hardcoded
-- weekly/monthly/else switch.
alter table public.orders add column if not exists duration_days integer;

create or replace function public.fulfill_paid_order() returns trigger language plpgsql security definer set search_path = '' as $$
declare entitlement_expiry timestamptz;
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    entitlement_expiry := case when new.duration_days is not null then now() + (new.duration_days || ' days')::interval else null end;
    insert into public.entitlements (user_id, email, order_id, drama_id, expires_at)
    values (new.user_id, new.email, new.id, new.drama_id, entitlement_expiry) on conflict (order_id) do nothing;
    if new.referrer_profile_id is not null and new.referrer_profile_id is distinct from new.user_id then
      insert into public.affiliate_commissions (partner_id, order_id, amount, status)
      values (new.referrer_profile_id, new.id, floor(new.amount * 0.20), 'available') on conflict (order_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;
