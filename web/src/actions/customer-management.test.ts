import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  toggleCustomerActiveAction,
  updateCustomerAction,
} from "@/actions/customer-management"
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
      "customers.management.actions.invalidInput":
        "Vui lòng kiểm tra lại thông tin khách hàng.",
      "customers.management.actions.missingAuth":
        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      "customers.management.actions.updateSuccess":
        "Đã cập nhật khách hàng thành công.",
      "customers.management.actions.toggleSuccess":
        "Đã cập nhật trạng thái khách hàng.",
      "customers.management.actions.failure":
        "Không thể cập nhật khách hàng lúc này.",
      "customers.management.validation.customerIdInvalid":
        "Mã khách hàng không hợp lệ.",
      "customers.management.validation.nameRequired":
        "Vui lòng nhập tên khách hàng.",
      "customers.management.validation.nameMax":
        "Tên khách hàng không được vượt quá 255 ký tự.",
      "customers.management.validation.emailInvalid":
        "Email khách hàng không hợp lệ.",
      "customers.management.validation.emailMax":
        "Email không được vượt quá 255 ký tự.",
      "customers.management.validation.phoneMax":
        "Số điện thoại không được vượt quá 30 ký tự.",
      "customers.management.validation.addressMax":
        "Địa chỉ không được vượt quá 500 ký tự.",
      "customers.management.validation.taxCodeMax":
        "Mã số thuế không được vượt quá 100 ký tự.",
      "customers.management.validation.typeRequired":
        "Vui lòng chọn loại khách hàng.",
      "customers.management.validation.statusRequired":
        "Vui lòng chọn trạng thái khách hàng.",
    }

    return translations[key] ?? key
  },
}))

describe("customer management actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(cookies).mockResolvedValue({
      get: () => ({ value: "auth-token" }),
    } as never)
  })

  it("returns localized validation errors when a customer update is invalid", async () => {
    const formData = new FormData()
    formData.set("customer_id", "not-a-uuid")
    formData.set("name", "")
    formData.set("type", "")
    formData.set("is_active", "true")
    formData.set("email", "bad-email")

    const result = await updateCustomerAction(undefined, formData)

    expect(result).toMatchObject({
      status: "error",
      message: "Vui lòng kiểm tra lại thông tin khách hàng.",
      fieldErrors: {
        customer_id: "Mã khách hàng không hợp lệ.",
        name: "Vui lòng nhập tên khách hàng.",
        email: "Email khách hàng không hợp lệ.",
      },
    })
  })

  it("revalidates customer pages after a successful archive toggle", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            data: {
              id: "550e8400-e29b-41d4-a716-446655440000",
              name: "Cong ty Bay Buddy",
              type: "BUSINESS",
              balance: 0,
              is_active: false,
              email: null,
              phone: null,
              address: null,
              tax_code: null,
            },
          }),
      }),
    )

    const formData = new FormData()
    formData.set("customer_id", "550e8400-e29b-41d4-a716-446655440000")
    formData.set("is_active", "false")

    const result = await toggleCustomerActiveAction(undefined, formData)

    expect(result.status).toBe("success")
    expect(result.message).toBe("Đã cập nhật trạng thái khách hàng.")
    expect(revalidatePath).toHaveBeenCalledWith("/customers")
    expect(revalidatePath).toHaveBeenCalledWith(
      "/customers/550e8400-e29b-41d4-a716-446655440000",
    )
  })
})
