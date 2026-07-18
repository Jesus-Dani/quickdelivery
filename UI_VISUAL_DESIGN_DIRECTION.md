# QuickDelivery — Visual Design Direction (Blue & Cream)

Read this alongside `CLAUDE_CODE_BUILD_PROMPT.md`, `PRD_Campus_Food_Delivery.md`, and `TRD_Campus_Food_Delivery.md`. This document is the detailed visual specification for the build — treat it as binding unless something here would conflict with a functional or security requirement in the TRD, in which case the TRD wins and the conflict should be flagged rather than silently resolved.

The single most important instruction in this document: **do not produce a generic, sterile "AI-generated SaaS" look.** No stark white backgrounds, no uniform small border-radius, no dry admin-panel aesthetic leaking into the customer-facing site. This has to feel vibrant, warm, and appetizing — the brand color moved from red to blue on request, but the warmth still comes from the cream base, generous rounding, and photo-forward cards, not from the accent hue.

## 1. Why blue and cream

The original direction was red-and-cream (inspired by Chowdeck, a Nigerian food delivery app, for its food-forward energy). The dominant color was later changed to a deep blue (`#13486A`) on explicit request. Cream stays as the base for the same reason it always did — it keeps the page from feeling stark or corporate. Green is still not the brand color — it's reserved exclusively as a semantic success color (see Section 6), so when it does appear, it means something specific rather than competing with the brand color for attention. Error/warning states also deliberately kept their own red tone (Section 2) rather than following the brand color to blue, so a validation error doesn't read as an odd blue message.

## 2. Color palette (explicit values)

Use these exact values as the starting palette — don't leave color selection to interpretation. Treat them as a Tailwind theme extension or CSS custom properties, not one-off hardcoded hex per component.

| Role | Light mode | Dark mode | Use |
|---|---|---|---|
| Page background (customer site) | `#FBF3DE` | `#241F14` | Cream base — never stark white |
| Brand (dominant) | `#13486A` | `#5BA8D9` | Primary buttons, header bar, key CTAs — pairs with the on-brand text color below |
| Brand (accent) | `#5BA8D9` | `#5BA8D9` | Smaller accents, tags, dividers, highlights |
| Text on brand | `#F2FAFC` | `#F2FAFC` | Text/icons placed directly on a brand or brand-accent background (header copy, button labels) |
| Error / warning text | `#993C1D` | `#F0997B` | Validation errors, failed loads — deliberately not the brand color, so failures don't read as blue |
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

- **Buttons**: fully rounded (pill-shaped). Primary actions are solid brand blue with on-brand text; secondary actions are outline or ghost style, still pill-shaped.
- **Cards**: generously rounded corners (16–20px), light/white background against the cream page, a subtle border rather than a drop shadow.
- **Dividers**: dashed rather than solid where sections are separated (e.g., between the primary plate and the backup plate) — keeps the tone playful rather than clinical.
- **Badges and status pills**: fully rounded, colored by meaning — brand blue for primary/featured, amber for secondary/attention, green reserved for success only, red reserved for errors only.
- **Photo slots**: every cafeteria card and every menu item gets a fixed-aspect, rounded photo slot for real food photography uploaded via the CMS — this is central to the feel, not an afterthought bolted on later.

## 5. Layout and spacing system

This is what actually makes a page feel organized rather than sparse or ad hoc — treat these as concrete rules, not loose suggestions. Most "doesn't look nice/organized" complaints trace back to a missing spacing system before they trace back to color.

