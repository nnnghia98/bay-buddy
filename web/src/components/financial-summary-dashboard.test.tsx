import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { FinancialSummaryDashboard } from "@/components/financial-summary-dashboard"
import type { FinancialSummarySnapshot } from "@/lib/dashboard"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/locales/client", () => ({
  useI18n: () => (key: string) => key,
}))

const summaryFixture: FinancialSummarySnapshot = {
  totalRevenue: 2_500_000,
  revenueFromDate: "2026-05-01",
  totalNetProfit: 450_000,
  totalReceivables: 1_100_000,
  totalHeldCredit: 200_000,
  confirmedTickets: 3,
  activeCustomers: 4,
  customersWithDebt: 2,
  customersWithCredit: 1,
  averageMarginPercent: 18,
  receivablesRatioPercent: 44,
  revenueTrend: [],
  topDebtors: [],
  actionQueues: [],
  recentActivity: [],
  updatedAt: "2026-05-04T07:00:00.000Z",
}

function renderDashboard(initialRevenueVisible: boolean): string {
  return renderToStaticMarkup(
    <FinancialSummaryDashboard
      initialRevenueVisible={initialRevenueVisible}
      summary={summaryFixture}
    />,
  )
}

describe("FinancialSummaryDashboard revenue privacy", () => {
  it("masks total revenue by default", () => {
    const html = renderDashboard(false)

    expect(html).toContain("••••••")
    expect(html).not.toContain("2.500.000")
  })

  it("shows total revenue when visibility is enabled", () => {
    const html = renderDashboard(true)

    expect(html).toContain("2.500.000")
    expect(html).not.toContain("••••••")
  })
})
