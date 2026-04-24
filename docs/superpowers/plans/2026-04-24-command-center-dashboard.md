# Command Center Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework Bay Buddy's authenticated home dashboard into the first "Command Center, Calm Edition" slice from `docs/UX.md`.

**Architecture:** Keep reads in the existing React Server Component page at `apps/web/src/app/page.tsx`, derive command-center data in pure TypeScript helpers, and render the interactive-free dashboard as a client component only where Recharts requires it. Add small shared UX primitives for status/action panels so later ledger and finance document pages can reuse the same visual language.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, shadcn-style local UI primitives, Tailwind CSS, Recharts, Vitest, next-international.

---

## Scope

This plan implements the first approved UX slice:

- Phase 1 foundations: command-center primitives, status chips, table wrappers, action panels.
- Phase 2 dashboard: action queues, financial snapshot, top debtor/risk queue, recent work, shortcuts.

Out of scope for this plan:

- Customer ledger redesign.
- Invoice and quote detail redesign.
- Ticket capture redesign.
- Backend API changes.

## File Structure

- Modify `apps/web/src/lib/dashboard.ts`: add command-center queue derivation, recent activity derivation, and richer dashboard snapshot types.
- Create `apps/web/src/lib/dashboard.test.ts`: unit tests for queue, recent activity, and metrics derivation.
- Create `apps/web/src/components/command-center.tsx`: small reusable presentational primitives for command-center panels, status chips, action links, and table-safe containers.
- Modify `apps/web/src/components/financial-summary-dashboard.tsx`: replace summary-first layout with command-center layout using the new derived snapshot.
- Modify `apps/web/src/locales/vi.ts`: add Vietnamese-first dashboard command-center copy.
- Modify `apps/web/src/locales/en.ts`: add English fallback dashboard command-center copy.

## Task 1: Add Dashboard Command-Center Derivation Tests

**Files:**
- Create: `apps/web/src/lib/dashboard.test.ts`
- Modify: `apps/web/src/lib/dashboard.ts`

- [ ] **Step 1: Write failing tests for command-center data**

