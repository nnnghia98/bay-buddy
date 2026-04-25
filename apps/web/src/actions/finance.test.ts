import { beforeEach, describe, expect, it, vi } from "vitest"

import { recordPaymentAction } from "@/actions/finance"
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

vi.mock("@/locales/server", () => ({
  getI18n: async () => (key: string) => {
    const translations: Record<string, string> = {
      "customers.actions.recordPayment.invalidInput":
        "Vui lòng kiểm tra lại thông tin thanh toán.",
      "customers.actions.recordPayment.missingAuth":
        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      "customers.actions.recordPayment.failure":
        "Không thể ghi nhận thanh toán lúc này.",
      "customers.actions.recordPayment.success":
        "Đã ghi nhận thanh toán thành công.",
      "customers.ledger.paymentDialog.validation.customerIdInvalid":
        "Mã khách hàng không hợp lệ.",
      "customers.ledger.paymentDialog.validation.amountPositive":
        "Số tiền phải lớn hơn 0.",
      "customers.ledger.paymentDialog.validation.methodRequired":
        "Vui lòng chọn loại thanh toán.",
      "customers.ledger.paymentDialog.validation.noteRequired":
        "Vui lòng nhập ghi chú.",
      "customers.ledger.paymentDialog.validation.noteMax":
        "Ghi chú không được vượt quá 2000 ký tự.",
      "customers.ledger.paymentDialog.validation.evidenceUrlInvalid":
        "Ảnh biên lai phải là một đường dẫn hợp lệ.",
      "customers.ledger.paymentDialog.validation.evidenceUrlMax":
        "Ảnh biên lai không được vượt quá 2048 ký tự.",
      "customers.ledger.paymentDialog.validation.linkedTicketInvalid":
        "Vé liên kết không hợp lệ.",
    }

    return translations[key] ?? key
  },
}))

describe("recordPaymentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(cookies).mockResolvedValue({
      get: () => ({ value: "auth-token" }),
    } as never)
  })

  it("returns localized validation feedback when the submitted payment is invalid", async () => {
    const formData = new FormData()
    formData.set("customer_id", "not-a-uuid")
    formData.set("amount", "0")
    formData.set("method", "")
    formData.set("note", "")
    formData.set("evidence_url", "not-a-url")
    formData.set("linked_ticket_id", "bad-ticket")

    const result = await recordPaymentAction(undefined, formData)

    expect(result).toMatchObject({
      status: "error",
      message: "Vui lòng kiểm tra lại thông tin thanh toán.",
      fieldErrors: {
        customer_id: "Mã khách hàng không hợp lệ.",
        amount: "Số tiền phải lớn hơn 0.",
        method: "Vui lòng chọn loại thanh toán.",
        note: "Vui lòng nhập ghi chú.",
        evidence_url: "Ảnh biên lai phải là một đường dẫn hợp lệ.",
        linked_ticket_id: "Vé liên kết không hợp lệ.",
      },
      transactionId: null,
    })
  })

  it("returns the localized missing-auth message before calling the backend", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: () => undefined,
    } as never)
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    const formData = new FormData()
    formData.set("customer_id", "550e8400-e29b-41d4-a716-446655440000")
    formData.set("amount", "300000")
    formData.set("method", "Chuyển khoản")
    formData.set("note", "Partial payment")

    const result = await recordPaymentAction(undefined, formData)

    expect(result).toMatchObject({
      status: "error",
      message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      fieldErrors: {},
      transactionId: null,
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("falls back to the localized failure message when the backend error payload has no detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        text: async () => JSON.stringify({ unexpected: true }),
      }),
    )

    const formData = new FormData()
    formData.set("customer_id", "550e8400-e29b-41d4-a716-446655440000")
    formData.set("amount", "300000")
    formData.set("method", "Chuyển khoản")
    formData.set("note", "Partial payment")

    const result = await recordPaymentAction(undefined, formData)

    expect(result).toMatchObject({
      status: "error",
      message: "Không thể ghi nhận thanh toán lúc này.",
      fieldErrors: {},
      transactionId: null,
    })
  })

  it("returns an error when the backend payload does not validate as a transaction", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            data: {
              transaction: {
                id: "not-a-uuid",
              },
              customer_new_balance: 900_000,
              balance_state: "debt",
            },
          }),
      }),
    )

    const formData = new FormData()
    formData.set("customer_id", "550e8400-e29b-41d4-a716-446655440000")
    formData.set("amount", "300000")
    formData.set("method", "Chuyển khoản")
    formData.set("note", "Partial payment")

    const result = await recordPaymentAction(undefined, formData)

    expect(result.status).toBe("error")
    expect(result.message).toBe("Không thể ghi nhận thanh toán lúc này.")
    expect(result.transactionId).toBeNull()
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
