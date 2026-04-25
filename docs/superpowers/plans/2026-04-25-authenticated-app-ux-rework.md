# Authenticated App UX Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework Bay Buddy authenticated pages so the shell is slimmer, section contrast is clearer, and data-heavy work surfaces get more visible space without losing the product's calm operational tone.

**Architecture:** Implement the redesign from the outside in. First, create shared layout tokens and shell helpers that control sidebar width, page gutters, section wrappers, and contrast. Then refactor shared command-center primitives so dashboard, customer, invoice, quote, and ticket-capture pages can adopt the same compact structure with minimal one-off styling.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Vitest

---

## File Structure

- Modify: `apps/web/src/app/globals.css`
  Responsibility: tone down the authenticated background, tighten radii/shadows, and add shared semantic tokens for shell width and work-surface spacing.
- Create: `apps/web/src/lib/authenticated-layout.ts`
  Responsibility: centralize class-name decisions for authenticated shell density and section wrappers so they can be tested without React DOM helpers.
- Test: `apps/web/src/lib/authenticated-layout.test.ts`
  Responsibility: verify compact shell/page/work-surface class decisions.
- Modify: `apps/web/src/components/app-shell.tsx`
  Responsibility: slim the sidebar, reduce internal framing, shorten the sticky header, and widen main-content space.
- Modify: `apps/web/src/components/command-center.tsx`
  Responsibility: provide compact shared wrappers for page headers, action bars, and table sections.
- Test: `apps/web/src/lib/dashboard.test.ts`
  Responsibility: keep existing dashboard behavior green while shared wrappers are introduced.
- Modify: `apps/web/src/components/financial-summary-dashboard.tsx`
  Responsibility: remove the oversized dark hero feel and adopt the new command-center structure.
- Modify: `apps/web/src/app/customers/page.tsx`
  Responsibility: compress the intro/search/metrics area and make the table dominant.
- Modify: `apps/web/src/components/customer-ledger-client.tsx`
  Responsibility: reduce hero treatment, keep balance/payment controls visible, and make the ledger the primary surface.
- Modify: `apps/web/src/app/customers/[id]/page.tsx`
  Responsibility: align the invoice shortcut section with the compact page rhythm.
- Modify: `apps/web/src/app/invoices/page.tsx`
  Responsibility: replace large intro cards with compact finance-document page structure.
- Modify: `apps/web/src/app/invoices/[id]/page.tsx`
  Responsibility: compress snapshot panels and line-item layout while preserving invoice lock-state clarity.
- Modify: `apps/web/src/app/quotes/[id]/page.tsx`
  Responsibility: keep quote status/conversion clear without oversized decorative cards.
- Modify: `apps/web/src/app/tickets/capture/page.tsx`
  Responsibility: reduce top framing, enlarge preview/form workspace, and keep the AI workflow obvious.

### Task 1: Shared Authenticated Layout Foundations

**Files:**
- Create: `apps/web/src/lib/authenticated-layout.ts`
- Test: `apps/web/src/lib/authenticated-layout.test.ts`
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest"

import {
  getAuthenticatedMainClassName,
  getAuthenticatedShellClassName,
  getWorkSurfaceClassName,
} from "./authenticated-layout"