Create `apps/web/src/lib/dashboard.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { buildFinancialSummarySnapshot } from "@/lib/dashboard"
import type { CustomerDirectoryItem } from "@/schemas/customer"
import type { TicketRead } from "@/schemas/ticket"
import type { TransactionRead } from "@/schemas/transaction"

const customerA: CustomerDirectoryItem = {
  id: "11111111-1111-4111-8111-111111111111",
  full_name: "Cong ty Sen Vang",
  phone: "0900000001",
  current_balance: 18_500_000,
}

const customerB: CustomerDirectoryItem = {
  id: "22222222-2222-4222-8222-222222222222",
  full_name: "Le Thi Mai",
  phone: "0900000002",
  current_balance: -2_000_000,
}

const customerC: CustomerDirectoryItem = {
  id: "33333333-3333-4333-8333-333333333333",
  full_name: "Tran Van Nam",
  phone: "0900000003",
  current_balance: 1_250_000,
}

const ticketA: TicketRead = {
  id: "44444444-4444-4444-8444-444444444444",
  pnr: "ABC123",
  airline: "VNA",
  passengers: ["NGUYEN VAN A"],
  itinerary: "HAN-SGN",
  flight_date: new Date("2026-04-24T02:00:00.000Z"),
  net_price: 1_000_000,
  selling_price: 1_250_000,
  service_fee: 250_000,
  status: "CONFIRMED",
  customer_id: customerA.id,
}

const ticketB: TicketRead = {
  id: "55555555-5555-4555-8555-555555555555",
  pnr: "XYZ789",
  airline: "VJ",
  passengers: ["TRAN THI B"],
  itinerary: "SGN-DAD",
  flight_date: new Date("2026-04-25T02:00:00.000Z"),
  net_price: 800_000,
  selling_price: 950_000,
  service_fee: 150_000,
  status: "DRAFT",
  customer_id: customerC.id,
}

const transactions: TransactionRead[] = [
  {
    id: "66666666-6666-4666-8666-666666666666",
    amount: 1_250_000,
    type: "CHARGE",
    category: "TICKET_PURCHASE",
    method: "AUTO",
    note: "ABC123",
    evidence_url: null,
    customer_id: customerA.id,
    linked_ticket_id: ticketA.id,
    is_refund_confirmed: false,
    created_by: "77777777-7777-4777-8777-777777777777",
    created_at: new Date("2026-04-24T04:00:00.000Z"),
  },
  {
    id: "88888888-8888-4888-8888-888888888888",
    amount: 500_000,
    type: "PAYMENT",
    category: "PAYMENT",
    method: "BANK_TRANSFER",
    note: "Customer transferred deposit",
    evidence_url: null,
    customer_id: customerB.id,
    linked_ticket_id: null,
    is_refund_confirmed: false,
    created_by: "77777777-7777-4777-8777-777777777777",
    created_at: new Date("2026-04-24T05:00:00.000Z"),
  },
]

describe("buildFinancialSummarySnapshot command center fields", () => {
  it("builds action queues for debt, credit, and draft ticket work", () => {
    const snapshot = buildFinancialSummarySnapshot({
      customers: [customerA, customerB, customerC],
      tickets: [ticketA, ticketB],
      transactions,
    })

    expect(snapshot.actionQueues).toEqual([
      {
        key: "receivables",
        count: 2,
        amount: 19_750_000,
        href: "/customers",
        severity: "high",
      },
      {
        key: "heldCredit",
        count: 1,
        amount: 2_000_000,
        href: "/customers",
        severity: "medium",
      },
      {
        key: "draftTickets",
        count: 1,
        amount: 950_000,
        href: "/tickets/capture",
        severity: "medium",
      },
    ])
  })

  it("builds recent activity sorted newest first", () => {
    const snapshot = buildFinancialSummarySnapshot({
      customers: [customerA, customerB, customerC],
      tickets: [ticketA, ticketB],
      transactions,
    })

    expect(snapshot.recentActivity.map((item) => item.id)).toEqual([
      "88888888-8888-4888-8888-888888888888",
      "66666666-6666-4666-8666-666666666666",
      "55555555-5555-4555-8555-555555555555",
      "44444444-4444-4444-8444-444444444444",
    ])
    expect(snapshot.recentActivity[0]).toMatchObject({
      type: "payment",
      title: "Customer transferred deposit",
      amount: -500_000,
      href: `/customers/${customerB.id}`,
    })
    expect(snapshot.recentActivity[2]).toMatchObject({
      type: "ticket",
      title: "XYZ789 - SGN-DAD",
      amount: 950_000,
      href: "/tickets/capture",
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
yarn --cwd apps/web test src/lib/dashboard.test.ts
```

Expected: FAIL because `actionQueues` and `recentActivity` do not exist on `FinancialSummarySnapshot`.

- [ ] **Step 3: Add dashboard command-center types and derivation**

In `apps/web/src/lib/dashboard.ts`, add these types after `TopDebtor`:

```ts
export type DashboardActionQueue = {
  key: "receivables" | "heldCredit" | "draftTickets"
  count: number
  amount: number
  href: string
  severity: "high" | "medium" | "low"
}

export type DashboardRecentActivity = {
  id: string
  type: "ticket" | "payment" | "adjustment"
  title: string
  amount: number
  createdAt: Date
  href: string
}
```

Extend `FinancialSummarySnapshot`:

```ts
export type FinancialSummarySnapshot = {
  totalRevenue: number
  totalNetProfit: number
  totalReceivables: number
  totalHeldCredit: number
  confirmedTickets: number
  activeCustomers: number
  customersWithDebt: number
  customersWithCredit: number
  averageMarginPercent: number
  receivablesRatioPercent: number
  revenueTrend: RevenueTrendPoint[]
  topDebtors: TopDebtor[]
  actionQueues: DashboardActionQueue[]
  recentActivity: DashboardRecentActivity[]
  updatedAt: string
}
```

Add helpers before `buildFinancialSummarySnapshot`:

