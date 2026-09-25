-- Add LinkQu as a payment provider.
alter type public.payment_provider add value if not exists 'linkqu';

-- Dramas are now sourced from external provider APIs (NunoDrama, DramaBox, ...)
-- with string ids like "nuno:dramabite:12345", not rows in the unused
-- public.series table. Repoint order/entitlement scoping at that string id
-- instead of a uuid FK so a purchase can be tied to the actual catalog item.
alter table public.orders drop column series_id;
alter table public.orders add column drama_id text;

alter table public.entitlements drop column series_id;
alter table public.entitlements add column drama_id text;

create index if not exists entitlements_email_drama_idx on public.entitlements (email, drama_id);

create or replace function public.fulfill_paid_order() returns trigger language plpgsql security definer set search_path = '' as $$
declare entitlement_expiry timestamptz;
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    entitlement_expiry := case new.plan_id when 'weekly' then now() + interval '7 days' when 'monthly' then now() + interval '1 month' else null end;
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
