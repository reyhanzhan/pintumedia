-- iPaymu and EchoPay checkouts insert orders with provider = 'ipaymu' / 'echopay'
-- (see lib/payments/provider.ts) and app_settings.payment_provider values
-- 'ipaymu_va' / 'ipaymu_qris' / 'echopay_qris' (see app/admin/page.tsx) — both
-- were missing from their respective constraints, which would reject the
-- INSERT/UPDATE entirely at the database level despite correct app code.
alter type public.payment_provider add value if not exists 'ipaymu';
alter type public.payment_provider add value if not exists 'echopay';

alter table public.app_settings drop constraint if exists app_settings_payment_provider_check;
alter table public.app_settings add constraint app_settings_payment_provider_check
  check (payment_provider in ('', 'midtrans', 'xendit', 'linkqu', 'linkqu_qris', 'ipaymu_va', 'ipaymu_qris', 'echopay_qris'));