```ts
function getQueueSeverity(amount: number): DashboardActionQueue["severity"] {
  if (amount >= 10_000_000) {
    return "high"
  }

  if (amount > 0) {
    return "medium"
  }

  return "low"
}

function buildActionQueues(input: {
  customers: readonly CustomerDirectoryItem[]
  tickets: readonly TicketRead[]
}): DashboardActionQueue[] {
  const receivableCustomers = input.customers.filter(
    (customer) => customer.current_balance > 0,
  )
  const creditCustomers = input.customers.filter(
    (customer) => customer.current_balance < 0,
  )
  const draftTickets = input.tickets.filter((ticket) => ticket.status === "DRAFT")
  const totalReceivables = receivableCustomers.reduce(
    (sum, customer) => sum + customer.current_balance,
    0,
  )
  const totalHeldCredit = creditCustomers.reduce(
    (sum, customer) => sum + Math.abs(customer.current_balance),
    0,
  )
  const draftTicketAmount = draftTickets.reduce(
    (sum, ticket) => sum + ticket.selling_price,
    0,
  )

  return [
    {
      key: "receivables",
      count: receivableCustomers.length,
      amount: totalReceivables,
      href: "/customers",
      severity: getQueueSeverity(totalReceivables),
    },
    {
      key: "heldCredit",
      count: creditCustomers.length,
      amount: totalHeldCredit,
      href: "/customers",
      severity: getQueueSeverity(totalHeldCredit),
    },
    {
      key: "draftTickets",
      count: draftTickets.length,
      amount: draftTicketAmount,
      href: "/tickets/capture",
      severity: getQueueSeverity(draftTicketAmount),
    },
  ]
}

function getTransactionActivityAmount(transaction: TransactionRead): number {
  if (
    transaction.category === "PAYMENT" ||
    transaction.category === "DISCOUNT"
  ) {
    return -transaction.amount
  }

  return transaction.amount
}

function getTransactionActivityType(
  transaction: TransactionRead,
): DashboardRecentActivity["type"] {
  if (transaction.category === "PAYMENT" || transaction.category === "REFUND") {
    return "payment"
  }

  if (
    transaction.category === "DISCOUNT" ||
    transaction.category === "ADDITIONAL_FEE"
  ) {
    return "adjustment"
  }

  return "ticket"
}

function buildRecentActivity(input: {
  tickets: readonly TicketRead[]
  transactions: readonly TransactionRead[]
}): DashboardRecentActivity[] {
  const ticketActivity: DashboardRecentActivity[] = input.tickets.map((ticket) => ({
    id: ticket.id,
    type: "ticket",
    title: `${ticket.pnr} - ${ticket.itinerary}`,
    amount: ticket.selling_price,
    createdAt: ticket.flight_date,
    href:
      ticket.status === "DRAFT"
        ? "/tickets/capture"
        : `/customers/${ticket.customer_id}`,
  }))
  const transactionActivity: DashboardRecentActivity[] = input.transactions.map(
    (transaction) => ({
      id: transaction.id,
      type: getTransactionActivityType(transaction),
      title: transaction.note?.trim() || transaction.category,
      amount: getTransactionActivityAmount(transaction),
      createdAt: transaction.created_at,
      href: `/customers/${transaction.customer_id}`,
    }),
  )

  return [...ticketActivity, ...transactionActivity]
    .toSorted((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, 8)
}
```

Add these properties to the `return` object in `buildFinancialSummarySnapshot`:

```ts
    actionQueues: buildActionQueues(input),
    recentActivity: buildRecentActivity(input),
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
yarn --cwd apps/web test src/lib/dashboard.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/dashboard.ts apps/web/src/lib/dashboard.test.ts
git commit -m "feat(web): derive dashboard command center data"
```

## Task 2: Add Command-Center UI Primitives

**Files:**
- Create: `apps/web/src/components/command-center.tsx`

- [ ] **Step 1: Create reusable command-center primitives**

Create `apps/web/src/components/command-center.tsx`:

