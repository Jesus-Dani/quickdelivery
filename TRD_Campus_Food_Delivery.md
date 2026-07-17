# Technical Requirements Document — Campus Food Delivery Platform

**Status:** Draft v1
**Date:** July 12, 2026
**Companion document:** PRD_Campus_Food_Delivery.md

## 1. Purpose

Translates the PRD into a concrete architecture, data model, and set of technical rules. The stack below is confirmed, chosen to match the actual complexity of the system: mostly structured CRUD, one live-ish job pool, and no heavy real-time, ML, or geospatial requirements.

## 2. Confirmed stack

| Layer | Recommendation | Why |
|---|---|---|
| Frontend | Next.js (React, TypeScript) | Single codebase for both the customer site and the operator/courier dashboard |
| Backend | Supabase (Postgres + Auth + Storage + Row Level Security), called directly from the frontend via the Supabase client — no separate API server to build or run | Gets real transactions, enforceable permissions, and atomic updates without provisioning or maintaining a custom backend — the two guarantees a static site plus a plain JSON store (e.g. JSONBin) can't provide |
| Auth | Supabase Auth, with a `role` field (`operator` / `courier`) on each account | Built into the same service; no separate auth provider needed |
| Database access | Direct Supabase client queries, with Row Level Security policies enforcing who can read/write what (only operators can confirm payments; a courier can only claim an unclaimed order and update their own deliveries) | Keeps the "no custom backend" simplicity while making the security-critical rules unbypassable from the browser |
| Image storage | Cloudinary for menu photos (public catalog images); Supabase Storage for payment-proof uploads (kept private, viewable only by the operator and the customer who submitted it) | Keeps Cloudinary as requested for the public catalog; keeps sensitive uploads inside the same access-controlled system as the rest of the data |
| Hosting | Netlify (frontend) + Supabase (managed, hosted) | Netlify's free plan permits commercial use (unlike Vercel's Hobby tier, which restricts free hosting to non-commercial projects) and covers this app's scale; Next.js runs via Netlify's OpenNext adapter rather than natively, which only matters for advanced features (e.g. Partial Prerendering) this app doesn't use |
| Styling | Tailwind CSS | Fast to build the plate-builder UI and dashboard views without a design system overhead |

This is intentionally the lean end of what's workable — four services total (Netlify, Supabase, Cloudinary, and Next.js/Tailwind as code, not infrastructure), no custom server to run. The data model and business logic below hold regardless of final tooling choices.

## 3. System architecture

Two front-of-house surfaces, one shared backend:

- **Customer site** — public, no login required to browse; a lightweight session or phone-number check is enough to let a customer view their own order's status after checkout.
- **Operator/courier dashboard** — authenticated, role-gated. Operator sees everything; courier sees the order pool and their own claimed orders only.
- **Backend** — Supabase, called directly from the Next.js frontend. Orders, the fee/menu CMS, claims, and payment-proof status all live in Supabase tables, with Row Level Security policies doing the permission enforcement a hand-built API layer would otherwise be needed for. No external service integrations are required for v1 (no payment gateway, no maps/geocoding, no WhatsApp API) — WhatsApp messaging stays a manual, operator-performed action outside the system.

No live inventory sync is needed since substitution is resolved in person by the courier, not by the system.

## 4. Data model

**Cafeteria**
`id, name, description, photo_url, active`

**MenuItem**
`id, cafeteria_id, name, price_per_spoon, photo_url, active`

**DeliveryDestination**
`id, name` — seeded with the fixed list of ten locations; not user-editable in v1 beyond CMS access if the list changes.

**DeliveryFee**
`id, cafeteria_id, destination_id, fee` — one row per cafeteria-destination pair.

**Order**
`id, customer_contact, cafeteria_id, destination_id, food_total, delivery_fee, grand_total, payment_proof_url, payment_status (pending/confirmed/rejected), status (unclaimed/claimed/purchased/delivered), substitution_used (bool), created_at`

**OrderLine**
`id, order_id, menu_item_id, spoon_count, line_total, is_backup (bool)` — every order has two sets of `OrderLine` rows (primary and backup) linked by `is_backup`.

**Courier**
`id, name, phone, active`

**Delivery**
`id, order_id, courier_id, claimed_at, funded_at, purchased_at, delivered_at`

