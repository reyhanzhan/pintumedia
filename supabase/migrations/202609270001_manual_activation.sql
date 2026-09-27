-- Lets the admin panel record manually-activated orders (WhatsApp order + manual
-- payment confirmation) with the same orders/entitlements/commission flow as the
-- automated gateways, instead of a separate ad-hoc mechanism.
alter type public.payment_provider add value if not exists 'manual';