```tsx
import Link from "next/link"
import type { ComponentType, ReactNode } from "react"
import type { LucideProps } from "lucide-react"

import { cn } from "@/lib/utils"

type IconComponent = ComponentType<LucideProps>

export function CommandPanel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-white",
        className,
      )}
    >
      {children}
    </section>
  )
}

export function CommandPanelHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border bg-secondary/55 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-lg font-medium tracking-[-0.02em] text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function StatusChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode
  tone?: "neutral" | "info" | "warning" | "success" | "danger"
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        tone === "neutral" && "border-border bg-secondary text-muted-foreground",
        tone === "info" && "border-blue-200 bg-blue-50 text-blue-700",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-800",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        tone === "danger" && "border-rose-200 bg-rose-50 text-rose-700",
      )}
    >
      {children}
    </span>
  )
}

export function CommandActionLink({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string
  icon: IconComponent
  label: string
  description: string
}) {
  return (
    <Link
      className="group flex items-start gap-3 rounded-lg border border-border bg-white px-4 py-3 transition-colors duration-200 hover:border-primary/30 hover:bg-accent/45"
      href={href}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-primary transition-colors duration-200 group-hover:border-primary/25 group-hover:bg-white">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">
          {label}
        </span>
        <span className="mt-1 block text-sm leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
    </Link>
  )
}

export function TableScrollArea({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>
}
```

- [ ] **Step 2: Run lint**

Run:

```bash
yarn --cwd apps/web lint
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/command-center.tsx
git commit -m "feat(web): add command center UI primitives"
```

## Task 3: Add Command-Center Localization

**Files:**
- Modify: `apps/web/src/locales/vi.ts`
- Modify: `apps/web/src/locales/en.ts`

- [ ] **Step 1: Add Vietnamese command-center copy**

In `apps/web/src/locales/vi.ts`, inside `dashboard.summary`, add this object after `snapshot`:

```ts
      commandCenter: {
        title: "Trung tâm vận hành hôm nay",
        description:
          "Theo dõi công nợ, vé, thanh toán và các việc cần xử lý tiếp theo.",
        needsAction: {
          eyebrow: "Cần xử lý",
          title: "Hàng đợi công việc",
          description:
            "Các nhóm việc có tác động trực tiếp đến công nợ và vận hành.",
        },
        queues: {
          receivables: {
            label: "Khách còn nợ",
            description: "Ưu tiên nhắc thanh toán hoặc đối soát.",
          },
          heldCredit: {
            label: "Tiền dư / đặt cọc",
            description: "Theo dõi số dư âm cần giữ hoặc hoàn lại.",
          },
          draftTickets: {
            label: "Vé nháp",
            description: "Hoàn tất xác nhận để ghi nhận công nợ.",
          },
        },
        shortcuts: {
          eyebrow: "Thao tác nhanh",
          title: "Mở luồng làm việc",
          customers: {
            label: "Mở khách hàng",
            description: "Tìm khách và kiểm tra sổ công nợ.",
          },
          tickets: {
            label: "Nhập vé",
            description: "Tải chứng từ và trích xuất bằng AI.",
          },
          invoices: {
            label: "Hóa đơn",
            description: "Xem tài liệu tài chính theo khách hàng.",
          },
        },
        recent: {
          eyebrow: "Mới nhất",
          title: "Hoạt động gần đây",
          description: "Vé và giao dịch mới nhất trong hệ thống.",
          columns: {
            activity: "Hoạt động",
            amount: "Số tiền",
            time: "Thời gian",
          },
          empty: "Chưa có hoạt động gần đây.",
          types: {
            ticket: "Vé",
            payment: "Thanh toán",
            adjustment: "Điều chỉnh",
          },
        },
      },
```

- [ ] **Step 2: Add English command-center copy**

In `apps/web/src/locales/en.ts`, inside `dashboard.summary`, add this object after `snapshot`:

