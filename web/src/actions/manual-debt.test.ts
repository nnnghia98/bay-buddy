import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { updateManualDebtRowAction } from "@/actions/manual-debt"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

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

vi.mock("@/lib/server-manual-debt", () => ({
  createManualDebtFromFormData: vi.fn(),
}))

vi.mock("@/locales/server", () => ({
  getI18n: async () => (key: string) => {
    const translations: Record<string, string> = {
      "manualDebts.table.actions.invalidUpdate": "Invalid update",
      "manualDebts.table.actions.updateSuccess": "Update saved",
      "manualDebts.table.actions.updateFailure": "Update failed",
      "manualDebts.actions.missingAuth": "Missing auth",
      "manualDebts.validation.customerIdInvalid": "Invalid customer",
      "manualDebts.validation.ticketIdInvalid": "Invalid ticket",
      "manualDebts.validation.bookedAtInvalid": "Invalid issue date",
      "manualDebts.validation.flightDateInvalid": "Invalid flight date",
      "manualDebts.validation.pnrLength": "Invalid PNR",
      "manualDebts.validation.ticketNumberInvalid": "Invalid ticket number",
      "manualDebts.validation.airlineInvalid": "Invalid airline",
      "manualDebts.validation.passengerRequired": "Passenger is required",
      "manualDebts.validation.itineraryInvalid": "Invalid route",
      "manualDebts.validation.netPriceMin": "Invalid net price",
      "manualDebts.validation.amountMin": "Invalid amount",
      "manualDebts.validation.paymentMethodInvalid": "Invalid payment type",
      "manualDebts.validation.paymentDateInvalid": "Invalid payment date",
      "manualDebts.validation.paymentNoteMax": "Note is too long",
      "manualDebts.validation.paymentTransactionIdInvalid":
        "Invalid linked payment",
    }

    return translations[key] ?? key
  },
}))

const customerId = "550e8400-e29b-41d4-a716-446655440000"
const ticketId = "550e8400-e29b-41d4-a716-446655440001"
const paymentId = "550e8400-e29b-41d4-a716-446655440002"

function createValidFormData(): FormData {
  const formData = new FormData()
  formData.set("customer_id", customerId)
  formData.set("ticket_id", ticketId)
  formData.set("pnr", "ABC123")
  formData.set("airline", "VNA")
  formData.set("ticket_number", "7381234567890")
  formData.set("booked_at", "2026-08-04")
  formData.set("flight_date", "2026-08-05T10:30")
  formData.set("passengers", "Nguyen Van A")
  formData.set("itinerary", "HAN-SGN")
  formData.set("net_price", "1.000.000")
  formData.set("selling_price", "1.200.000")
  formData.set("discount", "50.000")
  formData.set("ev_price", "700.000")
  formData.set("ast_price", "0")
  formData.set("thf_price", "0")
  formData.set("web_price", "0")
  formData.set("insurance_price", "100.000")
  formData.set("true_income", "450.000")
  formData.set("true_income_override", "false")
  formData.set("payment_method", "Chuyển khoản")
  formData.set("payment_method_changed", "true")
  formData.set("payment_amount", "500.000")
  formData.set("payment_amount_changed", "true")
  formData.set("payment_occurred_at", "2026-08-04")
  formData.set("payment_occurred_at_changed", "true")
  formData.set("payment_note", "Da thanh toan")
  formData.set("payment_note_changed", "true")
  formData.append("payment_transaction_id", paymentId)
  return formData
}

describe("manual debt row update action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(cookies).mockResolvedValue({
      get: () => ({ value: "auth-token" }),
    } as never)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns field feedback for invalid drawer input", async () => {
    const formData = createValidFormData()
    formData.set("ticket_id", "not-a-ticket-id")

    const result = await updateManualDebtRowAction(undefined, formData)

    expect(result).toMatchObject({
      status: "error",
      message: "Invalid update",
      fieldErrors: {
        ticket_id: "Invalid ticket",
      },
    })
  })

  it("updates the ticket and linked payment before returning success", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal("fetch", fetchMock)

    const result = await updateManualDebtRowAction(
      undefined,
      createValidFormData(),
    )

    expect(result).toMatchObject({
      status: "success",
      message: "Update saved",
    })
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `https://api.example.test/tickets/${ticketId}/correction`,
      expect.objectContaining({ method: "PATCH" }),
    )
    const ticketRequest = fetchMock.mock.calls[0]?.[1]
    expect(JSON.parse(String(ticketRequest?.body))).toMatchObject({
      pnr: "ABC123",
      airline: "VNA",
      ticket_number: "7381234567890",
      itinerary: "HAN-SGN",
      net_price: 1_000_000,
      passengers: ["Nguyen Van A"],
    })
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `https://api.example.test/transactions/${paymentId}`,
      expect.objectContaining({ method: "PATCH" }),
    )
    const paymentRequest = fetchMock.mock.calls[1]?.[1]
    expect(JSON.parse(String(paymentRequest?.body))).toMatchObject({
      method: "Chuyển khoản",
      note: "Da thanh toan",
      amount: 500_000,
      occurred_at: "2026-08-04T00:00:00.000Z",
    })
    expect(revalidatePath).toHaveBeenCalledWith("/debts/input")
    expect(revalidatePath).toHaveBeenCalledWith(`/tickets/${ticketId}`)
  })

  it("keeps the drawer in an error state when the API update fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }))

    const result = await updateManualDebtRowAction(
      undefined,
      createValidFormData(),
    )

    expect(result).toMatchObject({
      status: "error",
      message: "Update failed",
    })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
