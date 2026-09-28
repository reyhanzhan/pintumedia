-- app_settings.payment_provider's CHECK constraint predates the LinkQu QRIS
-- option added in the app; widen it so admins can actually select/save it.
alter table public.app_settings drop constraint if exists app_settings_payment_provider_check;
alter table public.app_settings add constraint app_settings_payment_provider_check
  check (payment_provider in ('', 'midtrans', 'xendit', 'linkqu', 'linkqu_qris'));
