# Finance UI Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the completed Stage 4 finance backend through authenticated Next.js App Router UI for invoices, public invoice printing, quotes, and quote-to-invoice conversion.

**Architecture:** Keep reads in React Server Components wherever possible, using the existing auth cookie to call FastAPI from the server. Keep write operations behind Server Actions or authenticated mutation boundaries. Preserve financial snapshot integrity: invoice and quote UI must render stored snapshot fields, never recompute from live customer/ticket joins.

**Tech Stack:** Next.js 16 App Router, TypeScript, Zod, Astryx Design, token-based CSS Modules, FastAPI Stage 4 finance APIs, Yarn frontend tests, Poetry backend tests.

---

## Current Verified State

The previous window completed and verified these items:

- Backend ticket lifecycle contract is clean and covered: explicit `VOID`, `REFUND`, and `REASSIGN` routes are implemented and legacy broad ticket mutation routes are retired.
- Backend finance write guards are role-aware: finance write routes are admin-only where required, and customer/ticket/payment writes require authenticated users.
- Customer ledger payment flow uses a Server Action, shared Zod validation, optimistic insertion, and now calls `router.refresh()` after payment success to reconcile against the server ledger snapshot.
- App shell now avoids authenticated UI flash while auth is unresolved and logs out/redirects on shell-level `401`.

Fresh verification from the previous window:

```bash
cd /Users/nnnghia98/Projects/bay-buddy/apps/api
poetry run pytest -q tests
# Expected: 15 passed, with only existing FastAPI on_event deprecation warnings.

cd /Users/nnnghia98/Projects/bay-buddy/apps/web
yarn test
# Expected: 23 passed.

cd /Users/nnnghia98/Projects/bay-buddy/apps/web
yarn eslint src/components/app-shell.tsx src/components/payment-dialog.tsx src/lib/auth-session.ts src/lib/auth-session.test.ts
# Expected: pass.
```

## Backend Finance Contract To Use

All routes are under the existing API v1 finance router.

- `GET /api/v1/finance/invoices?customer_id=<uuid>` lists customer-scoped invoices. The backend currently requires `customer_id`.
- `GET /api/v1/finance/invoices/{invoice_id}` returns full invoice details including immutable snapshot fields, line items, and `amount_in_words`.
- `GET /api/v1/finance/invoices/{invoice_id}/public` returns printable invoice payload with Bay Buddy brand info, immutable invoice snapshots, line items, and Vietnamese amount-in-words.
- `PATCH /api/v1/finance/invoices/{invoice_id}` updates draft-only mutable invoice fields. Admin-only.
- `PATCH /api/v1/finance/invoices/{invoice_id}/status` updates invoice lifecycle status and locks linked transactions on issue. Admin-only.
- `POST /api/v1/finance/quotes` creates an informational quote. Admin-only. Quotes must not affect customer balance or ledger rows.
- `GET /api/v1/finance/quotes/{quote_id}` returns quote detail from immutable snapshot fields.
- `POST /api/v1/finance/quotes/{quote_id}/convert-to-invoice` is the only supported quote acceptance bridge. Admin-only.

Relevant backend files:

- `/Users/nnnghia98/Projects/bay-buddy/apps/api/routes/finance.py`
- `/Users/nnnghia98/Projects/bay-buddy/apps/api/models/invoice.py`
- `/Users/nnnghia98/Projects/bay-buddy/apps/api/models/invoice_item.py`
- `/Users/nnnghia98/Projects/bay-buddy/apps/api/models/quote.py`
- `/Users/nnnghia98/Projects/bay-buddy/apps/api/models/quote_item.py`
- `/Users/nnnghia98/Projects/bay-buddy/apps/api/services/invoice_service.py`
- `/Users/nnnghia98/Projects/bay-buddy/apps/api/services/quote_service.py`

## File Map

Create these frontend files:

- `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/schemas/finance-documents.ts`: Zod schemas and TypeScript types for invoice, invoice item, public invoice, quote, quote item, and quote conversion responses.
- `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/lib/server-finance.ts`: Server-only helpers for authenticated finance fetches using the existing auth cookie and `buildApiUrl`.
- `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/lib/finance-documents.test.ts`: Schema and formatting/unit tests for finance document helpers.
- `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/app/invoices/[id]/page.tsx`: Authenticated invoice detail page.
- `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/app/invoices/[id]/public/page.tsx`: Printable public invoice page using the backend public payload.
- `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/app/quotes/[id]/page.tsx`: Authenticated quote detail page with convert CTA.
- `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/actions/quotes.ts`: Server Action for quote conversion.
- `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/actions/quotes.test.ts`: Server Action tests for quote conversion success/error/auth.

Modify these frontend files:

- `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/schemas/index.ts`: Export finance document schemas/types.
- `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/app/invoices/page.tsx`: Replace current redirect with a customer-scoped invoice entry/list state.
- `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/app/customers/[id]/page.tsx`: Add a link or panel for the customer-scoped invoice list when invoice routes exist.
- `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/components/app-shell.tsx`: Enable the invoice nav only after `/invoices` can handle missing `customer_id` gracefully.
- `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/app/customers/page.tsx`: Later Phase 3 cleanup for canonical `Tiền dư / Đặt cọc` semantics.

## Phase 1: Invoice Read And Print Surface

### Task 1.1: Add Finance Document Schemas

**Files:**

- Create: `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/schemas/finance-documents.ts`
- Modify: `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/schemas/index.ts`
- Test: `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/lib/finance-documents.test.ts`

- [ ] **Step 1: Write failing schema tests**

Create tests proving the frontend accepts backend-shaped invoice detail and public invoice payloads:

```ts
import { describe, expect, it } from "vitest"

import {
  InvoiceDetailSchema,
  InvoicePublicViewSchema,
  QuoteDetailSchema,
} from "@/schemas/finance-documents"

describe("finance document schemas", () => {
  it("parses an invoice detail snapshot payload", () => {
    const parsed = InvoiceDetailSchema.parse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      invoice_number: "BB-202604-0001",
      customer_id: "550e8400-e29b-41d4-a716-446655440001",
      customer_name_snapshot: "Cong ty Bay Buddy",
      customer_address_snapshot: "1 Nguyen Hue",
      customer_tax_code_snapshot: "0312345678",
      total_amount: 1500000,
      tax_amount: 0,
      discount_amount: 0,
      status: "DRAFT",
      note: "Invoice note",
      issued_at: null,
      created_at: "2026-04-23T08:00:00Z",
      amount_in_words: "Một triệu năm trăm nghìn đồng",
      items: [
        {
          id: "550e8400-e29b-41d4-a716-446655440002",
          invoice_id: "550e8400-e29b-41d4-a716-446655440000",
          linked_ticket_id: "550e8400-e29b-41d4-a716-446655440003",
          description: "Vé máy bay PNR ABC123",
          quantity: 1,
          unit_price: 1500000,
          unit_price_snapshot: 1500000,
          passenger_name_snapshot: "NGUYEN VAN A",
          total: 1500000,
        },
      ],
    })

    expect(parsed.invoice_number).toBe("BB-202604-0001")
    expect(parsed.items[0].passenger_name_snapshot).toBe("NGUYEN VAN A")
  })

  it("parses a public invoice payload with brand info", () => {
    const parsed = InvoicePublicViewSchema.parse({
      brand: {
        company_name: "Bay Buddy",
        slogan: "Flight and debt management",
        support_email: "support@baybuddy.test",
        hotline: "0900000000",
      },
      invoice: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        invoice_number: "BB-202604-0001",
        customer_id: "550e8400-e29b-41d4-a716-446655440001",
        customer_name_snapshot: "Cong ty Bay Buddy",
        customer_address_snapshot: null,
        customer_tax_code_snapshot: null,
        total_amount: 1500000,
        tax_amount: 0,
        discount_amount: 0,
        status: "ISSUED",
        note: null,
        issued_at: "2026-04-23T09:00:00Z",
        created_at: "2026-04-23T08:00:00Z",
      },
      amount_in_words: "Một triệu năm trăm nghìn đồng",
      items: [],
    })

    expect(parsed.brand.company_name).toBe("Bay Buddy")
    expect(parsed.invoice.status).toBe("ISSUED")
  })

  it("parses a quote detail snapshot payload", () => {
    const parsed = QuoteDetailSchema.parse({
      id: "550e8400-e29b-41d4-a716-446655440010",
      quote_number: "BQ-202604-0001",
      customer_id: "550e8400-e29b-41d4-a716-446655440001",
      customer_name_snapshot: "Cong ty Bay Buddy",
      customer_address_snapshot: null,
      customer_tax_code_snapshot: null,
      total_amount: 1500000,
      tax_amount: 0,
      discount_amount: 0,
      valid_until: "2026-05-01T00:00:00Z",
      status: "DRAFT",
      note: null,
      created_at: "2026-04-23T08:00:00Z",
      amount_in_words: "Một triệu năm trăm nghìn đồng",
      items: [],
    })

    expect(parsed.quote_number).toBe("BQ-202604-0001")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/nnnghia98/Projects/bay-buddy/apps/web
yarn test src/lib/finance-documents.test.ts
```

