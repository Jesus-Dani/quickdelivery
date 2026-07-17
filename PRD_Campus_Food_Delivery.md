# Product Requirements Document — Campus Food Delivery Platform

**Status:** Draft v1
**Date:** July 12, 2026

## 1. Overview

A two-sided web platform for a campus food delivery business that currently runs manually over WhatsApp and cash/transfer. Students order food from campus cafeterias; student couriers ("delivery personnel") buy the food in person at the cafeteria and deliver it. The platform digitizes ordering, payment proof handling, courier dispatch, and menu management, while deliberately keeping several currently-manual operational steps manual, since they already work well at the business's current scale.

The defining product mechanic is the **backup order**: for every order, the customer must also select a full backup set of items whose total cost exactly matches the primary order. If an item is unavailable when the courier arrives to buy it, the courier substitutes from the pre-approved, pre-priced backup — so there is never a repricing, refund, or renegotiation problem at the point of purchase.

## 2. Problem statement

Today, order-taking, payment confirmation, courier funding, and delivery coordination all run through one operator manually monitoring WhatsApp and bank transfers. This works but doesn't scale cleanly as the business adds cafeterias and locations, and it gives customers no self-service way to browse menus, place orders, or see what's available — everything currently depends on direct messaging.

## 3. Users

- **Customer** — a student ordering food for delivery to a campus location. No prior account needed beyond what's required to track their own order and receive updates.
- **Courier ("delivery personnel")** — a student who claims and fulfills deliveries. Not an employee in the traditional sense; works from an open job pool.
- **Operator** — runs the business day to day: confirms payments, funds couriers, monitors deliveries, and maintains the menu/pricing/CMS. Single role for now; the platform should be built so additional operator accounts could be added later without a redesign.

## 4. Core user flows

### 4.1 Customer: placing an order
1. Browse cafeterias, each with its own menu of items and per-spoon prices, plus photos.
2. Pick one cafeteria for the entire order (an order cannot mix cafeterias).
3. Build a plate: select items and a spoon count for each. Running total updates live.
4. Build a backup plate the same way. Checkout is blocked until the backup total exactly equals the primary total — the UI shows a live match indicator, not a manual calculation the customer has to do themselves.
5. Select a delivery destination from a fixed list of ten campus locations (see 4.4). The delivery fee is looked up automatically based on the cafeteria + destination combination and added to the total.
6. Pay by bank transfer (as today) and upload proof of payment.
7. Receive a WhatsApp message confirming the order, once the operator has manually confirmed the payment. If no courier claims the order right away, the customer receives a follow-up message letting them know to expect a wait.
8. Once a courier is assigned, the customer receives the courier's phone number via WhatsApp and coordinates/tracks delivery through that channel. There is no in-app order tracking in v1.

### 4.2 Courier: fulfilling an order
1. Log into the shared dashboard (courier-level permissions) and view the open order pool — every unclaimed order, unfiltered by location, showing full itemized detail (cafeteria, primary plate, backup plate, destination, total).
2. Claim an order individually. A courier may hold multiple claimed orders at once, claimed one at a time — there's no forced batching or route grouping.
3. Travel to the cafeteria. The operator sends the courier the purchase amount by manual transfer once the courier arrives.
4. Buy the order at the counter. If an item from the primary plate isn't available, the courier substitutes from the backup plate in person — this is the only point at which substitution happens; there's no live inventory system.
5. Flag on the dashboard whether a substitution was used, then deliver to the customer's chosen destination and mark the order complete.

### 4.3 Operator: running the business
1. Monitor a payment confirmation queue — incoming payment proofs waiting on manual sign-off.
2. Confirm or reject each proof; confirming triggers the customer's WhatsApp confirmation.
3. Monitor a live dispatch board showing every order's status (unclaimed, claimed, purchased, delivered) and which courier is assigned to what.
4. Send each courier their purchase funds by manual transfer once they've claimed an order and reached the cafeteria.
5. Maintain the menu CMS: add/edit cafeterias, items, per-spoon prices, photos, and the delivery fee for each cafeteria-destination pair — see 4.5 for how this needs to work in practice.

