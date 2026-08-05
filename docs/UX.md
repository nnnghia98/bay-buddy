# Bay Buddy UX System

This document sits beside `docs/DESIGN.md`.

- `docs/DESIGN.md` defines the visual baseline: Astryx Design, the default Neutral theme, semantic tokens, compact controls, simple borders, and restrained elevation.
- `docs/UX.md` defines how Bay Buddy should feel and behave as an operations product.
- Generic/community frontend skills may assist with general UI craft, but they do not override this document or `docs/DESIGN.md`.

The chosen direction is **Command Center, Calm Edition**.

## 1. UX North Star

Bay Buddy is an internal operating system for a Vietnamese travel finance team. It should help staff answer four questions quickly:

1. Who needs attention now?
2. What changed today?
3. What is the current công nợ state?
4. What action should I take next?

The UI must prioritize repeat work over presentation. It should feel calm, dense enough for operations, and visually easy to scan.

The `/debts/input` page is the reference pattern for function-first operations UI: one focused form, one adjacent table, the primary action attached to the form, minimal framing, and no redundant title/header cards.

### Manual debt entry contract

Keep the `/debts/input` form stable around this validation contract:

- `Khách hàng` is the only always-required field. Its label must show the
  required state and its input must use native required validation.
- PNR, airline, ticket number, passengers, route, flight date, ticket issue
  date, pricing fields, and payment details are optional. Blank numeric values
  are treated as `0`, and the date inputs default to today in the UI.
- PNR must contain exactly six characters when provided.
- The manual debt form does not record a payment amount. A payment method is
  required when a payment date is entered. The selected method and date are
  stored on the debt charge; the row stays unpaid.
- Keep this contract in the shared Zod schema and the server action. Do not
  make another field required without updating this section and both validation
  boundaries.

### Manual debt edit drawer contract

The `/debts/input` edit drawer must keep the manual entry priority order so staff
can review and correct a row without searching through database-shaped fields:

1. Customer context, ticket issue date, and passengers.
2. Pricing: EV, AST, THF, WEB, insurance, selling price, airline discount, net
   price correction, and true income.
3. Optional payment method, date, and note details. Payment amount is recorded
   through the customer payment flow, not this drawer.
4. Route.
5. Low-priority ticket metadata: PNR, ticket number, airline, and flight
   datetime.
6. Read-only ticket status and audit timestamps.

Customer and ticket status are not editable. Created and updated timestamps are
also read-only audit metadata. Every other supported ticket, pricing, route, and
payment field exposed by the correction action remains editable.

## 2. Product Personality

Bay Buddy should feel:

- **Operational**: Work queues, document statuses, customer debt, and exceptions are visible without hunting.
- **Trustworthy**: Finance values, invoice states, and audit-sensitive actions are presented with clear labels and stable layouts.
- **Vietnam-first**: UI labels preserve terms such as `công nợ`, `Tiền dư / Đặt cọc`, `Số tiền bằng chữ`, `báo có`, and `báo nợ`.
- **Fast to repeat**: Daily actions should be reachable with minimal navigation, especially payment recording, invoice review, ticket capture, and customer lookup.
- **Calm**: The product should use Astryx Neutral with restrained hierarchy and avoid oversized marketing-style cards and decorative layouts.

## 3. Visual Direction

Use `docs/DESIGN.md` as the source of truth for visual tokens:

- Neutral theme primary text for important information.
- The Neutral semantic accent for primary actions, active states, and key links.
- Theme surfaces with subtle semantic borders for working areas.
- Muted theme surfaces for table headers, side panels, and grouped metadata.
- Astryx elevation tokens only where they clarify layering.

Add these UX-specific visual rules:

- Use compact working surfaces for dashboards, ledgers, invoices, and ticket capture.
- Avoid giant hero cards inside authenticated app pages.
- Use Astryx shape tokens: `--radius-inner` for compact details, `--radius-element` for controls, and `--radius-container` for panels and dialogs.
- Use status chips with text and color together; never rely on color alone.
- Make primary actions visually persistent near the data they affect.
- Prefer tables for financial records on desktop and mobile-safe stacked rows or horizontal scroll on narrow screens.
- Keep typography proportional to context: dashboard panels and cards use compact headings, not landing-page scale.
- Remove presentation-only UI. If a header, description, metric card, or helper sentence does not help the current decision or action, omit it.

## 4. Information Architecture

### Dashboard

The dashboard becomes the command center. It should not be a general marketing-style summary.

Required dashboard sections:

