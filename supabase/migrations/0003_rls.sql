-- Campus Food Delivery — Row Level Security policies.
-- Maps directly to the permissions table in TRD Section 6. Every table that
-- holds anything beyond public catalog data denies by default; policies
-- below are the only exceptions.

alter table operators enable row level security;
alter table couriers enable row level security;
alter table cafeterias enable row level security;
alter table menu_items enable row level security;
alter table delivery_destinations enable row level security;
alter table delivery_fees enable row level security;
alter table orders enable row level security;
alter table order_lines enable row level security;
alter table deliveries enable row level security;
alter table audit_log enable row level security;

-- ── operators ────────────────────────────────────────────────────────────
create policy operators_select_self_or_operator on operators
  for select
  using (id = auth.uid() or is_operator());

create policy operators_update_self_or_operator on operators
  for update
  using (id = auth.uid() or is_operator())
  with check (id = auth.uid() or is_operator());

-- ── couriers ─────────────────────────────────────────────────────────────
-- Operators need courier names/phones for the dispatch board (TRD 4.3.3);
-- a courier only needs their own row.
create policy couriers_select_self_or_operator on couriers
  for select
  using (id = auth.uid() or is_operator());

create policy couriers_update_self_or_operator on couriers
  for update
  using (id = auth.uid() or is_operator())
  with check (id = auth.uid() or is_operator());

-- ── Public catalog: cafeterias, menu_items, destinations, delivery_fees ──
-- Browsing (PRD 4.1 step 1) requires no login. Operators additionally see
-- inactive rows so the CMS can list items pending re-activation.
create policy cafeterias_public_read on cafeterias
  for select
  using (active or is_operator());

create policy cafeterias_operator_write on cafeterias
  for insert with check (is_operator());
create policy cafeterias_operator_update on cafeterias
  for update using (is_operator()) with check (is_operator());
create policy cafeterias_operator_delete on cafeterias
  for delete using (is_operator());

create policy menu_items_public_read on menu_items
  for select
  using (active or is_operator());

create policy menu_items_operator_write on menu_items
  for insert with check (is_operator());
create policy menu_items_operator_update on menu_items
  for update using (is_operator()) with check (is_operator());
create policy menu_items_operator_delete on menu_items
  for delete using (is_operator());

create policy destinations_public_read on delivery_destinations
  for select
  using (active or is_operator());

create policy destinations_operator_write on delivery_destinations
  for insert with check (is_operator());
create policy destinations_operator_update on delivery_destinations
  for update using (is_operator()) with check (is_operator());
create policy destinations_operator_delete on delivery_destinations
  for delete using (is_operator());

create policy delivery_fees_public_read on delivery_fees
  for select
  using (true);

create policy delivery_fees_operator_write on delivery_fees
  for insert with check (is_operator());
create policy delivery_fees_operator_update on delivery_fees
  for update using (is_operator()) with check (is_operator());
create policy delivery_fees_operator_delete on delivery_fees
  for delete using (is_operator());

-- ── orders ───────────────────────────────────────────────────────────────
-- No direct INSERT/anon SELECT policy exists on purpose: customers create
-- orders and check status only through the SECURITY DEFINER RPCs
-- (create_order, attach_payment_proof, get_order_status) in 0002_functions.sql,
-- which validate everything server-side before touching the table.

-- Courier: the open pool (unclaimed + payment confirmed), plus their own
-- claimed/purchased/delivered orders. Never the full dispatch board.
create policy orders_courier_select on orders
  for select
  using (
    is_courier()
    and (
      (status = 'unclaimed' and payment_status = 'confirmed')
      or courier_id = auth.uid()
    )
  );

-- Operator: full dispatch board (TRD 4.3.3 / 6).
create policy orders_operator_select on orders
  for select
  using (is_operator());

-- Claiming: atomic transition, enforced further by claim_order()'s WHERE
-- clause (TRD 5.3). This policy is what makes the UPDATE visible to RLS at
-- all for a courier; the row-level race safety comes from the function.
create policy orders_courier_claim on orders
  for update
  using (is_courier() and status = 'unclaimed' and payment_status = 'confirmed')
  with check (is_courier() and status = 'claimed' and courier_id = auth.uid());

-- Progressing a courier's own claimed order (purchased/delivered, substitution flag).
create policy orders_courier_update_own on orders
  for update
  using (is_courier() and courier_id = auth.uid())
  with check (is_courier() and courier_id = auth.uid());

-- Payment confirm/reject (TRD 5.4).
create policy orders_operator_update on orders
  for update
  using (is_operator())
  with check (is_operator());

-- ── order_lines ──────────────────────────────────────────────────────────
-- Read-only outside of create_order(); visibility mirrors whatever the
-- parent order is visible to (PRD 4.2 step 1: full itemized detail in the pool).
create policy order_lines_select on order_lines
  for select
  using (
    is_operator()
    or (
      is_courier()
      and exists (
        select 1 from orders o
        where o.id = order_lines.order_id
          and (
            (o.status = 'unclaimed' and o.payment_status = 'confirmed')
            or o.courier_id = auth.uid()
          )
      )
    )
  );

-- ── deliveries ───────────────────────────────────────────────────────────
create policy deliveries_select on deliveries
  for select
  using (is_operator() or (is_courier() and courier_id = auth.uid()));

-- claim_order() inserts the row as the claiming courier.
create policy deliveries_courier_insert on deliveries
  for insert
  with check (is_courier() and courier_id = auth.uid());

-- mark_order_purchased/delivered update their own delivery's timestamps;
-- fund_courier() (operator) updates funded_at/funded_by.
create policy deliveries_courier_update_own on deliveries
  for update
  using (is_courier() and courier_id = auth.uid())
  with check (is_courier() and courier_id = auth.uid());

create policy deliveries_operator_update on deliveries
  for update
  using (is_operator())
  with check (is_operator());

-- ── audit_log ────────────────────────────────────────────────────────────
-- Immutable, operator-only, no UPDATE/DELETE policy at all.
create policy audit_log_operator_select on audit_log
  for select
  using (is_operator());

create policy audit_log_operator_insert on audit_log
  for insert
  with check (is_operator());
