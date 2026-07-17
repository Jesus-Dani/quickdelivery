-- Fixes a bug in create_order (0002_functions.sql): the order_lines insert
-- selects used a FROM-clause alias "v_line" that collides with the outer
-- PL/pgSQL variable v_line, making every (v_line ->> ...) reference
-- ambiguous and causing every successful order to fail at the insert step
-- with "column reference v_line is ambiguous". Source file corrected too
-- so a fresh clone doesn't reintroduce this.
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