- **Today / Needs Action**: customers with unpaid balance, draft invoices, quotes near expiry, tickets awaiting confirmation, and failed or incomplete workflows.
- **Financial Snapshot**: total receivables, held credit / deposits, revenue, margin, and payment activity.
- **Top Debt / Risk Queue**: customers ranked by outstanding balance, recent activity, or overdue status when available.
- **Recent Work**: latest tickets, payments, invoices, and quotes.
- **Primary Shortcuts**: record payment, capture ticket, open customers, open invoices.

### Customers

Customer views should make the current debt state obvious.

Required customer ledger behavior:

- Show customer name, type, balance state, current balance, and action buttons above the ledger.
- Label negative balances as `Tiền dư / Đặt cọc`.
- Keep `Record Payment` close to the balance and ledger table.
- Preserve running balance visibility in the ledger.
- Distinguish tickets, payments, refunds, discounts, and additional fees with both text labels and visual treatment.
- Timeline/history columns must show `created_at` / `updated_at` audit timestamps. Show ticket `flight_date` only as flight detail metadata, never as the history timestamp.
- Show empty, error, pending, optimistic, and rollback states explicitly.

### Tickets

Ticket capture should feel like a guided verification workflow.

Required ticket capture stages:

1. Upload booking confirmation or e-ticket.
2. Parse with AI.
3. Review extracted fields.
4. Confirm and create the financial debt entry.

UX rules:

- The file preview and extracted data should stay side by side on desktop.
- Validation errors must be attached to fields and announced accessibly.
- AI parse pending state must be visible in the upload area and primary action.
- Parsed values should be treated as suggestions until staff confirms them.
- Confirmation copy must communicate that saving a confirmed ticket creates công nợ.

### Invoices

Invoices are formal financial documents. The UI should emphasize status, snapshot integrity, and printability.

Required invoice behavior:

- Show invoice number, status, customer snapshot, total, issued date, and printable action above line items.
- Clearly mark locked states for `ISSUED` and `PAID`.
- Keep snapshot fields visually grouped and labeled as historical document data.
- Use tables for line items on desktop.
- Public invoice views must feel print-ready and avoid app-shell clutter.

### Quotes

Quotes are informational until accepted. The UX must prevent staff from confusing quotes with ledger-impacting invoices.

Required quote behavior:

- Show quote status, valid-until date, customer snapshot, total, and conversion action.
- Clearly state that a quote does not affect công nợ until converted.
- Show conversion availability based on status.
- After conversion, redirect to the created invoice.

## 5. Interaction Patterns

### Action Placement

- Put the most common action near the object it changes.
- Use one visually dominant primary action per work area.
- Use outline or secondary actions for navigation and printing.
- Avoid burying finance actions inside unrelated card groups.
- On long workbench forms, keep the primary submit action pinned above the form's internal scroll area so staff can act without returning to the bottom of the page.

### Status Communication

Every workflow state must be visible:

- Loading
- Empty
- Pending mutation
- Success
- Error
- Optimistic update
- Rollback or failed confirmation
- Locked / read-only state

Use `aria-live` or `role="alert"` for form and mutation errors.

### Tables

Tables are the default for financial and ledger records.

Table requirements:

- Align money values to the right.
- Keep dates scannable in `DD/MM/YYYY` format.
- Keep running balance visible where relevant.
- Use stable default ordering for editable tables. The ticket debt workbench
  sorts by immutable ticket `created_at` descending, so saving an edit does not
  move the active row. A user-selected sort may reorder rows normally.
- The debt report date range, pagination, default table order, and Excel export
  use ticket `booked_at` (`Ngày xuất vé`) descending. Keep the report filter
  labels explicit about this date basis.
- On `/debts/input`, the pencil action opens the right-side edit drawer. Keep
  table cells read-only, use an explicit save action, and keep validation or
  mutation failures visible in the drawer.
- Use sticky or repeated context where long tables would separate rows from the current customer/document.
- On mobile, use horizontal scroll or stacked row cards. Tables must not break the viewport.
- Use icon-only row actions for high-frequency repeated operations when the icon is familiar. Keep accessible names with `aria-label` and `title`.
- Size action columns to their controls, not to old text labels.

### Forms

Forms must follow the App Router standard from the DNA:

- Reuse shared Zod schemas across client and server boundaries.
- Prefer Server Actions for mutations.
- Use `useActionState` or `useFormState` for form state.
- Use `useFormStatus` for submit pending state.
- Attach labels to all inputs.
- Do not rely on placeholder text as labels.
- Keep validation errors close to the field and accessible.
- On desktop workbench pages, long forms should scroll inside their panel instead of pushing the whole page. Keep the adjacent table available for context.
- Order fields by operational priority, not database schema order.
- Optional payment controls should start inactive: keep the payment type empty and
  enable the optional payment date only after staff chooses a payment type.