```ts
      commandCenter: {
        title: "Today command center",
        description:
          "Track receivables, tickets, payments, and the next work that needs attention.",
        needsAction: {
          eyebrow: "Needs action",
          title: "Work queues",
          description:
            "Work groups that directly affect debt tracking and operations.",
        },
        queues: {
          receivables: {
            label: "Customers with debt",
            description: "Prioritize payment follow-up or reconciliation.",
          },
          heldCredit: {
            label: "Credit / deposit held",
            description: "Track negative balances to hold or refund.",
          },
          draftTickets: {
            label: "Draft tickets",
            description: "Confirm tickets to create debt entries.",
          },
        },
        shortcuts: {
          eyebrow: "Quick actions",
          title: "Open workflow",
          customers: {
            label: "Open customers",
            description: "Find a customer and inspect their ledger.",
          },
          tickets: {
            label: "Capture ticket",
            description: "Upload a document and parse it with AI.",
          },
          invoices: {
            label: "Invoices",
            description: "Review financial documents by customer.",
          },
        },
        recent: {
          eyebrow: "Latest",
          title: "Recent activity",
          description: "The newest tickets and ledger transactions.",
          columns: {
            activity: "Activity",
            amount: "Amount",
            time: "Time",
          },
          empty: "No recent activity yet.",
          types: {
            ticket: "Ticket",
            payment: "Payment",
            adjustment: "Adjustment",
          },
        },
      },
```

- [ ] **Step 3: Run TypeScript check through build**

Run:

```bash
yarn --cwd apps/web build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/locales/vi.ts apps/web/src/locales/en.ts
git commit -m "feat(web): localize command center dashboard"
```

## Task 4: Rework Dashboard Component Layout

**Files:**
- Modify: `apps/web/src/components/financial-summary-dashboard.tsx`
- Modify: `apps/web/src/components/command-center.tsx`

- [ ] **Step 1: Update imports**

In `apps/web/src/components/financial-summary-dashboard.tsx`, replace the lucide import with:

```ts
import Link from "next/link"
import {
  Landmark,
  Plane,
  ReceiptText,
  TrendingUp,
  Users,
  Wallet,
  WalletCards,
} from "lucide-react"
```

Remove the existing Recharts import block, the `cn` import, the `revenueStroke` constant, `formatCompactCurrency`, `revenueLast30Days`, and `currentGrowth`. The command-center dashboard no longer renders the revenue chart in this slice; it keeps financial snapshot cards, action queues, top debtors, and recent activity.

Add imports:

```ts
import {
  CommandActionLink,
  CommandPanel,
  CommandPanelHeader,
  StatusChip,
  TableScrollArea,
} from "@/components/command-center"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
```

- [ ] **Step 2: Add helper functions**

In `apps/web/src/components/financial-summary-dashboard.tsx`, add these helpers after `formatDateTime`:

```ts
function formatSignedCurrency(amount: number): string {
  if (amount === 0) {
    return formatCurrency(amount)
  }

  const sign = amount > 0 ? "+" : "-"

  return `${sign}${formatCurrency(Math.abs(amount))}`
}

function getQueueTone(
  severity: FinancialSummarySnapshot["actionQueues"][number]["severity"],
): "neutral" | "warning" | "danger" {
  if (severity === "high") {
    return "danger"
  }

  if (severity === "medium") {
    return "warning"
  }

  return "neutral"
}

function getActivityTone(
  type: FinancialSummarySnapshot["recentActivity"][number]["type"],
): "neutral" | "info" | "warning" {
  if (type === "ticket") {
    return "info"
  }

  if (type === "adjustment") {
    return "warning"
  }

  return "neutral"
}
```

- [ ] **Step 3: Replace the main render structure**

Inside `FinancialSummaryDashboard`, keep the existing `summary === null` state. Replace the current non-null `return` with this structure:

