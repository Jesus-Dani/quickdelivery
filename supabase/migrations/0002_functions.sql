-- Campus Food Delivery — role helpers and core business-logic functions.
-- See TRD Section 5 (Core business logic) for the source of truth.

-- ── Role helpers ─────────────────────────────────────────────────────────

create or replace function is_operator()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from operators where id = auth.uid() and active
  );
$$;

create or replace function is_courier()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from couriers where id = auth.uid() and active
  );
$$;

-- ── New account bootstrap ───────────────────────────────────────────────
-- A Supabase Auth user is signed up with raw_user_meta_data->>'role' set to
-- 'operator' or 'courier' (plus 'name' and, for couriers, 'phone'). This
-- trigger creates the matching profile row so RLS role checks work from the
-- very first request.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.raw_user_meta_data ->> 'role' = 'operator' then
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── 5.1 Backup total validation + order creation ────────────────────────
-- The only way an order (and its lines) can be created. Recomputes every
-- line total server-side from current menu prices — the client-submitted
-- totals are never trusted. Rejects the whole write in one transaction if
-- the primary and backup totals don't match exactly, or if no delivery fee
-- exists for the cafeteria+destination pair (TRD 5.2: never default to 0).
--
-- p_primary_lines / p_backup_lines shape: [{"menu_item_id": uuid, "spoon_count": int}, ...]
create or replace function create_order(
  p_customer_contact text,
  p_cafeteria_id uuid,
  p_destination_id uuid,
  p_primary_lines jsonb,
  p_backup_lines jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_food_total numeric(10, 2) := 0;
  v_backup_total numeric(10, 2) := 0;
  v_delivery_fee numeric(10, 2);
  v_line jsonb;
  v_price numeric(10, 2);
  v_spoon_count integer;
  v_line_total numeric(10, 2);
begin
  if p_customer_contact is null or length(trim(p_customer_contact)) = 0 then
    raise exception 'customer_contact is required';
  end if;

  if jsonb_array_length(p_primary_lines) = 0 or jsonb_array_length(p_backup_lines) = 0 then
    raise exception 'primary and backup plates must each contain at least one item';
  end if;

  if not exists (select 1 from cafeterias where id = p_cafeteria_id and active) then
    raise exception 'cafeteria is not available';
  end if;

  select fee into v_delivery_fee
  from delivery_fees
  where cafeteria_id = p_cafeteria_id and destination_id = p_destination_id;

  if v_delivery_fee is null then
    raise exception 'this destination is not available for the selected cafeteria';
  end if;

  -- Primary lines: validate item belongs to this cafeteria, price from the
  -- server, sum into v_food_total.
  for v_line in select * from jsonb_array_elements(p_primary_lines)
  loop
    v_spoon_count := (v_line ->> 'spoon_count')::integer;
    if v_spoon_count is null or v_spoon_count <= 0 then
      raise exception 'spoon_count must be a positive integer';
    end if;

    select price_per_spoon into v_price
    from menu_items
    where id = (v_line ->> 'menu_item_id')::uuid
      and cafeteria_id = p_cafeteria_id
      and active;

    if v_price is null then
      raise exception 'menu item % is not available at this cafeteria', v_line ->> 'menu_item_id';
    end if;

    v_food_total := v_food_total + (v_price * v_spoon_count);
  end loop;

  -- Backup lines: same validation, summed separately for the match check.
  for v_line in select * from jsonb_array_elements(p_backup_lines)
  loop
    v_spoon_count := (v_line ->> 'spoon_count')::integer;
    if v_spoon_count is null or v_spoon_count <= 0 then
      raise exception 'spoon_count must be a positive integer';
    end if;

    select price_per_spoon into v_price
    from menu_items
    where id = (v_line ->> 'menu_item_id')::uuid
      and cafeteria_id = p_cafeteria_id
      and active;

    if v_price is null then
      raise exception 'menu item % is not available at this cafeteria', v_line ->> 'menu_item_id';
    end if;

    v_backup_total := v_backup_total + (v_price * v_spoon_count);
  end loop;

  -- The non-negotiable rule (TRD 5.1, PRD 4.1 step 4): checkout is blocked
  -- server-side, not just in the UI, until the two totals match exactly.
  if v_food_total <> v_backup_total then
    raise exception 'backup plate total (%) does not match primary plate total (%)',
      v_backup_total, v_food_total;
  end if;

  insert into orders (
    customer_contact, cafeteria_id, destination_id,
    food_total, delivery_fee, grand_total,
    payment_status, status
  ) values (
    p_customer_contact, p_cafeteria_id, p_destination_id,
    v_food_total, v_delivery_fee, v_food_total + v_delivery_fee,
    'pending', 'unclaimed'
  )
  returning id into v_order_id;

  -- Aliased "elem", not "v_line" — reusing the outer PL/pgSQL variable name
  -- as a FROM-clause alias here makes every (v_line ->> ...) reference
  -- ambiguous between the variable and the column, and Postgres rejects it.
  insert into order_lines (order_id, menu_item_id, spoon_count, line_total, is_backup)
  select
    v_order_id,
    (elem ->> 'menu_item_id')::uuid,
    (elem ->> 'spoon_count')::integer,
    mi.price_per_spoon * (elem ->> 'spoon_count')::integer,
    false
  from jsonb_array_elements(p_primary_lines) elem
  join menu_items mi on mi.id = (elem ->> 'menu_item_id')::uuid;

  insert into order_lines (order_id, menu_item_id, spoon_count, line_total, is_backup)
  select
    v_order_id,
    (elem ->> 'menu_item_id')::uuid,
    (elem ->> 'spoon_count')::integer,
    mi.price_per_spoon * (elem ->> 'spoon_count')::integer,
    true
  from jsonb_array_elements(p_backup_lines) elem
  join menu_items mi on mi.id = (elem ->> 'menu_item_id')::uuid;

  return v_order_id;
end;
$$;

grant execute on function create_order(text, uuid, uuid, jsonb, jsonb) to anon, authenticated;

-- Attach payment proof after upload. The order id (an unguessable uuid)
-- acts as the bearer token for anonymous customers — only usable while the
-- order is still pending, and only once.
create or replace function attach_payment_proof(
  p_order_id uuid,
  p_proof_url text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update orders
  set payment_proof_url = p_proof_url
  where id = p_order_id
    and payment_status = 'pending'
    and payment_proof_url is null;

  if not found then
    raise exception 'order not found, already has a payment proof, or is no longer pending';
  end if;
end;
$$;

grant execute on function attach_payment_proof(uuid, text) to anon, authenticated;

-- Curated status lookup for the customer's own order (TRD 3: "a lightweight
-- session or phone-number check is enough"). Never exposes other customers'
-- contact info or payment proof URLs.
create or replace function get_order_status(
  p_order_id uuid,
  p_customer_contact text
)
returns table (
  status order_status,
  payment_status payment_status,
  substitution_used boolean,
  grand_total numeric,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select o.status, o.payment_status, o.substitution_used, o.grand_total, o.created_at
  from orders o
  where o.id = p_order_id
    and o.customer_contact = p_customer_contact;
$$;

grant execute on function get_order_status(uuid, text) to anon, authenticated;

-- ── 5.3 Order claiming (concurrency) ─────────────────────────────────────
-- Single atomic conditional update. Two couriers racing to claim the same
-- order: Postgres's row lock + re-evaluated WHERE clause under READ
-- COMMITTED guarantees only one UPDATE affects a row: the loser's WHERE no
-- longer matches once the winner has committed. No read-then-write.
create or replace function claim_order(p_order_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if not is_courier() then
    raise exception 'only couriers can claim orders';
  end if;

  update orders
  set status = 'claimed',
      courier_id = auth.uid()
  where id = p_order_id
    and status = 'unclaimed'
    and payment_status = 'confirmed';

  if not found then
    raise exception 'order is no longer available to claim';
  end if;

  insert into deliveries (order_id, courier_id)
  values (p_order_id, auth.uid());
end;
$$;

grant execute on function claim_order(uuid) to authenticated;

-- ── 5.5 Substitution flag + status progression ───────────────────────────
-- Courier marks their own claimed order purchased (optionally flagging a
-- substitution) and later delivered. Kept as simple, narrowly-scoped
-- functions rather than a general-purpose order update endpoint.
create or replace function mark_order_purchased(
  p_order_id uuid,
  p_substitution_used boolean,
  p_substitution_note text default null
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  update orders
  set status = 'purchased',
      substitution_used = p_substitution_used,
      substitution_note = p_substitution_note,
      purchased_at = now()
  where id = p_order_id
    and status = 'claimed'
    and courier_id = auth.uid();

  if not found then
    raise exception 'order is not claimed by you or is not in a purchasable state';
  end if;

  update deliveries
  set purchased_at = now()
  where order_id = p_order_id;
end;
$$;

grant execute on function mark_order_purchased(uuid, boolean, text) to authenticated;

create or replace function mark_order_delivered(p_order_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  update orders
  set status = 'delivered',
      delivered_at = now()
  where id = p_order_id
    and status = 'purchased'
    and courier_id = auth.uid();

  if not found then
    raise exception 'order is not yours or is not in a deliverable state';
  end if;

  update deliveries
  set delivered_at = now()
  where order_id = p_order_id;
end;
$$;

grant execute on function mark_order_delivered(uuid) to authenticated;

-- ── 5.4 Payment confirmation state machine ───────────────────────────────
-- Operator-only; also writes the audit trail entry (TRD 7 NFR).
create or replace function confirm_payment(p_order_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if not is_operator() then
    raise exception 'only operators can confirm payments';
  end if;

  update orders
  set payment_status = 'confirmed',
      confirmed_at = now(),
      confirmed_by = auth.uid()
  where id = p_order_id
    and payment_status = 'pending';

  if not found then
    raise exception 'order is not pending confirmation';
  end if;

  insert into audit_log (operator_id, action, entity_type, entity_id)
  values (auth.uid(), 'confirm_payment', 'order', p_order_id);
end;
$$;

grant execute on function confirm_payment(uuid) to authenticated;

create or replace function reject_payment(p_order_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if not is_operator() then
    raise exception 'only operators can reject payments';
  end if;

  update orders
  set payment_status = 'rejected',
      rejected_at = now(),
      rejected_by = auth.uid()
  where id = p_order_id
    and payment_status = 'pending';

  if not found then
    raise exception 'order is not pending confirmation';
  end if;

  insert into audit_log (operator_id, action, entity_type, entity_id)
  values (auth.uid(), 'reject_payment', 'order', p_order_id);
end;
$$;

grant execute on function reject_payment(uuid) to authenticated;

-- Operator records that a courier has been sent purchase funds (TRD 4.3.4).
create or replace function fund_courier(p_order_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if not is_operator() then
    raise exception 'only operators can record courier funding';
  end if;

  update deliveries
  set funded_at = now(),
      funded_by = auth.uid()
  where order_id = p_order_id;

  if not found then
    raise exception 'no delivery record for this order';
  end if;

  insert into audit_log (operator_id, action, entity_type, entity_id)
  values (auth.uid(), 'fund_courier', 'order', p_order_id);
end;
$$;

grant execute on function fund_courier(uuid) to authenticated;
