-- Lets the menu manager actually delete a cafeteria, not just deactivate
-- it. menu_items and delivery_fees cascade-delete automatically (per their
-- FK definitions in 0001_schema.sql). orders.cafeteria_id has no cascade
-- on purpose (order history must survive), so deleting a cafeteria that
-- has ever had an order placed against it will hit a foreign_key_violation
-- -- caught here and turned into a clear message instead of a raw
-- Postgres error, telling the operator to deactivate instead.

create or replace function menu_manager_delete_cafeteria(p_passcode text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  perform menu_manager_require_passcode(p_passcode);

  delete from cafeterias where id = p_id;

  if not found then
    raise exception 'cafeteria not found';
  end if;
exception
  when foreign_key_violation then
    raise exception 'Can''t delete — this cafeteria has order history. Deactivate it instead.';
end;
$$;

grant execute on function menu_manager_delete_cafeteria(text, uuid) to anon, authenticated;