```tsx
  return (
    <div className="space-y-5 text-foreground">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <CommandPanel className="bg-[#181d26] text-white">
          <div className="px-5 py-5 lg:px-6 lg:py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-200">
              {t("dashboard.summary.eyebrow")}
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-medium tracking-[-0.02em] text-white">
              {t("dashboard.summary.commandCenter.title")}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/72">
              {t("dashboard.summary.commandCenter.description")}
            </p>
          </div>
        </CommandPanel>

        <CommandPanel>
          <div className="grid grid-cols-2 gap-px bg-border">
            <div className="bg-secondary px-5 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                {t("dashboard.summary.snapshot.label")}
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {formatDateTime(summary.updatedAt)}
              </p>
            </div>
            <div className="bg-secondary px-5 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                {t("dashboard.summary.snapshot.sourceLabel")}
              </p>
              <div className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <Wallet className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>{t("dashboard.summary.snapshot.sourceValue")}</span>
              </div>
            </div>
          </div>
        </CommandPanel>
      </section>

      <section
        aria-label={t("dashboard.summary.primaryAriaLabel")}
        className="grid gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-3"
      >
        {primaryWidgets.map((widget) => {
          const Icon = widget.icon

          return (
            <div className="bg-white px-5 py-5" key={widget.key}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                    {widget.label}
                  </p>
                  <p className="mt-3 break-words text-2xl font-medium tracking-[-0.02em] text-foreground">
                    {widget.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {widget.detail}
                  </p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-primary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
            </div>
          )
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <CommandPanel>
          <CommandPanelHeader
            eyebrow={t("dashboard.summary.commandCenter.needsAction.eyebrow")}
            title={t("dashboard.summary.commandCenter.needsAction.title")}
            description={t("dashboard.summary.commandCenter.needsAction.description")}
          />
          <div className="grid gap-px bg-border md:grid-cols-3">
            {summary.actionQueues.map((queue) => (
              <Link
                className="block bg-white px-5 py-5 transition-colors duration-200 hover:bg-accent/35"
                href={queue.href}
                key={queue.key}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t(`dashboard.summary.commandCenter.queues.${queue.key}.label`)}
                    </p>
                    <p className="mt-2 text-2xl font-medium tracking-[-0.02em] text-foreground">
                      {queue.count}
                    </p>
                  </div>
                  <StatusChip tone={getQueueTone(queue.severity)}>
                    {formatCurrency(queue.amount)}
                  </StatusChip>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {t(
                    `dashboard.summary.commandCenter.queues.${queue.key}.description`,
                  )}
                </p>
              </Link>
            ))}
          </div>
        </CommandPanel>

        <CommandPanel>
          <CommandPanelHeader
            eyebrow={t("dashboard.summary.commandCenter.shortcuts.eyebrow")}
            title={t("dashboard.summary.commandCenter.shortcuts.title")}
          />
          <div className="grid gap-3 p-4">
            <CommandActionLink
              href="/customers"
              icon={Users}
              label={t("dashboard.summary.commandCenter.shortcuts.customers.label")}
              description={t(
                "dashboard.summary.commandCenter.shortcuts.customers.description",
              )}
            />
            <CommandActionLink
              href="/tickets/capture"
              icon={Plane}
              label={t("dashboard.summary.commandCenter.shortcuts.tickets.label")}
              description={t(
                "dashboard.summary.commandCenter.shortcuts.tickets.description",
              )}
            />
            <CommandActionLink
              href="/invoices"
              icon={ReceiptText}
              label={t("dashboard.summary.commandCenter.shortcuts.invoices.label")}
              description={t(
                "dashboard.summary.commandCenter.shortcuts.invoices.description",
              )}
            />
          </div>
        </CommandPanel>
      </section>
    </div>
  )
```

- [ ] **Step 4: Add the top debt risk panel**

Insert this panel after the quick-action section and before the recent activity table:

```tsx
      <CommandPanel>
        <CommandPanelHeader
          eyebrow={t("dashboard.summary.analytics.topDebtors.eyebrow")}
          title={t("dashboard.summary.analytics.topDebtors.title")}
          description={t("dashboard.summary.analytics.topDebtors.description")}
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/customers">
                {t("dashboard.summary.commandCenter.shortcuts.customers.label")}
              </Link>
            </Button>
          }
        />
        <div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center border-b border-border px-5 py-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <span>{t("dashboard.summary.analytics.topDebtors.columns.customer")}</span>
            <span>{t("dashboard.summary.analytics.topDebtors.columns.balance")}</span>
          </div>

          {summary.topDebtors.length === 0 ? (
            <div className="px-5 py-8 text-sm text-muted-foreground">
              {t("dashboard.summary.analytics.topDebtors.empty")}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {summary.topDebtors.map((debtor, index) => (
                <Link
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-5 py-3 transition-colors duration-200 hover:bg-accent/35"
                  href={`/customers/${debtor.id}`}
                  key={debtor.id}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-[10px] font-semibold text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="truncate">{debtor.name}</span>
                    </div>
                    <div className="mt-2">
                      <StatusChip tone={debtor.status === "high" ? "danger" : "warning"}>
                        {debtor.status === "high"
                          ? t("dashboard.summary.analytics.topDebtors.status.high")
                          : t("dashboard.summary.analytics.topDebtors.status.medium")}
                      </StatusChip>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {formatCurrency(debtor.outstandingBalance)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("dashboard.summary.analytics.topDebtors.balanceLabel")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </CommandPanel>
```

