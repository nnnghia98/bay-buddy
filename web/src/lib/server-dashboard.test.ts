import { beforeEach, describe, expect, it, vi } from "vitest"

const { fetchAuthenticatedApiPayload, getEnvelopeData } = vi.hoisted(() => ({
  fetchAuthenticatedApiPayload: vi.fn(),
  getEnvelopeData: vi.fn((payload: unknown) =>
    payload && typeof payload === "object" && "data" in payload
      ? (payload as { data: unknown }).data
      : payload,
  ),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/server-api", () => ({
  fetchAuthenticatedApiPayload,
  getEnvelopeData,
}))

import { fetchDashboardSummary } from "@/lib/server-dashboard"

const payload = {
  financial: {
    total_ticket_sales: 41_311_111,
    total_true_income: 5_719_000,
    total_receivables: 41_311_111,
    total_held_credit: 0,
    confirmed_tickets: 17,
    customers_with_debt: 9,
    customers_with_credit: 0,
    income_rate_percent: 13.844878,
  },
  top_debtors: [],
  action_queues: [
    { key: "receivables", count: 9, amount: 41_311_111 },
    { key: "heldCredit", count: 0, amount: 0 },
    { key: "draftTickets", count: 0, amount: 0 },
  ],
  recent_activity: [],
  scope_started_at: null,
  updated_at: "2026-08-14T07:05:00Z",
}

beforeEach(() => {
  fetchAuthenticatedApiPayload.mockReset()
  getEnvelopeData.mockClear()
})

describe("fetchDashboardSummary", () => {
  it("loads and validates the one dashboard snapshot endpoint", async () => {
    fetchAuthenticatedApiPayload.mockResolvedValue({
      success: true,
      data: payload,
      error: null,
    })

    const summary = await fetchDashboardSummary()

    expect(fetchAuthenticatedApiPayload).toHaveBeenCalledWith(
      "/finance/dashboard-summary",
      "Unable to load the dashboard summary.",
    )
    expect(summary.financial.total_ticket_sales).toBe(41_311_111)
    expect(summary.updated_at).toBeInstanceOf(Date)
  })

  it("rejects an incomplete financial snapshot", async () => {
    fetchAuthenticatedApiPayload.mockResolvedValue({
      success: true,
      data: { ...payload, financial: { total_ticket_sales: 1 } },
      error: null,
    })

    await expect(fetchDashboardSummary()).rejects.toThrow()
  })
})