Expected: fail because `@/schemas/finance-documents` does not exist.

- [ ] **Step 3: Add schemas**

Create Zod schemas that mirror the backend read payloads. Use `z.coerce.date()` for `created_at`, `issued_at`, and `valid_until` so server ISO strings become `Date` objects in UI code.

- [ ] **Step 4: Export schemas**

Update `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/schemas/index.ts` to export all finance document schemas and types.

- [ ] **Step 5: Run tests**

```bash
cd /Users/nnnghia98/Projects/bay-buddy/apps/web
yarn test src/lib/finance-documents.test.ts
```

Expected: pass.

### Task 1.2: Add Server Finance Fetch Helpers

**Files:**

- Create: `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/lib/server-finance.ts`
- Test: use route-level manual verification after pages exist.

- [ ] **Step 1: Create authenticated fetch helper**

Implement helpers that:

- Read `AUTH_TOKEN_COOKIE_KEY` from `cookies()`.
- Redirect to `/login` when missing or when backend returns `401`.
- Unwrap the existing `{ success, data, error }` envelope.
- Validate payloads with the schemas from Task 1.1.

Required exported functions:

- `fetchCustomerInvoices(customerId: string)`
- `fetchInvoiceDetail(invoiceId: string)`
- `fetchInvoicePublicView(invoiceId: string)`
- `fetchQuoteDetail(quoteId: string)`

- [ ] **Step 2: Keep endpoint paths exact**

Use these paths:

```ts
`/finance/invoices?customer_id=${customerId}`
`/finance/invoices/${invoiceId}`
`/finance/invoices/${invoiceId}/public`
`/finance/quotes/${quoteId}`
```

- [ ] **Step 3: Run TypeScript/lint after pages import helpers**

```bash
cd /Users/nnnghia98/Projects/bay-buddy/apps/web
yarn eslint src/lib/server-finance.ts
```

Expected: pass.

### Task 1.3: Replace `/invoices` Redirect With Customer-Scoped Entry Page

**Files:**

- Modify: `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/app/invoices/page.tsx`
- Modify after route exists: `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/components/app-shell.tsx`

- [ ] **Step 1: Implement safe empty state**

If `/invoices` has no `customer_id` query param, render an authenticated page explaining that invoice lists are customer-scoped and ask the user to open a customer ledger first.

- [ ] **Step 2: Implement customer-scoped list state**

If `customer_id` is present, call `fetchCustomerInvoices(customer_id)` and render:

- invoice number
- status badge
- customer snapshot name
- total amount in VND
- created date
- link to `/invoices/{id}`
- link to `/invoices/{id}/public`

- [ ] **Step 3: Enable invoice nav only after this page handles missing customer scope**

In `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/components/app-shell.tsx`, remove `disabled: true` from the invoice nav item after `/invoices` has a safe authenticated empty state.

