-- Capture the raw provider callback so a declined/failed payment (e.g. a QRIS
-- transaction rejected by the acquirer before ever reaching "paid") can be
-- diagnosed after the fact instead of just showing "pending" or "failed" with
-- no trace of why.
alter table public.orders add column if not exists provider_payload jsonb;
alter table public.orders add column if not exists failure_reason text;
