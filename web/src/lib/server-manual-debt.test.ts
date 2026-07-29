import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}))

vi.mock("@/lib/api-base", () => ({
  buildApiUrl: (path: string, baseUrl: string) => `${baseUrl}${path}`,
  getServerApiBaseUrl: () => "https://api.example.test",
}))

vi.mock("@/locales/server", () => ({
  getI18n: vi.fn(),
}))

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

import { createManualDebtFromFormData } from "@/lib/server-manual-debt"

const ticketId = "550e8400-e29b-41d4-a716-446655440000"
const customerId = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
const paymentTransactionId = "6ba7b811-9dad-11d1-80b4-00c04fd430c8"

function translate(key: string): string {
  const messages: Record<string, string> = {
    "manualDebts.form.paymentNote": "Thanh toán khi ghi nhận công nợ",
    "manualDebts.actions.success": "Debt saved",
    "manualDebts.actions.successWithPayment": "Debt and payment saved",
  }

  return messages[key] ?? key
}

function createFormData(paymentAmount: string): FormData {
  const formData = new FormData()
  formData.set("customer_name", "Nguyen Van A")
  formData.set("pnr", "ABC123")
  formData.set("airline", "VNA")
  formData.set("passengers", "NGUYEN VAN A")
  formData.set("itinerary", "HAN-SGN")
  formData.set("flight_date", "2026-07-29")
  formData.set("booked_at", "2026-07-29")
  formData.set("net_price", "0")
  formData.set("ev_price", "0")
  formData.set("ast_price", "0")
  formData.set("thf_price", "0")
  formData.set("web_price", "0")
  formData.set("insurance_price", "0")
  formData.set("selling_price", "1200000")
  formData.set("discount", "0")
  formData.set("payment_amount", paymentAmount)
  formData.set("payment_method", "THF")
  return formData
}

describe("createManualDebtFromFormData", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(cookies).mockResolvedValue({
      get: () => ({ value: "auth-token" }),
    } as never)
  })

  it("sends the optional payment with the ticket confirmation request", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          data: {
            ticket: { id: ticketId },
            payment_transaction_id: paymentTransactionId,
            customer: { id: customerId },
          },
        }),
    })
    vi.stubGlobal("fetch", fetchSpy)

    const result = await createManualDebtFromFormData(
      createFormData("500000"),
      translate,
    )

    const [, request] = fetchSpy.mock.calls[0] as [string, RequestInit]
    const payload = JSON.parse(String(request.body))

    expect(payload.payment).toEqual({
      amount: 500000,
      method: "THF",
      note: "Thanh toán khi ghi nhận công nợ",
    })
    expect(result).toMatchObject({
      status: "success",
      message: "Debt and payment saved",
      ticketId,
    })
    expect(revalidatePath).toHaveBeenCalledWith(`/customers/${customerId}`)
  })

  it("omits payment creation when the amount is blank", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          data: {
            ticket: { id: ticketId },
            payment_transaction_id: null,
            customer: { id: customerId },
          },
        }),
    })
    vi.stubGlobal("fetch", fetchSpy)

    const result = await createManualDebtFromFormData(
      createFormData(""),
      translate,
    )

    const [, request] = fetchSpy.mock.calls[0] as [string, RequestInit]
    const payload = JSON.parse(String(request.body))

    expect(payload.payment).toBeNull()
    expect(result.message).toBe("Debt saved")
  })
})