- [ ] **Step 4: Verify**

```bash
cd /Users/nnnghia98/Projects/bay-buddy/apps/web
yarn eslint src/app/invoices/page.tsx src/components/app-shell.tsx src/lib/server-finance.ts
```

Expected: pass.

### Task 1.4: Add Invoice Detail And Public Print Pages

**Files:**

- Create: `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/app/invoices/[id]/page.tsx`
- Create: `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/app/invoices/[id]/public/page.tsx`

- [ ] **Step 1: Build invoice detail page**

Render from `fetchInvoiceDetail(invoiceId)` only. Required UI fields:

- invoice number
- status
- customer snapshot name, address, tax code
- line item table using snapshot fields
- subtotal-style total amount from backend payload
- `amount_in_words`
- note
- issued timestamp if present
- link to public print page

- [ ] **Step 2: Build public print page**

Render from `fetchInvoicePublicView(invoiceId)` only. Required UI fields:

- brand company name, slogan, support email, hotline
- invoice number and status
- customer snapshot fields
- line item table
- total amount and `amount_in_words`

- [ ] **Step 3: Verify snapshot-only rendering**

Confirm page code does not import customer/ticket schemas or fetch live customer/ticket detail. It should only render the invoice payload returned by finance APIs.

- [ ] **Step 4: Verify**

```bash
cd /Users/nnnghia98/Projects/bay-buddy/apps/web
yarn eslint src/app/invoices/[id]/page.tsx src/app/invoices/[id]/public/page.tsx
```

Expected: pass.

## Phase 2: Quote Detail And Convert-To-Invoice

### Task 2.1: Add Quote Convert Server Action

**Files:**

- Create: `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/actions/quotes.ts`
- Create: `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/actions/quotes.test.ts`

- [ ] **Step 1: Write failing Server Action tests**

Test three cases:

- missing auth cookie returns an error state
- backend `401` or `403` returns a permission/session error state
- success validates `quote` and `invoice`, then returns `invoiceId`

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/nnnghia98/Projects/bay-buddy/apps/web
yarn test src/actions/quotes.test.ts
```

Expected: fail because `@/actions/quotes` does not exist.

- [ ] **Step 3: Implement action**

The action must:

- Read token from `AUTH_TOKEN_COOKIE_KEY`.
- Call `POST /finance/quotes/{quote_id}/convert-to-invoice`.
- Validate the response using quote/invoice schemas.
- Call `revalidatePath('/quotes/{quote_id}')` and `revalidatePath('/invoices/{invoice_id}')`.
- Return `{ status: "success", invoiceId }` on success.

- [ ] **Step 4: Run tests**

```bash
cd /Users/nnnghia98/Projects/bay-buddy/apps/web
yarn test src/actions/quotes.test.ts
```

Expected: pass.

### Task 2.2: Add Quote Detail Page

**Files:**

- Create: `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/app/quotes/[id]/page.tsx`

- [ ] **Step 1: Build quote detail page**

Render from `fetchQuoteDetail(quoteId)` only. Required UI fields:

- quote number
- quote status
- customer snapshot fields
- valid until date
- line item table using quote item snapshots
- total amount and `amount_in_words`
- note

- [ ] **Step 2: Add convert CTA**

Add a form that submits to `convertQuoteToInvoiceAction`. On success, show a link to `/invoices/{invoiceId}` or redirect there.

- [ ] **Step 3: Preserve ledger rule**

Do not show quote rows as ledger-affecting transactions. The UI copy should state that quotes are informational until converted.

- [ ] **Step 4: Verify**

```bash
cd /Users/nnnghia98/Projects/bay-buddy/apps/web
yarn eslint src/app/quotes/[id]/page.tsx src/actions/quotes.ts
yarn test src/actions/quotes.test.ts
```

Expected: pass.

## Phase 3: UI Semantics And Protected-Route Hardening

### Task 3.1: Standardize Negative Balance Semantics In Customer Directory

**Files:**

- Modify: `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/app/customers/page.tsx`

- [ ] **Step 1: Replace inconsistent text**

Use the canonical Vietnamese label exactly:

```text
Tiền dư / Đặt cọc
```

This label is required by `/Users/nnnghia98/Projects/bay-buddy/docs/BUSINESS.md`.

- [ ] **Step 2: Add per-row credit/deposit badge**

When `customer.current_balance < 0`, show a secondary badge or text near the row balance saying `Tiền dư / Đặt cọc`.

- [ ] **Step 3: Verify**

```bash
cd /Users/nnnghia98/Projects/bay-buddy/apps/web
yarn eslint src/app/customers/page.tsx
```

Expected: pass.

### Task 3.2: Consolidate Protected Route Behavior

**Files:**

- Create or modify only after inspecting current App Router layout structure.
- Likely target: `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/app/layout.tsx`
- Existing shell target: `/Users/nnnghia98/Projects/bay-buddy/apps/web/src/components/app-shell.tsx`

- [ ] **Step 1: Inspect current layout tree**

```bash
cd /Users/nnnghia98/Projects/bay-buddy
rg -n "AppShell|AuthProvider|QueryClient|cookies\\(|redirect\\(\"/login\"\\)" apps/web/src/app apps/web/src/components apps/web/src/lib
```

- [ ] **Step 2: Decide whether to add a protected route group**

Prefer a protected route group if it can be done without a large route move. Otherwise keep the current AppShell guard and add focused server-side guards to new finance pages.

- [ ] **Step 3: Verify no authenticated chrome flash**

Ensure `AppShell` still returns `null` while `isReady` is false or token is absent on protected routes.

- [ ] **Step 4: Verify**

```bash
cd /Users/nnnghia98/Projects/bay-buddy/apps/web
yarn test
yarn eslint
```

Expected: all existing tests pass and lint has no new errors from touched files.

## Recommended Execution Order

1. Implement Phase 1 first. It provides immediate user-facing value for the completed backend finance core.
2. Implement Phase 2 after invoice detail/public pages exist, because quote conversion needs a destination invoice page.
3. Implement Phase 3 after finance surfaces are visible, because it is mostly consistency and hardening.

## Subagent Split

Use multi-subagents only where write scopes do not overlap:

- Worker A: finance document schemas and tests. Owns `src/schemas/finance-documents.ts`, `src/schemas/index.ts`, and `src/lib/finance-documents.test.ts`.
- Worker B: invoice pages and server finance fetch helper. Owns `src/lib/server-finance.ts`, `src/app/invoices/page.tsx`, `src/app/invoices/[id]/page.tsx`, and `src/app/invoices/[id]/public/page.tsx`.
- Worker C: quote action and quote detail page. Owns `src/actions/quotes.ts`, `src/actions/quotes.test.ts`, and `src/app/quotes/[id]/page.tsx`.
- Controller: integration review, app shell nav enablement, full verification, and conflict resolution.

## Final Verification Checklist

Run these before claiming completion:

```bash
cd /Users/nnnghia98/Projects/bay-buddy/apps/api
poetry run pytest -q tests

cd /Users/nnnghia98/Projects/bay-buddy/apps/web
yarn test
yarn eslint
```

Expected:

- API tests pass. Existing FastAPI `on_event` deprecation warnings are acceptable unless the task explicitly includes lifespan migration.
- Web tests pass.
- Lint passes for touched frontend files or the whole app.

## Known Risks And Boundaries

- `GET /finance/invoices` currently requires `customer_id`; do not build a global invoice list unless the backend route is extended in a separate backend task.
- Do not render invoice or quote pages from live customer/ticket joins. Use backend snapshot payloads only.
- Do not make quotes affect customer balance or ledger rows. Only `convert_quote_to_invoice` bridges quote acceptance into invoice creation.
- Keep all UI text Vietnamese-first and move reusable labels into `next-international` locale files when the text will be reused beyond one page.
- Do not revert unrelated dirty worktree changes. The repo currently has unrelated modified env/runtime files from earlier work.