**Operator**
`id, name, email, role`

## 5. Core business logic

### 5.1 Backup total validation
On checkout, compute `sum(OrderLine.line_total where is_backup = false)` and `sum(OrderLine.line_total where is_backup = true)` for the order. These must be exactly equal; checkout is blocked until they match. Client-side validation drives the live UI indicator, but the actual gate should be a Postgres function (called via Supabase RPC) that recomputes both totals from the submitted line items and rejects the write if they don't match — not a plain client-side insert into the orders table, which a browser could bypass entirely.

### 5.2 Delivery fee lookup
On cafeteria + destination selection, fetch the matching `DeliveryFee` row. If no row exists for that pair, the destination should not be selectable for that cafeteria (or should surface a clear "not available from this cafeteria" state) rather than defaulting to zero or a guessed fee.

### 5.3 Order claiming (concurrency)
Claiming must be an atomic operation — two couriers viewing the same open order at once cannot both claim it. Implement as a single conditional update (`UPDATE orders SET status = 'claimed', courier_id = ? WHERE id = ? AND status = 'unclaimed'`), checking the affected row count. This is a direct Supabase update call, no custom server needed — Postgres itself guarantees only one of two simultaneous requests wins.

### 5.4 Payment confirmation state machine
`pending → confirmed → (order becomes visible in pool)` or `pending → rejected → (customer notified manually)`. Only a confirmed payment makes an order claimable.

### 5.5 Substitution flag
Set by the courier at the point of marking the order purchased. This is a simple boolean plus optional note, not a structured swap record — the actual substitution decision happens off-platform, in person.

### 5.6 Menu CMS interactions (see PRD 4.5)
- **New cafeteria + items**: a single guided flow that creates one `Cafeteria` row followed by repeated `MenuItem` inserts without leaving the page — implemented as one form with a repeatable "add another item" row, not separate pages per item.
- **Inline editing**: item name, price, and photo update directly in the list view (edit-in-place), issuing a single Supabase update per field change rather than a full-page form submission.
- **Delivery fee matrix**: rendered as one editable grid (rows = destinations, one cafeteria at a time) and saved as a single batch upsert into `DeliveryFee`, not ten separate saves.
- **Photo upload**: direct click-to-upload to Cloudinary with immediate preview, no intermediate media-library screen.
- All of the above are operator-only actions, gated by the same Row Level Security policies as the rest of the CMS (see Section 6).

## 6. Permissions

| Action | Customer | Courier | Operator |
|---|---|---|---|
| Browse menu, place order | ✓ | – | – |
| View own order status | ✓ | – | – |
| View open order pool | – | ✓ | ✓ |
| Claim order | – | ✓ | – |
| Confirm payment | – | – | ✓ |
| Fund courier (record transfer) | – | – | ✓ |
| Edit menu/prices/fees (CMS) | – | – | ✓ |
| View full dispatch board | – | – | ✓ |

In Supabase, each row of this table maps to a Row Level Security policy on the relevant table — permissions are enforced by the database itself, not by application code that a browser could work around.

## 7. Non-functional requirements

- **Mobile-first for courier and customer surfaces** — both groups will primarily use phones; the dashboard's operator views can be less mobile-optimized.
- **Server-side validation is authoritative** for all pricing and matching logic — never trust client-computed totals for checkout or payment.
- **Image upload limits** — reasonable file size caps on menu photos and payment proofs to keep storage costs predictable.
- **Audit trail** — payment confirmations, courier funding records, and CMS edits should be timestamped and attributed to the operator who performed them, even with a single operator today, to support adding more operator accounts later without rework.
- **No dependency on third-party APIs for core functionality** — the system should function fully with WhatsApp, bank transfers, and manual confirmation all happening outside the platform.

## 8. Explicitly deferred (not built in v1)

- Payment gateway integration (revisit only if an option emerges with same-day settlement matching current manual transfers — see PRD open questions)
- WhatsApp Business API automation
- Live cafeteria inventory
- In-app order tracking/status beyond what triggers a WhatsApp message
- Courier rating/accountability system
- Geolocation or zone-filtered order pool (unfiltered pool is sufficient at current scale; revisit if courier pool grows large enough that relevance filtering becomes necessary)
