import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { FinancialSummaryDashboard } from "@/components/financial-summary-dashboard"
import type { DashboardSummary } from "@/schemas/dashboard"

vi.mock("@/locales/client", () => ({
  useI18n: () => (key: string) => key,
}))

const summaryFixture: DashboardSummary = {
  financial: {
    total_ticket_sales: 2_500_000,
    total_true_income: 450_000,
    total_receivables: 1_100_000,
    total_held_credit: 200_000,
    confirmed_tickets: 3,
    customers_with_debt: 2,
    customers_with_credit: 1,
    income_rate_percent: 18,
  },
  top_debtors: [
    {
      customer_id: "f4e3dcda-e904-4a2d-b937-d76720e0839e",
      customer_name: "Ten",
      outstanding_balance: 1_100_000,
    },
  ],
  action_queues: [
    { key: "receivables", count: 2, amount: 1_100_000 },
    { key: "heldCredit", count: 1, amount: 200_000 },
    { key: "draftTickets", count: 0, amount: 0 },
  ],
  recent_activity: [
    {
      id: "d3af56ad-31d3-40bb-b5bd-0ba9a5fa9e8d",
      type: "ticket",
      category: null,
      customer_id: "f4e3dcda-e904-4a2d-b937-d76720e0839e",
      customer_name: "Ten",
      title: "ABC123 · SGN-HAN",
      amount: 1_100_000,
      created_at: new Date("2026-08-14T07:00:00.000Z"),
    },
  ],
  scope_started_at: null,
  updated_at: new Date("2026-08-14T07:05:00.000Z"),
}

function renderDashboard(): string {
  return renderToStaticMarkup(
    <FinancialSummaryDashboard summary={summaryFixture} />,
  )
}

describe("FinancialSummaryDashboard", () => {
  it("shows the backend-owned financial snapshot without partial masking", () => {
    const html = renderDashboard()

    expect(html).toContain("dashboard.summary.financial.ticketSales.label")
    expect(html).toContain("dashboard.summary.financial.trueIncome.label")
    expect(html).toContain("2.500.000")
    expect(html).toContain("450.000")
    expect(html).not.toContain("••••••")
  })

  it("renders the action queues and all primary shortcuts", () => {
    const html = renderDashboard()

    expect(html).toContain("dashboard.summary.commandCenter.needsAction")
    expect(html).toContain(
      "dashboard.summary.commandCenter.shortcuts.manualDebt",
    )
    expect(html).toContain("dashboard.summary.commandCenter.shortcuts.ticket")
    expect(html).toContain(
      "dashboard.summary.commandCenter.shortcuts.customers",
    )
    expect(html).toContain("dashboard.summary.commandCenter.shortcuts.report")
  })

  it("renders one ticket event without an automatic debt duplicate", () => {
    const html = renderDashboard()

    expect(html.match(/ABC123 · SGN-HAN/g)).toHaveLength(1)
    expect(html).not.toContain("TICKET_PURCHASE")
    expect(html).not.toContain("Auto-debt for ticket")
  })

  it("shows a useful unavailable state", () => {
    const html = renderToStaticMarkup(
      <FinancialSummaryDashboard summary={null} />,
    )

    expect(html).toContain("dashboard.summary.unavailableTitle")
    expect(html).toContain("dashboard.summary.unavailableDescription")
  })
})
