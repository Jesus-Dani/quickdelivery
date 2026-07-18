-- Operator self-signup, gated by a shared invite code (mirrors the menu
-- manager passcode pattern). Also fixes a real pre-existing hole: the old
-- handle_new_user() trusted whatever role a client claimed in signup
-- metadata with zero server-side check — anyone who knew the anon key
-- (public, embedded in the frontend) could have called
-- supabase.auth.signUp({ options: { data: { role: 'operator' } } })
-- directly and gotten full payment-confirmation access. The operator
-- branch below now requires a correct invite code, verified server-side,
-- before an operators row is created — a wrong code raises an exception,
-- which rolls back the whole signup (no orphaned auth.users row either).
-- The courier branch is intentionally left ungated, per PRD: couriers are
-- meant to be low-friction self-serve.

create table operator_signup_access (
  id boolean primary key default true,
  code_hash text not null,
  constraint operator_signup_access_singleton check (id)
);

-- RLS enabled, zero policies — same reasoning as menu_manager_access:
-- nobody can read/write this table directly via the API; only this
-- SECURITY DEFINER trigger function (running as table owner) can see it.
alter table operator_signup_access enable row level security;

insert into operator_signup_access (code_hash)
values (extensions.crypt('366d8be2a7', extensions.gen_salt('bf')));

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if new.raw_user_meta_data ->> 'role' = 'operator' then
    if not exists (
      select 1 from operator_signup_access
      where crypt(coalesce(new.raw_user_meta_data ->> 'operator_code', ''), code_hash) = code_hash
    ) then
      raise exception 'invalid operator code';
    end if;

    insert into operators (id, name, email)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''), new.email);
  elsif new.raw_user_meta_data ->> 'role' = 'courier' then
    insert into couriers (id, name, phone)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'name', ''),
      coalesce(new.raw_user_meta_data ->> 'phone', '')
    );
  end if;
  return new;
end;
$$;
