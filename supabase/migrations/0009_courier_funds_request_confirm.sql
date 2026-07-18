-- Courier-initiated funds request/confirm loop (PRD 4.2/4.3: operator sends
-- purchase funds by manual transfer once the courier has reached the
-- cafeteria — this formalizes that "reached the cafeteria" signal as an
-- explicit courier action instead of an out-of-band WhatsApp message, and
-- adds a courier-side acknowledgement that money actually arrived before
-- they're allowed to proceed to buying).

alter table deliveries
  add column funds_requested_at timestamptz,
  add column funds_confirmed_at timestamptz;

-- The previous deliveries_courier_update_own policy let a courier PATCH
-- *any* column on their own delivery row directly via the REST API —
-- including funded_at, which they could have set themselves without the
-- operator ever sending money. Dropping it: every courier-side delivery
-- state change now goes through a SECURITY DEFINER function with explicit
-- checks instead of relying on RLS to restrict which columns get touched.
drop policy deliveries_courier_update_own on deliveries;

create or replace function request_funds(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not is_courier() then
    raise exception 'only couriers can request funds';
  end if;

  update deliveries
  set funds_requested_at = now()
  where order_id = p_order_id
    and courier_id = auth.uid()
    and funds_requested_at is null;

  if not found then
    raise exception 'order is not yours, or funds have already been requested';
  end if;
end;
$$;

grant execute on function request_funds(uuid) to authenticated;

create or replace function confirm_funds_received(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not is_courier() then
    raise exception 'only couriers can confirm funds received';
  end if;

  update deliveries
  set funds_confirmed_at = now()
  where order_id = p_order_id
    and courier_id = auth.uid()
    and funded_at is not null
    and funds_confirmed_at is null;

  if not found then
    raise exception 'order is not yours, funds have not been sent yet, or receipt was already confirmed';
  end if;
end;
$$;

grant execute on function confirm_funds_received(uuid) to authenticated;

-- Now SECURITY DEFINER (was SECURITY INVOKER) since the deliveries update
-- inside it can no longer rely on the courier RLS policy just removed —
-- explicit courier_id checks in the WHERE clauses replace that. Also now
-- hard-gated on funds_confirmed_at: a courier can't mark an order
-- purchased until they've acknowledged receiving the purchase money.
create or replace function mark_order_purchased(
  p_order_id uuid,
  p_substitution_used boolean,
  p_substitution_note text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not is_courier() then
    raise exception 'only couriers can mark orders purchased';
  end if;

  if not exists (
    select 1 from deliveries
    where order_id = p_order_id
      and courier_id = auth.uid()
      and funds_confirmed_at is not null
  ) then
    raise exception 'confirm you have received purchase funds before marking this order purchased';
  end if;

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
  where order_id = p_order_id
    and courier_id = auth.uid();
end;
$$;

grant execute on function mark_order_purchased(uuid, boolean, text) to authenticated;

-- Also now SECURITY DEFINER for the same RLS-policy-removal reason above.
create or replace function mark_order_delivered(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not is_courier() then
    raise exception 'only couriers can mark orders delivered';
  end if;

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
  where order_id = p_order_id
    and courier_id = auth.uid();
end;
$$;

grant execute on function mark_order_delivered(uuid) to authenticated;
