-- Campus Food Delivery — seed data.
--
-- The ten destinations are the real, fixed list from PRD 4.4 — this part is
-- authoritative and should be run against every environment.
--
-- The cafeterias/menu items/delivery fees below are SAMPLE data only, for
-- exercising the ordering flow end-to-end in dev before the operator has
-- entered real content through the CMS (PRD 4.5). Do not run this part
-- against production — real cafeterias belong in the CMS, not a SQL file.

insert into delivery_destinations (name) values
  ('Main Girls Hostel'),
  ('Main Boys Hostel'),
  ('Engineering Girls Hostel'),
  ('Engineering Boys Hostel'),
  ('Numbers Hostel'),
  ('Extension Boys Hostel'),
  ('Extension Girls Hostel'),
  ('School Area'),
  ('Engineering Faculty'),
  ('Faculty of Basic Medical Sciences')
on conflict (name) do nothing;

-- ── Sample data (dev/testing only) ──────────────────────────────────────

do $$
declare
  v_cafeteria_id uuid;
  v_jollof_id uuid;
  v_chicken_id uuid;
  v_plantain_id uuid;
  v_salad_id uuid;
  v_dest record;
begin
  insert into cafeterias (name, description)
  values ('Mama Put Kitchen', 'Sample cafeteria for local development/testing.')
  returning id into v_cafeteria_id;

  insert into menu_items (cafeteria_id, name, price_per_spoon)
  values (v_cafeteria_id, 'Jollof Rice', 500)
  returning id into v_jollof_id;

  insert into menu_items (cafeteria_id, name, price_per_spoon)
  values (v_cafeteria_id, 'Grilled Chicken', 800)
  returning id into v_chicken_id;

  insert into menu_items (cafeteria_id, name, price_per_spoon)
  values (v_cafeteria_id, 'Fried Plantain', 300)
  returning id into v_plantain_id;

  insert into menu_items (cafeteria_id, name, price_per_spoon)
  values (v_cafeteria_id, 'Coleslaw', 300)
  returning id into v_salad_id;

  -- Flat sample delivery fee across all ten destinations for this cafeteria.
  for v_dest in select id from delivery_destinations loop
    insert into delivery_fees (cafeteria_id, destination_id, fee)
    values (v_cafeteria_id, v_dest.id, 300)
    on conflict (cafeteria_id, destination_id) do nothing;
  end loop;
end $$;
