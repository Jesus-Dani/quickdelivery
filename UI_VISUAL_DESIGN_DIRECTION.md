# QuickDelivery — Visual Design Direction (Red & Cream)

Read this alongside `CLAUDE_CODE_BUILD_PROMPT.md`, `PRD_Campus_Food_Delivery.md`, and `TRD_Campus_Food_Delivery.md`. This document is the detailed visual specification for the build — treat it as binding unless something here would conflict with a functional or security requirement in the TRD, in which case the TRD wins and the conflict should be flagged rather than silently resolved.

The single most important instruction in this document: **do not produce a generic, sterile "AI-generated SaaS" look.** No stark white backgrounds, no default blue/gray corporate palette, no uniform small border-radius, no dry admin-panel aesthetic leaking into the customer-facing site. This has to feel vibrant, warm, and appetizing.

## 1. Why red and cream

The direction is inspired by Chowdeck (a Nigerian food delivery app) for its food-forward energy and warmth, without reusing their literal brand colors. Red carries appetite and urgency associations that suit a food brand; cream keeps it from feeling aggressive or overly loud. Green is deliberately not the brand color here — it's reserved exclusively as a semantic success color (see Section 5), so when it does appear, it means something specific rather than competing with red for attention.

## 2. Color palette (explicit values)

Use these exact values as the starting palette — don't leave color selection to interpretation. Treat them as a Tailwind theme extension or CSS custom properties, not one-off hardcoded hex per component.

| Role | Light mode | Dark mode | Use |
|---|---|---|---|
| Page background (customer site) | `#FBF3DE` | `#241F14` | Cream base — never stark white |
| Primary red (strong) | `#993C1D` | `#F0997B` | Primary buttons, header bar, key CTAs — white text on the light-mode value |
| Primary red (bright accent) | `#D85A30` | `#F0997B` | Smaller accents, tags, highlights |
| Red tint (backgrounds for badges) | `#FAECE7` | `#4A1B0C` | Badge/pill backgrounds paired with the strong red as text |
| Secondary amber | `#EF9F27` | `#EF9F27` | Secondary highlights, "needs more" state in the match indicator |
| Amber tint (backgrounds) | `#FAEEDA` | `#412402` | Amber badge/pill backgrounds, paired with `#633806` (light) / `#FAEEDA` (dark) text |
| Success green (semantic only) | `#3B6D11` text on `#EAF3DE` bg | `#97C459` text on `#173404` bg | Only the backup-match "matched" pill and order-confirmation moments — nowhere else |
| Neutral text on cream | `#2C2114` | standard light text token | Body copy, labels on the cream background |
| Card surfaces | white / `#FFFFFF` | dark neutral card token | Cards, forms, most of the dashboard |

## 3. Typography (explicit choice)

Do not leave this to the framework default — a default Next.js project ships with Geist, which is neutral and corporate, exactly what this direction is meant to avoid.

- **Headings, prices, and totals**: **Fredoka** (via `next/font/google`), semibold/bold weight. Rounded, friendly, confident — this is what actually carries the "vibrant, not AI-generated" feeling, more than color does.
- **Body text and labels**: **Inter** or **Work Sans**, regular weight, generous line height — keeps body copy legible against the busier cream background without competing with the display font.
- Numbers specifically (prices, running totals, the grand total at checkout): consistent tabular alignment so digits don't visually jump around as spoon counts change live.

## 4. Shape and component language

- **Buttons**: fully rounded (pill-shaped). Primary actions are solid red with white text; secondary actions are outline or ghost style, still pill-shaped.
- **Cards**: generously rounded corners (16–20px), light/white background against the cream page, a subtle border rather than a drop shadow.
- **Dividers**: dashed rather than solid where sections are separated (e.g., between the primary plate and the backup plate) — keeps the tone playful rather than clinical.
- **Badges and status pills**: fully rounded, colored by meaning — red for primary/featured, amber for secondary/attention, green reserved for success only.
- **Photo slots**: every cafeteria card and every menu item gets a fixed-aspect, rounded photo slot for real food photography uploaded via the CMS — this is central to the feel, not an afterthought bolted on later.

## 5. Per-screen guidance

**Browse** — cream background, red header bar, cafeteria cards each with a photo slot, name, and short tag.

