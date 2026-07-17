-- Operator-editable settings (currently just the bank transfer details
-- shown to customers at checkout) that shouldn't require a redeploy to
-- change. Public read because the customer checkout page needs it without
-- login; only operators can write.

create table app_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now(),
  updated_by uuid references operators (id)
);

alter table app_settings enable row level security;

create policy app_settings_public_read on app_settings
  for select
  using (true);

create policy app_settings_operator_insert on app_settings
  for insert
  with check (is_operator());

create policy app_settings_operator_update on app_settings
  for update
  using (is_operator())
  with check (is_operator());

insert into app_settings (key, value) values ('bank_transfer_details', null)
on conflict (key) do nothing;
