-- Passcode-gated menu manager — a low-friction alternative to the full
-- operator login for adding/editing cafeterias, items, prices, photos, and
-- delivery fees. No Supabase Auth account: the browser remembers a shared
-- passcode and sends it with every write; these SECURITY DEFINER functions
-- verify it server-side before touching any table, so RLS is never
-- bypassed by an unauthenticated caller who doesn't know the passcode.
--
-- Deliberately lower assurance than full operator auth (no rate limiting,
-- no per-user audit trail) — an accepted tradeoff for ease of use, not an
-- oversight. Rotate the passcode if it's ever shared beyond its owner.

create table menu_manager_access (
  id boolean primary key default true,
  passcode_hash text not null,
  constraint menu_manager_access_singleton check (id)
);

-- RLS enabled with zero policies: nobody can read/write this table via the
-- API directly, at any role. Only the SECURITY DEFINER functions below
-- (which run as the table owner, bypassing RLS) can touch it.
alter table menu_manager_access enable row level security;

insert into menu_manager_access (passcode_hash)
values (extensions.crypt('5a056a34', extensions.gen_salt('bf')));

create or replace function menu_manager_verify_passcode(p_passcode text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select exists (
    select 1 from menu_manager_access
    where crypt(p_passcode, passcode_hash) = passcode_hash
  );
$$;

grant execute on function menu_manager_verify_passcode(text) to anon, authenticated;

create or replace function menu_manager_require_passcode(p_passcode text)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if not menu_manager_verify_passcode(p_passcode) then
    raise exception 'incorrect passcode';
  end if;
end;
$$;

-- ── Reads (bypass the active-only public RLS so inactive rows stay
-- manageable, not just addable) ──────────────────────────────────────────

create or replace function menu_manager_list_cafeterias(p_passcode text)
returns setof cafeterias
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  perform menu_manager_require_passcode(p_passcode);
  return query select * from cafeterias order by name;
end;
$$;

grant execute on function menu_manager_list_cafeterias(text) to anon, authenticated;

create or replace function menu_manager_list_items(p_passcode text, p_cafeteria_id uuid)
returns setof menu_items
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  perform menu_manager_require_passcode(p_passcode);
  return query select * from menu_items where cafeteria_id = p_cafeteria_id order by name;
end;
$$;

grant execute on function menu_manager_list_items(text, uuid) to anon, authenticated;

-- ── Writes ────────────────────────────────────────────────────────────────

create or replace function menu_manager_upsert_cafeteria(
  p_passcode text,
  p_id uuid,
  p_name text,
  p_photo_url text,
  p_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_id uuid;
begin
  perform menu_manager_require_passcode(p_passcode);

  if trim(coalesce(p_name, '')) = '' then
    raise exception 'name is required';
  end if;

  if p_id is null then
    insert into cafeterias (name, photo_url, active)
    values (p_name, p_photo_url, p_active)
    returning id into v_id;
  else
    update cafeterias
    set name = p_name, photo_url = p_photo_url, active = p_active, updated_at = now()
    where id = p_id
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

grant execute on function menu_manager_upsert_cafeteria(text, uuid, text, text, boolean) to anon, authenticated;

create or replace function menu_manager_upsert_item(
  p_passcode text,
  p_id uuid,
  p_cafeteria_id uuid,
  p_name text,
  p_price numeric,
  p_photo_url text,
  p_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_id uuid;
begin
  perform menu_manager_require_passcode(p_passcode);

  if trim(coalesce(p_name, '')) = '' then
    raise exception 'name is required';
  end if;

  if p_price is null or p_price <= 0 then
    raise exception 'price must be greater than 0';
  end if;

  if p_id is null then
    insert into menu_items (cafeteria_id, name, price_per_spoon, photo_url, active)
    values (p_cafeteria_id, p_name, p_price, p_photo_url, p_active)
    returning id into v_id;
  else
    update menu_items
    set name = p_name, price_per_spoon = p_price, photo_url = p_photo_url, active = p_active, updated_at = now()
    where id = p_id
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

grant execute on function menu_manager_upsert_item(text, uuid, uuid, text, numeric, text, boolean) to anon, authenticated;

create or replace function menu_manager_upsert_fees(
  p_passcode text,
  p_cafeteria_id uuid,
  p_fees jsonb
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_fee jsonb;
begin
  perform menu_manager_require_passcode(p_passcode);

  for v_fee in select * from jsonb_array_elements(p_fees)
  loop
    insert into delivery_fees (cafeteria_id, destination_id, fee)
    values (
      p_cafeteria_id,
      (v_fee ->> 'destination_id')::uuid,
      (v_fee ->> 'fee')::numeric
    )
    on conflict (cafeteria_id, destination_id)
    do update set fee = excluded.fee, updated_at = now();
  end loop;
end;
$$;

grant execute on function menu_manager_upsert_fees(text, uuid, jsonb) to anon, authenticated;
