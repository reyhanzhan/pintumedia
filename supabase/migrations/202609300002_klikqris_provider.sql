-- KlikQRIS checkouts insert orders with provider = 'klikqris' and admin setting
-- payment_provider = 'klikqris_qris'; both were missing from the enum/CHECK.
alter type public.payment_provider add value if not exists 'klikqris';

alter table public.app_settings drop constraint if exists app_settings_payment_provider_check;
alter table public.app_settings add constraint app_settings_payment_provider_check
  check (payment_provider in ('', 'midtrans', 'xendit', 'linkqu', 'linkqu_qris', 'ipaymu_va', 'ipaymu_qris', 'echopay_qris', 'klikqris_qris'));
