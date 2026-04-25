---
name: frontend-design
description: Use when building, restyling, or reviewing Bay Buddy pages, components, dashboards, forms, tables, or authenticated app flows in Next.js.
license: Proprietary
metadata:
  author: Bay Buddy
  version: "1.0.0"
---

# Bay Buddy Frontend Design

Use this skill for any UI work in Bay Buddy. It exists to keep the product visually consistent, operationally calm, and aligned with the project's App Router and finance UX standards.

## Source Of Truth

Follow these in order:

1. `AGENTS.md`
2. `docs/DESIGN.md`
3. `docs/UX.md`
4. `docs/DICTIONARY.md`
5. Existing reusable UI patterns in the app

If a generic frontend idea conflicts with Bay Buddy DNA, Bay Buddy DNA wins.

## Product Direction

Bay Buddy is not a marketing site. It is an internal command center for a Vietnamese travel finance team.

Every UI should feel:

- Operational
- Trustworthy
- Vietnam-first
- Fast to repeat
- Calm

The visual direction is "Command Center, Calm Edition" built on the Airtable-inspired system in `docs/DESIGN.md`.

## Non-Negotiables

- Use Vietnamese-first UI copy through `next-international`; do not hard-code user-facing strings.
- Preserve domain terms precisely: `công nợ`, `Tiền dư / Đặt cọc`, `Số tiền bằng chữ`, `báo có`, `báo nợ`.
- Prefer Server Components for reads and Server Actions for mutations.
- For forms, follow the App Router standard: shared Zod schemas, `useActionState` or `useFormState`, and `useFormStatus`.
- Keep pending, success, error, optimistic, rollback, and locked states explicit in the UI.
- Authenticated app pages should feel compact and work-oriented, not like landing pages.
- Tables are the default presentation for financial and ledger data on desktop.
- Money must be easy to scan, right-aligned in tables, and paired with clear labels.

## Visual Rules

- Use white surfaces, deep navy text, Airtable blue accents, subtle borders, and restrained shadows.
- Keep layouts dense enough for operations but never cramped.
- Prefer compact headers, action bars, table wrappers, metric panels, and status chips over oversized hero sections.
- Use one dominant primary action per work area.
- Keep action controls close to the data they mutate.
- Use text plus color for statuses; never color alone.
- Respect the existing shadcn visual language unless a stronger Bay Buddy pattern already exists.

## Page Patterns

### Dashboard

- Prioritize work queues, debt visibility, recent activity, and shortcuts.
- Avoid decorative summary cards with weak operational value.

### Customer Ledger

- Keep balance state, current balance, and `Record Payment` visible near the ledger.
- Label negative balances as `Tiền dư / Đặt cọc`.
- Show optimistic insertion and rollback states clearly.

### Ticket Capture

- Treat AI-parsed values as suggestions until confirmed.
- Keep file preview and extracted fields side by side on desktop when possible.
- Make it obvious that confirmation creates công nợ.

### Invoices And Quotes

- Emphasize status, snapshot integrity, and printability.
- Clearly separate quote behavior from invoice behavior so users do not confuse informational documents with ledger-impacting ones.

## Implementation Checklist

Before shipping UI work, verify:

- Copy is translated and domain-correct.
- Spacing, radius, and color choices match `docs/DESIGN.md`.
- The flow matches `docs/UX.md` for the relevant surface.
- Empty, loading, error, pending, optimistic, rollback, and locked states are handled.
- Mobile behavior is usable.
- Accessibility basics are covered: labels, keyboard reachability, focus visibility, semantic tables, and sufficient contrast.

## Working Style

- Reuse or extend shared UI patterns before inventing one-off components.
- Prefer intentional, polished refinements over flashy novelty.
- When a screen needs a stronger visual hierarchy, solve it with layout, typography, grouping, and status treatment before adding decoration.