- [ ] **Step 5: Add recent activity table**

Add this section after the top debt risk panel:

```tsx
      <CommandPanel>
        <CommandPanelHeader
          eyebrow={t("dashboard.summary.commandCenter.recent.eyebrow")}
          title={t("dashboard.summary.commandCenter.recent.title")}
          description={t("dashboard.summary.commandCenter.recent.description")}
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/customers">{t("customers.ledger.back")}</Link>
            </Button>
          }
        />
        <TableScrollArea>
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60 hover:bg-secondary/60">
                <TableHead className="px-5 py-3">
                  {t("dashboard.summary.commandCenter.recent.columns.activity")}
                </TableHead>
                <TableHead className="px-5 py-3 text-right">
                  {t("dashboard.summary.commandCenter.recent.columns.amount")}
                </TableHead>
                <TableHead className="px-5 py-3 text-right">
                  {t("dashboard.summary.commandCenter.recent.columns.time")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.recentActivity.length === 0 ? (
                <TableRow>
                  <TableCell className="px-5 py-8 text-center text-muted-foreground" colSpan={3}>
                    {t("dashboard.summary.commandCenter.recent.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                summary.recentActivity.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="px-5 py-4">
                      <div className="flex flex-col gap-2">
                        <Link
                          className="font-medium text-foreground transition-colors hover:text-primary"
                          href={activity.href}
                        >
                          {activity.title}
                        </Link>
                        <StatusChip tone={getActivityTone(activity.type)}>
                          {t(
                            `dashboard.summary.commandCenter.recent.types.${activity.type}`,
                          )}
                        </StatusChip>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-5 py-4 text-right font-medium text-foreground">
                      {formatSignedCurrency(activity.amount)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-5 py-4 text-right text-sm text-muted-foreground">
                      {formatDateTime(activity.createdAt.toISOString())}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableScrollArea>
      </CommandPanel>
```

- [ ] **Step 6: Run lint and build**

Run:

```bash
yarn --cwd apps/web lint
yarn --cwd apps/web build
```

Expected: both PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/financial-summary-dashboard.tsx apps/web/src/components/command-center.tsx
git commit -m "feat(web): rework dashboard as command center"
```

## Task 5: Verify Full Dashboard Slice

**Files:**
- Modify only if previous verification exposes issues.

- [ ] **Step 1: Run focused tests**

Run:

```bash
yarn --cwd apps/web test src/lib/dashboard.test.ts src/lib/finance-core.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full web test suite**

Run:

```bash
yarn --cwd apps/web test
```

Expected: PASS.

- [ ] **Step 3: Run lint**

Run:

```bash
yarn --cwd apps/web lint
```

Expected: PASS.

- [ ] **Step 4: Run production build**

Run:

```bash
yarn --cwd apps/web build
```

Expected: PASS.

- [ ] **Step 5: Commit any verification fixes**

If verification required fixes:

```bash
git add apps/web/src
git commit -m "fix(web): stabilize command center dashboard"
```

If no fixes were needed, do not create an empty commit.

## Implementation Notes

- Keep `apps/web/src/app/page.tsx` as the RSC fetch boundary. Do not move initial dashboard fetching into `useEffect`.
- Keep all new user-facing strings in `apps/web/src/locales/vi.ts` and `apps/web/src/locales/en.ts`.
- Keep the dashboard useful without invoice/quote list data; those can be added in later phases when endpoints are ready for global document queues.
- Do not introduce a new design palette. Use `docs/DESIGN.md` tokens and the `docs/UX.md` Command Center rules.
- Avoid broad refactors of the app shell, ledger, invoice, quote, or ticket capture pages in this plan.