### 4.5 Menu CMS: what "streamlined" means here
Since the operator is the one entering and updating this data regularly, the CMS needs to minimize clicks and context-switching, not just expose the data for editing:
- **Adding a new cafeteria** is one continuous flow: name and photo first, then add items one after another (name, per-spoon price, photo) without leaving the page or re-opening a form each time.
- **Editing an existing item's price or photo** happens inline, in the same list view — no separate "edit page" per item.
- **The delivery fee matrix is one grid per cafeteria**, all ten destinations editable at once, not ten separate one-at-a-time entries.
- **Photo upload is a simple click-to-upload with an immediate preview** — no separate media library step.
- Nothing in this flow requires a code deploy or developer involvement, in line with the earlier decision to move off hardcoded menus.
6. Send the customer the assigned courier's phone number via WhatsApp once a courier is assigned.

### 4.4 Fixed delivery destinations (v1)
Main Girls Hostel, Main Boys Hostel, Engineering Girls Hostel, Engineering Boys Hostel, Numbers Hostel, Extension Boys Hostel, Extension Girls Hostel, School Area, Engineering Faculty, Faculty of Basic Medical Sciences.

No free-text address entry and no geolocation/maps — this list is closed and selected from a dropdown.

## 5. Feature list by surface

**Customer-facing site**
- Cafeteria browsing with menu, photos, per-spoon pricing
- Plate builder (primary) with live running total
- Backup plate builder with live total-match validation gating checkout
- Destination selector (fixed list) with automatic delivery fee lookup
- Checkout summary (food total + delivery fee)
- Payment proof upload
- Order confirmation and status via WhatsApp (outside the app)

**Shared operator/courier dashboard**
- Role-based access: operator (full) vs. courier (pool + own claimed orders)
- Payment confirmation queue
- Live dispatch board (order status, courier assignment)
- Open order pool with claim action (courier view)
- Substitution flag per completed order
- Menu CMS: cafeterias, items, prices, photos
- Delivery fee matrix editor (cafeteria × destination)

## 6. Business rules

- One cafeteria per order; a customer wanting food from two cafeterias places two separate orders.
- Every order requires a backup plate; the backup total must equal the primary total exactly before checkout is allowed.
- Menu items are priced per spoon, per cafeteria — not as flat dish prices.
- Delivery fees are set per cafeteria-destination pair, not a flat or distance-derived fee.
- Substitution is decided by the courier in person at the point of purchase, never by live inventory or pre-order stock checks.
- Order claiming is pull-based and unfiltered — any courier can see and claim any open order.
- Payment confirmation and courier funding both remain fully manual (operator-confirmed transfer, operator-initiated transfer) — this is a deliberate choice, not a gap, because it preserves instant fund access that automated payment gateways currently can't match at acceptable cost.
- Menu and pricing content is managed through a lean CMS, not hardcoded — this decouples onboarding new cafeterias/locations from code deploys.

## 7. Out of scope for v1

- Live cafeteria inventory/stock sync
- Automated payment gateway integration
- WhatsApp Business API automation (notifications remain operator-sent)
- In-app real-time order tracking
- Courier ratings, accountability history, or performance scoring
- Multi-cafeteria orders or route/batch bundling for couriers
- Address entry or geolocation-based delivery

## 8. Open questions / future considerations

- As order volume grows, will one operator manually confirming every payment and funding every courier become a bottleneck? Worth revisiting once volume data exists.
- Should courier accountability (ratings, delivery history, no-show tracking) be added once there's a large enough courier pool that trust can't be managed informally?
- Should destination-based delivery fees eventually reflect real-time factors (weather, demand), or stay static like today?
- If the business expands beyond one campus, does the fixed destination list and CMS structure extend cleanly, or does it need a "campus" entity layered in?

## 9. Suggested success metrics

- Time from payment proof upload to operator confirmation
- Time from order confirmation to courier claim
- Percentage of orders requiring a backup substitution
- Order completion rate (placed → delivered)