- **Spacing scale**: use a consistent base-8 scale (8, 16, 24, 32, 48, 64px) for every margin, padding, and gap in the app. No arbitrary one-off values.
- **Page container**: max-width around 1200px, centered on the page, with horizontal padding of 24px on mobile and 48–64px on desktop. Content should never span the full edge-to-edge width of a wide viewport.
- **Header**: consistent vertical padding (32–40px), and its content aligned to the same max-width container as the page body below it — not full-bleed with cramped internal alignment.
- **Cafeteria grid**: a real responsive grid, not a single stretched column — 1 column on mobile, 2 on tablet, 3–4 on desktop, with a consistent 24px gap between cards. A single cafeteria card should never float alone in an otherwise empty viewport: cap the grid container's width so a lone card sits in a naturally sized layout instead of being stranded in unbounded space, and consider a visible "more cafeterias coming soon" placeholder alongside it so the page still reads as intentional rather than incomplete.
- **Cards**: consistent internal padding (16–20px), one consistent photo-slot aspect ratio used everywhere (pick one, e.g. 4:3), and consistent spacing between the photo, title, and subtitle.
- **Vertical rhythm**: consistent spacing between major page sections (e.g. 48–64px between the header and the content grid below it) so every page follows the same repeatable rhythm instead of default browser spacing.
- **Whitespace principle**: generous whitespace is meant to feel premium — that means intentional, contained breathing room around content, not an unbounded void next to a single stranded element. If a screen looks unorganized, check the container width and spacing scale before touching color.

## 6. Per-screen guidance

**Browse** — cream background, brand blue header bar, cafeteria cards each with a photo slot, name, and short tag.

**Cafeteria menu / plate builder** — primary plate section first, backup plate section immediately after, spoon quantities controlled by pill-shaped +/- steppers, running totals in bold. The match indicator is amber while mismatched ("₦X more needed") and switches to green only once the backup total equals the primary total ("Backup matches your order") — this is the one designed moment green appears, and the transition should feel like a small reward.

**Checkout** — destination dropdown, a clear food total / delivery fee / grand total breakdown, a brand blue pill-shaped "Place order" button, and a payment-proof upload styled as a friendly prompt rather than a bare file input.

**Operator/courier dashboard** — calmer and more neutral than the customer site (it's a working tool, not a storefront), but the brand blue stays the accent color for primary actions (confirm payment, claim order, mark delivered) so it still reads as the same product rather than a bolted-on separate system.

## 7. Micro-interactions

- Adding a spoon to an item: a brief scale/bounce on the count as it updates.
- The match pill flipping from amber to green: a quick, satisfying color-and-icon transition when the totals converge.
- Placing an order: a small celebratory moment (e.g., a brief check-mark animation), not a full-screen takeover.
- Keep all of these fast — well under a quarter second — so they read as responsive polish, not showiness that slows the flow down.

## 8. What to avoid

- Stark white backgrounds anywhere on the customer-facing site.
- Generic, flat corporate blue/gray — the brand blue (`#13486A`) is deliberately deep and paired with the warm cream base and rounded shapes, not a cold SaaS palette.
- Sharp, minimal corners — this is a warm, appetite-forward brand, not a fintech dashboard.
- Green used anywhere outside the one semantic success case. If green starts showing up as a general accent, that's a sign the direction has drifted.

## 9. Icons

Use **Tabler Icons** (`@tabler/icons-react`), outline style only — never filled/solid variants. Outline icons match the rounded, friendly shape language better than heavy filled icons would. Use icons functionally (back arrows, upload, plus/minus steppers, checkmarks) rather than as standalone decoration. Standard inline size 16–20px; nothing larger unless it's a genuinely empty-state illustration moment (see Section 9).

## 10. States and transitions

These are just as much a part of "the look and feel" as the happy path, and are exactly the kind of thing that reads as generic/unfinished if left to a framework default.

- **Loading**: use soft, tinted skeleton blocks (rounded, matching the photo-slot treatment) rather than a bare spinner — a loading cafeteria grid should look like faded versions of the real cards, not a generic loading wheel.
- **Empty states**: specific and warm, never a bare "No data found." E.g., no cafeterias currently open, or no delivery fee configured yet for a destination — say what's actually true and what the person should do next (nothing to do, or check back later).
- **Error states**: clear and kind, never a raw exception message. Errors use their own dedicated red tone (`#993C1D` light / `#F0997B` dark, Section 2), deliberately decoupled from the brand blue — pair error copy with a warning/error icon so failures read as a distinct, intentional treatment rather than a stray red text color.
- **Transitions**: simple, fast fades or slides between screens (browse → cafeteria → checkout), under 250ms. No heavy full-screen page-transition animations — those slow down perceived speed, which matters more than flourish here.

## 11. Voice and content

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

## 12. Reference

There is no external mockup file to consult — Section 5 above is the complete, self-contained layout description for each screen. Build directly from it rather than assuming a visual reference exists elsewhere in the repo.