describe("authenticated-layout", () => {
  it("returns slimmer shell and wider content defaults", () => {
    expect(getAuthenticatedShellClassName()).toContain("lg:grid-cols-[248px_minmax(0,1fr)]")
    expect(getAuthenticatedMainClassName()).toContain("max-w-[1600px]")
    expect(getWorkSurfaceClassName()).toContain("rounded-xl")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn --cwd apps/web test authenticated-layout.test.ts`
Expected: FAIL with `Cannot find module './authenticated-layout'`

- [ ] **Step 3: Write minimal implementation**

```ts
const AUTHENTICATED_SHELL_CLASS_NAME =
  "lg:grid lg:grid-cols-[248px_minmax(0,1fr)]"

const AUTHENTICATED_MAIN_CLASS_NAME =
  "mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-7"

const WORK_SURFACE_CLASS_NAME =
  "rounded-xl border border-border bg-white shadow-sm"

export function getAuthenticatedShellClassName(): string {
  return AUTHENTICATED_SHELL_CLASS_NAME
}

export function getAuthenticatedMainClassName(): string {
  return AUTHENTICATED_MAIN_CLASS_NAME
}

export function getWorkSurfaceClassName(): string {
  return WORK_SURFACE_CLASS_NAME
}
```

- [ ] **Step 4: Update global tokens to match the new foundation**

```css
:root {
  --theme-app-canvas: #f4f7fa;
  --theme-surface-soft: #f6f8fb;
  --theme-panel-border-strong: #cfd9e4;
  --radius: 0.625rem;
  --shadow-sm:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 0 0 1px rgba(255, 255, 255, 0.72) inset;
}

body {
  background: linear-gradient(180deg, #f7f9fc 0%, #f4f7fa 100%);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `yarn --cwd apps/web test authenticated-layout.test.ts`
Expected: PASS with `1 passed`

- [ ] **Step 6: Run lint for the touched files**

Run: `yarn --cwd apps/web eslint src/lib/authenticated-layout.ts src/lib/authenticated-layout.test.ts src/app/globals.css`
Expected: exit code `0`

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/authenticated-layout.ts apps/web/src/lib/authenticated-layout.test.ts apps/web/src/app/globals.css
git commit -m "feat: add authenticated layout foundations"
```

### Task 2: Slim The Shell And Shared Page Wrappers

**Files:**
- Modify: `apps/web/src/components/app-shell.tsx`
- Modify: `apps/web/src/components/command-center.tsx`
- Modify: `apps/web/src/lib/authenticated-layout.ts`
- Test: `apps/web/src/lib/authenticated-layout.test.ts`

- [ ] **Step 1: Expand the failing test to cover compact wrapper variants**

```ts
it("returns compact page header and table wrapper classes", () => {
  expect(getPageHeaderClassName()).toContain("min-h-14")
  expect(getPageHeaderClassName()).not.toContain("min-h-20")
  expect(getTableSectionClassName()).toContain("border-[color:var(--theme-panel-border-strong)]")
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn --cwd apps/web test authenticated-layout.test.ts`
Expected: FAIL with `getPageHeaderClassName is not defined`

- [ ] **Step 3: Implement the new shell helper exports**

```ts
const PAGE_HEADER_CLASS_NAME =
  "min-h-14 border-b border-border/90 bg-white/92 backdrop-blur-md"

const TABLE_SECTION_CLASS_NAME =
  "overflow-hidden rounded-xl border border-[color:var(--theme-panel-border-strong)] bg-white shadow-sm"

export function getPageHeaderClassName(): string {
  return PAGE_HEADER_CLASS_NAME
}

export function getTableSectionClassName(): string {
  return TABLE_SECTION_CLASS_NAME
}
```

- [ ] **Step 4: Apply the shell refactor in `app-shell.tsx`**

```tsx
<aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r border-sidebar-border bg-[#f6f8fb] px-4 py-4 lg:block">
  <div className="flex h-full flex-col">
    <div className="border-b border-border px-2 pb-4">
      <p className="text-lg font-medium tracking-[-0.02em] text-foreground">Bay Buddy</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
        Hệ điều hành nội bộ
      </p>
    </div>
    <div className="flex-1 overflow-y-auto py-4">
      <ShellNavigation pathname={pathname} />
    </div>
    <div className="border-t border-border px-2 pt-4">
      <p className="text-sm font-medium text-foreground">{userName}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">{userRole}</p>
    </div>
  </div>
</aside>

<header className={getPageHeaderClassName()}>
  <div className="flex min-h-14 items-center gap-3 px-4 py-3 sm:px-6 lg:px-7">
    <nav className="min-w-0 flex-1 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{breadcrumbs.at(-1)?.label}</span>
    </nav>
    <Button className="hidden md:inline-flex" size="sm" type="button" variant="outline">
      Tìm nhanh
    </Button>
  </div>
</header>

<main className="min-h-[calc(100vh-3.5rem)]">
  <div className={getAuthenticatedMainClassName()}>{children}</div>
</main>
```

- [ ] **Step 5: Refactor `command-center.tsx` to provide compact reusable wrappers**

```tsx
type CommandPanelHeaderProps = {
  eyebrow?: string
  title: string
  titleId?: string
  description?: string
  action?: ReactNode
}

export function CommandPanel({ children, className, ...props }: ComponentPropsWithoutRef<"section">) {
  return (
    <section
      className={cn(getWorkSurfaceClassName(), className)}
      {...props}
    >
      {children}
    </section>
  )
}

export function CommandPanelHeader({
  title,
  description,
  action,
  eyebrow,
  titleId,
}: CommandPanelHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-secondary/45 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-base font-medium tracking-[-0.02em] text-foreground" id={titleId}>
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `yarn --cwd apps/web test authenticated-layout.test.ts`
Expected: PASS with all `authenticated-layout` tests passing

- [ ] **Step 7: Run lint for shared UI files**

Run: `yarn --cwd apps/web eslint src/components/app-shell.tsx src/components/command-center.tsx src/lib/authenticated-layout.ts src/lib/authenticated-layout.test.ts`
Expected: exit code `0`

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/app-shell.tsx apps/web/src/components/command-center.tsx apps/web/src/lib/authenticated-layout.ts apps/web/src/lib/authenticated-layout.test.ts
git commit -m "feat: rebalance authenticated app shell"
```

### Task 3: Rework Dashboard And Customer Surfaces

**Files:**
- Modify: `apps/web/src/components/financial-summary-dashboard.tsx`
- Modify: `apps/web/src/app/customers/page.tsx`
- Modify: `apps/web/src/components/customer-ledger-client.tsx`
- Modify: `apps/web/src/app/customers/[id]/page.tsx`
- Test: `apps/web/src/lib/dashboard.test.ts`
- Test: `apps/web/src/lib/finance-core.test.ts`

- [ ] **Step 1: Add failing coverage for the shared dashboard and ledger assumptions**

```ts
it("keeps the receivables queue available for compact command-center rendering", () => {
  const summary = buildFinancialSummarySnapshot({ customers, tickets, transactions })
  expect(summary.actionQueues[0]?.key).toBe("receivables")
})

it("preserves optimistic ledger ordering after a payment is inserted", () => {
  const nextLedger = applyOptimisticPaymentToLedger(ledgerFixture, { amount: 500000, note: "test" })
  expect(nextLedger.entries.at(-1)?.entry_type).toBe("payment")
})
```

- [ ] **Step 2: Run tests to verify they still expose the current baseline before refactor**

Run: `yarn --cwd apps/web test src/lib/dashboard.test.ts src/lib/finance-core.test.ts`
Expected: PASS before UI refactor so you know later failures come from regressions, not broken fixtures

- [ ] **Step 3: Rework `financial-summary-dashboard.tsx` around compact shared panels**

```tsx
<CommandPanel>
  <CommandPanelHeader
    eyebrow={t("dashboard.summary.eyebrow")}
    title={t("dashboard.summary.commandCenter.title")}
    description={t("dashboard.summary.commandCenter.description")}
    action={
      <Button asChild size="sm" variant="outline">
        <Link href="/customers">{t("dashboard.summary.commandCenter.shortcuts.customers.label")}</Link>
      </Button>
    }
  />
  <div className="grid gap-3 p-4 lg:grid-cols-3">
    {primaryWidgets.map((widget) => {
      const Icon = widget.icon

      return (
        <div key={widget.key} className="rounded-lg border border-border bg-secondary/35 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {widget.label}
              </p>
              <p className="text-2xl font-medium tracking-[-0.02em] text-foreground">
                {widget.value}
              </p>
              <p className="text-sm leading-6 text-muted-foreground">{widget.detail}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-white text-primary">
              <Icon aria-hidden="true" className="h-4 w-4" />
            </div>
          </div>
        </div>
      )
    })}
  </div>
</CommandPanel>
```

- [ ] **Step 4: Rework `customers/page.tsx` so the table becomes the dominant surface**

```tsx
<div className="space-y-4 text-foreground">
  <CommandPanel>
    <CommandPanelHeader
      eyebrow={t("customers.directory.eyebrow")}
      title={t("customers.directory.title")}
      description={t("customers.directory.description")}
      action={
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-10 pl-9"
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={t("customers.directory.searchPlaceholder")}
            value={searchValue}
          />
        </div>
      }
    />
    <div className="grid gap-3 border-b border-border px-4 py-3 md:grid-cols-3">
      <div className="rounded-lg border border-border bg-secondary/35 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {t("customers.directory.metrics.totalCustomers")}
        </p>
        <p className="mt-2 text-2xl font-medium text-foreground">{directoryStats.totalCustomers}</p>
      </div>
      <div className="rounded-lg border border-border bg-secondary/35 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {t("customers.directory.metrics.outstanding")}
        </p>
        <p className="mt-2 text-2xl font-medium text-foreground">{formatCurrency(directoryStats.outstanding)}</p>
      </div>
      <div className="rounded-lg border border-border bg-secondary/35 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {t("customers.directory.metrics.credit")}
        </p>
        <p className="mt-2 text-2xl font-medium text-foreground">{formatCurrency(directoryStats.credit)}</p>
      </div>
    </div>
    <TableScrollArea>
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/55 hover:bg-secondary/55">
            <TableHead>{t("customers.directory.columns.customer")}</TableHead>
            <TableHead>{t("customers.directory.columns.phone")}</TableHead>
            <TableHead className="text-right">{t("customers.directory.columns.balance")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{customerRows}</TableBody>
      </Table>
    </TableScrollArea>
  </CommandPanel>
</div>
```

- [ ] **Step 5: Rework `customer-ledger-client.tsx` and the route wrapper to make the ledger primary**

```tsx
<div className="space-y-4 text-foreground">
  <CommandPanel>
    <CommandPanelHeader
      eyebrow={t("customers.ledger.eyebrow")}
      title={ledger.customer.name}
      description={`${t("customers.ledger.customerId")}: ${ledger.customer.id}`}
      action={
        <PaymentDialog
          customerId={customerId}
          onOptimisticSubmit={handleOptimisticSubmit}
          onSettled={handleActionSettled}
          ticketOptions={ticketOptions}
        />
      }
    />
    <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-secondary/35 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            {t("customers.ledger.currentBalance")}
          </p>
          <p className="mt-2 text-2xl font-medium text-foreground">
            {formatCurrency(Math.abs(ledger.current_balance))}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-secondary/35 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            {t("customers.ledger.balanceState")}
          </p>
          <p className="mt-2 text-base font-medium text-foreground">
            {balanceStateLabels[ledger.balance_state]}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-secondary/35 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            {t("customers.ledger.entryCount")}
          </p>
          <p className="mt-2 text-2xl font-medium text-foreground">{ledger.entries.length}</p>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-secondary/35 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {t("customers.ledger.amountInWords")}
        </p>
        <p className="mt-2 text-sm leading-6 text-foreground">{currentBalanceInWords}</p>
      </div>
    </div>
  </CommandPanel>

  <CommandPanel>
    <CommandPanelHeader
      title={t("customers.ledger.tableTitle")}
      description={t("customers.ledger.tableDescription")}
    />
    <TableScrollArea>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("customers.ledger.columns.date")}</TableHead>
            <TableHead>{t("customers.ledger.columns.type")}</TableHead>
            <TableHead>{t("customers.ledger.columns.content")}</TableHead>
            <TableHead className="text-right">{t("customers.ledger.columns.amount")}</TableHead>
            <TableHead className="text-right">{t("customers.ledger.columns.runningBalance")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{ledgerRows}</TableBody>
      </Table>
    </TableScrollArea>
  </CommandPanel>
</div>
```

- [ ] **Step 6: Run behavior tests and lint**

Run: `yarn --cwd apps/web test src/lib/dashboard.test.ts src/lib/finance-core.test.ts`
Expected: PASS

Run: `yarn --cwd apps/web eslint src/components/financial-summary-dashboard.tsx src/app/customers/page.tsx src/components/customer-ledger-client.tsx 'src/app/customers/[id]/page.tsx'`
Expected: exit code `0`

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/financial-summary-dashboard.tsx apps/web/src/app/customers/page.tsx apps/web/src/components/customer-ledger-client.tsx apps/web/src/app/customers/[id]/page.tsx
git commit -m "feat: compact dashboard and customer work surfaces"
```

### Task 4: Rework Invoice, Quote, And Ticket-Capture Pages

**Files:**
- Modify: `apps/web/src/app/invoices/page.tsx`
- Modify: `apps/web/src/app/invoices/[id]/page.tsx`
- Modify: `apps/web/src/app/quotes/[id]/page.tsx`
- Modify: `apps/web/src/app/tickets/capture/page.tsx`
- Test: `apps/web/src/lib/finance-documents.test.ts`

- [ ] **Step 1: Add a failing finance-document test that protects compact page assumptions indirectly**

```ts
it("parses invoice and quote snapshots needed by the compact detail pages", () => {
  expect(invoiceDetail.items.length).toBeGreaterThan(0)
  expect(quoteDetail.amount_in_words).toBeTruthy()
})
```

- [ ] **Step 2: Run test to verify the finance fixtures remain green before refactor**

Run: `yarn --cwd apps/web test src/lib/finance-documents.test.ts`
Expected: PASS before UI changes

- [ ] **Step 3: Rework invoices and quotes into compact document pages**

```tsx
<div className="space-y-4 text-foreground">
  <CommandPanel>
    <CommandPanelHeader
      eyebrow={t("financeDocuments.invoices.detail.eyebrow")}
      title={`${t("financeDocuments.invoices.detail.titlePrefix")} ${invoice.invoice_number}`}
      description={t("financeDocuments.common.snapshotNotice")}
      action={
        <Button asChild variant="outline">
          <Link href={`/invoices/${invoice.id}/public`}>
            {t("financeDocuments.invoices.detail.publicLink")}
          </Link>
        </Button>
      }
    />
    <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.2fr)_360px]">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-secondary/35 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            {t("financeDocuments.common.customer")}
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground">{invoice.customer_name_snapshot}</p>
        </div>
        <div className="rounded-lg border border-border bg-secondary/35 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            {t("financeDocuments.common.createdAt")}
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground">{formatDateTime(invoice.created_at)}</p>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-secondary/35 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {t("financeDocuments.common.total")}
        </p>
        <p className="mt-2 text-2xl font-medium text-foreground">{formatCurrency(invoice.total_amount)}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{invoice.amount_in_words}</p>
      </div>
    </div>
  </CommandPanel>

  <CommandPanel>
    <CommandPanelHeader title={t("financeDocuments.invoices.detail.lineItemsTitle")} />
    <TableScrollArea>
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/55 hover:bg-secondary/55">
            <TableHead>{t("financeDocuments.common.columns.description")}</TableHead>
            <TableHead>{t("financeDocuments.common.columns.passenger")}</TableHead>
            <TableHead className="text-right">{t("financeDocuments.common.columns.quantity")}</TableHead>
            <TableHead className="text-right">{t("financeDocuments.common.columns.unitPrice")}</TableHead>
            <TableHead className="text-right">{t("financeDocuments.common.columns.total")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{invoiceItemRows}</TableBody>
      </Table>
    </TableScrollArea>
  </CommandPanel>
</div>
```

- [ ] **Step 4: Rework ticket capture to prioritize preview and form workspace**

```tsx
<div className="space-y-4">
  <CommandPanel>
    <CommandPanelHeader
      eyebrow={t("tickets.capture.eyebrow")}
      title={t("tickets.capture.title")}
      description={t("tickets.capture.description")}
    />
    <div className="grid gap-4 p-4 lg:grid-cols-[minmax(360px,0.95fr)_minmax(0,1.05fr)]">
      <section className="rounded-lg border border-border bg-secondary/35 p-4">
        <Label htmlFor="file-upload-input">{t("tickets.capture.uploadLabel")}</Label>
        <div className="mt-3 min-h-[320px] rounded-lg border border-dashed border-border bg-white">
          {previewUrl ? (
            <img alt={t("tickets.capture.previewAlt")} className="h-full w-full rounded-md object-contain" src={previewUrl} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {t("tickets.capture.emptyPreview")}
            </div>
          )}
        </div>
      </section>
      <section className="rounded-lg border border-border bg-white p-4">
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <Input {...form.register("customerName")} placeholder={t("tickets.capture.fields.customerName")} />
          <Input {...form.register("pnr")} placeholder={t("tickets.capture.fields.pnr")} />
          <Input {...form.register("airline")} placeholder={t("tickets.capture.fields.airline")} />
          <Button className="w-full" type="submit">
            {t("tickets.capture.confirm")}
          </Button>
        </form>
      </section>
    </div>
  </CommandPanel>
</div>
```

- [ ] **Step 5: Run tests, lint, and full web verification**

Run: `yarn --cwd apps/web test src/lib/finance-documents.test.ts src/lib/dashboard.test.ts src/lib/finance-core.test.ts src/lib/authenticated-layout.test.ts`
Expected: PASS

Run: `yarn --cwd apps/web eslint src/app/invoices/page.tsx 'src/app/invoices/[id]/page.tsx' 'src/app/quotes/[id]/page.tsx' src/app/tickets/capture/page.tsx`
Expected: exit code `0`

Run: `yarn --cwd apps/web build`
Expected: successful Next.js production build

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/invoices/page.tsx apps/web/src/app/invoices/[id]/page.tsx apps/web/src/app/quotes/[id]/page.tsx apps/web/src/app/tickets/capture/page.tsx apps/web/src/lib/finance-documents.test.ts
git commit -m "feat: apply ux rework to finance and capture pages"
```