## 6. Page-Level UX Rules

### Authenticated App Shell

- Sidebar navigation should support fast repeated use.
- The homepage should be represented once in the shell. Use the Bay Buddy logo as the direct route back to `/` rather than duplicating a separate homepage item in the left navigation.
- The homepage breadcrumb label should be locale-aware and read as `Trang chủ` in Vietnamese and `Home` in English.
- The sidebar logo should feel like a calm brand anchor, centered and visually lightweight, without an extra decorative card container around it.
- Breadcrumbs should clarify location without becoming the main navigation.
- Quick search can be introduced later only when it is fully implemented and interactive. Do not show placeholder shell utilities that look clickable.
- Mobile navigation must preserve access to the same major work areas.

### Authenticated Workbench Pages

Use this page model when staff need to enter or edit records while watching a table, ledger, or queue.

- Use a two-column desktop layout: left form, right table or ledger.
- Do not create a redundant page title card, intro card, or summary strip when the breadcrumb and controls already establish context.
- Keep form sections compact and directly named by labels such as `Khách hàng`, `Ngày xuất vé`, `Giá và thu nhập`, and `Hành trình`.
- Keep the form panel full-height on desktop and scroll only the fields, not the whole page.
- Keep table filters and the table itself in the right panel.
- Prefer dense, function-first controls over explanatory copy. Add helper copy only for risk, validation, irreversible action, or domain ambiguity.

### Empty States

Empty states should offer the next useful action.

Examples:

- No invoices for a customer: link back to customer ledger and explain invoice generation context.
- Empty ledger: show that no debt or payment records exist and offer ticket capture or payment action where valid.
- No file uploaded: show accepted file types and the parse action disabled until a file is present.

### Error States

Errors must say what failed and what the user can do next.

Examples:

- Session expired: redirect to login or show clear login recovery.
- Payment action failed: remove optimistic ledger row and show the failure message.
- AI parse failed: keep the uploaded file, show the error, and allow retry.

## 7. Accessibility Rules

- All icon-only buttons must have accessible names.
- All interactive elements must be keyboard reachable.
- Focus states must remain visible.
- Text contrast must meet at least 4.5:1 for normal text.
- Do not encode financial meaning by color alone.
- Tables must have semantic table structure when presenting tabular records.
- Respect reduced motion preferences for transitions and loading effects.

## 8. Implementation Phases

### Phase 1: UX Foundations

- Keep `docs/DESIGN.md` as token source.
- Add shared page patterns for command-center headers, status chips, metric panels, action bars, empty states, and table wrappers.
- Audit current UI for hard-coded labels and move user-facing text into `next-international`.

### Phase 2: Dashboard Command Center

- Rework the dashboard into action queues plus financial snapshot.
- Prioritize daily work, top debtors, recent activity, and shortcuts.
- Keep data reads in React Server Components.

### Phase 3: Customer Ledger

- Tighten ledger hierarchy around current balance and `Record Payment`.
- Improve optimistic payment states, rollback messaging, and row labeling.
- Make ledger table responsive and easier to scan.

### Phase 4: Finance Documents

- Rework invoice and quote screens into status-first document workflows.
- Clarify snapshot data, locked states, quote conversion, and public print paths.
- Improve document list scanning and mobile behavior.

### Phase 5: Ticket Capture

- Convert ticket capture into a clear upload -> parse -> review -> confirm flow.
- Preserve side-by-side review on desktop and a single-column guided flow on mobile.
- Move mutation patterns toward Server Actions where backend support allows.

## 9. Anti-Patterns

Avoid:

- Authenticated pages that look like landing pages.
- Community-skill patterns that add heroes, AIDA marketing sections, cinematic scroll effects, or decorative motion to authenticated work surfaces.
- Oversized hero sections that push work below the fold.
- Decorative cards around every section.
- Color-only status or balance meaning.
- Wide tables that overflow mobile layouts without containment.
- Client-side initial data fetching when RSC can load the page data.
- Hard-coded UI text outside localization files.
- Mixing quote and invoice semantics in a way that suggests quotes affect công nợ.

## 10. Success Criteria

The UX rework is successful when:

- Staff can identify urgent customer, ticket, invoice, and payment work from the dashboard.
- Customer debt state is understandable within a few seconds.
- Payment recording feels immediate and rollback-safe.
- Invoice and quote states are visually distinct and legally/commercially precise.
- Ticket capture clearly separates AI extraction from human confirmation.
- The interface remains calm, professional, and Vietnamese-first.
