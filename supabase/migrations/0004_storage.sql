-- Campus Food Delivery — payment-proof storage bucket.
-- Menu photos live in Cloudinary (TRD 2); this bucket is only for the
-- private payment-proof uploads, kept inside the same access-controlled
-- system as the rest of the order data (TRD 2, Image storage row).
--
-- Upload path convention: `{order_id}/{filename}` — the order id in the
-- path is what lets us validate an upload belongs to a real, still-pending
-- order without requiring customer auth.

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- Anyone can upload into a folder whose name is a pending order's id — this
-- is deliberately narrow: it doesn't let someone upload into an arbitrary
-- or already-confirmed/rejected order's folder.
create policy payment_proofs_insert on storage.objects
  for insert
  with check (
    bucket_id = 'payment-proofs'
    and exists (
      select 1 from orders o
      where o.id = ((storage.foldername(name))[1])::uuid
        and o.payment_status = 'pending'
    )
  );

-- Only operators can read proofs back (TRD 2: "viewable only by the
-- operator and the customer who submitted it" — the submitting customer
-- sees their own upload client-side at submission time, not via a
-- persistent read grant, since they have no durable identity in v1).
create policy payment_proofs_select on storage.objects
  for select
  using (bucket_id = 'payment-proofs' and is_operator());