**Cafeteria menu / plate builder** — primary plate section first, backup plate section immediately after, spoon quantities controlled by pill-shaped +/- steppers, running totals in bold. The match indicator is amber while mismatched ("₦X more needed") and switches to green only once the backup total equals the primary total ("Backup matches your order") — this is the one designed moment green appears, and the transition should feel like a small reward.

**Checkout** — destination dropdown, a clear food total / delivery fee / grand total breakdown, a red pill-shaped "Place order" button, and a payment-proof upload styled as a friendly prompt rather than a bare file input.

**Operator/courier dashboard** — calmer and more neutral than the customer site (it's a working tool, not a storefront), but red stays the accent color for primary actions (confirm payment, claim order, mark delivered) so it still reads as the same product rather than a bolted-on separate system.

## 6. Micro-interactions

- Adding a spoon to an item: a brief scale/bounce on the count as it updates.
- The match pill flipping from amber to green: a quick, satisfying color-and-icon transition when the totals converge.
- Placing an order: a small celebratory moment (e.g., a brief check-mark animation), not a full-screen takeover.
- Keep all of these fast — well under a quarter second — so they read as responsive polish, not showiness that slows the flow down.

## 7. What to avoid

- Stark white backgrounds anywhere on the customer-facing site.
- Default blue/gray corporate color schemes.
- Sharp, minimal corners — this is a warm, appetite-forward brand, not a fintech dashboard.
- Green used anywhere outside the one semantic success case. If green starts showing up as a general accent, that's a sign the direction has drifted.

## 8. Icons

Use **Tabler Icons** (`@tabler/icons-react`), outline style only — never filled/solid variants. Outline icons match the rounded, friendly shape language better than heavy filled icons would. Use icons functionally (back arrows, upload, plus/minus steppers, checkmarks) rather than as standalone decoration. Standard inline size 16–20px; nothing larger unless it's a genuinely empty-state illustration moment (see Section 9).

## 9. States and transitions

These are just as much a part of "the look and feel" as the happy path, and are exactly the kind of thing that reads as generic/unfinished if left to a framework default.

- **Loading**: use soft, tinted skeleton blocks (rounded, matching the photo-slot treatment) rather than a bare spinner — a loading cafeteria grid should look like faded versions of the real cards, not a generic loading wheel.
- **Empty states**: specific and warm, never a bare "No data found." E.g., no cafeterias currently open, or no delivery fee configured yet for a destination — say what's actually true and what the person should do next (nothing to do, or check back later).
- **Error states**: clear and kind, never a raw exception message. Since red is already the primary brand color, error states need their own distinct treatment so they don't read as just another red button — pair error copy with a warning/error icon and a slightly different (darker/muted) red tone than the primary CTA red, so the two don't visually collide.
- **Transitions**: simple, fast fades or slides between screens (browse → cafeteria → checkout), under 250ms. No heavy full-screen page-transition animations — those slow down perceived speed, which matters more than flourish here.

## 10. Voice and content

Tone: warm, direct, and casual — write like a fellow student, not a corporate delivery brand. Short sentences, contractions are fine, no corporate filler ("leverage," "seamless," "empower"). This applies everywhere: headlines, button labels, empty states, and confirmations.

The backup-plate requirement is a concept customers haven't seen before and needs real explanatory copy the first time they hit it — don't leave this to a generic tooltip. Suggested actual copy to build from:

- **Backup-plate explainer** (shown once, above the backup section): "Pick a backup too — just in case your first choice runs out. We'll only use it if we have to, and it'll never cost you more."
- **Match pill, unmatched**: "₦[X] more needed to match your order" (keep this exact pattern — it's already been validated in the working mockup).
- **Match pill, matched**: "Backup matches your order" with a checkmark.
- **Empty cafeteria list**: "No cafeterias open right now — check back soon."
- **No delivery fee for a destination**: "Not currently deliverable from this cafeteria."
- **Payment proof upload prompt**: "Upload your payment screenshot" (not a bare file input).
- **Order confirmation**: "Order placed! We'll message you on WhatsApp once it's confirmed."
- **Primary buttons**: verb-first, short — "Continue to checkout," "Place order," "Claim order" — not "Submit" or "OK."

Claude Code should treat this section as a starting point, not a locked script — the point is the tone (warm, plain, student-to-student), not that every word is final.

## 11. Reference

There is no external mockup file to consult — Section 5 above is the complete, self-contained layout description for each screen. Build directly from it rather than assuming a visual reference exists elsewhere in the repo.