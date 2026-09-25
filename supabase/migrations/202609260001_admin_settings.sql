-- Single-row settings table the admin panel reads/writes. No public policies:
-- only the server-side admin client (service role) touches this table.
create table public.app_settings (
  id text primary key default 'default' check (id = 'default'),
  plan_prices jsonb not null default '{"series":25000,"monthly":39000,"weekly":19000}'::jsonb,
  free_emails text[] not null default '{}',
  payment_provider text not null default '' check (payment_provider in ('', 'midtrans', 'xendit', 'linkqu')),
  secrets jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id) values ('default') on conflict (id) do nothing;

alter table public.app_settings enable row level security;
