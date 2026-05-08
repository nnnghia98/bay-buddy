import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  createUserAction,
  toggleUserActiveAction,
  updateUserAction,
} from "@/actions/settings-users"
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
      "settings.users.actions.invalidInput":
        "Vui lòng kiểm tra lại thông tin tài khoản.",
      "settings.users.actions.missingAuth":
        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      "settings.users.actions.createSuccess":
        "Đã tạo tài khoản thành công.",
      "settings.users.actions.updateSuccess":
        "Đã cập nhật tài khoản thành công.",
      "settings.users.actions.toggleSuccess":
        "Đã cập nhật trạng thái tài khoản.",
      "settings.users.actions.failure":
        "Không thể cập nhật tài khoản lúc này.",
      "settings.users.validation.usernameMin":
        "Tên đăng nhập phải có ít nhất 3 ký tự.",
      "settings.users.validation.usernameMax":
        "Tên đăng nhập không được vượt quá 50 ký tự.",
      "settings.users.validation.passwordRequired":
        "Vui lòng nhập mật khẩu.",
      "settings.users.validation.roleRequired":
        "Vui lòng chọn vai trò.",
      "settings.users.validation.userIdInvalid":
        "Mã tài khoản không hợp lệ.",
      "settings.users.validation.statusRequired":
        "Vui lòng chọn trạng thái tài khoản.",
    }

    return translations[key] ?? key
  },
}))

describe("settings user actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(cookies).mockResolvedValue({
      get: () => ({ value: "auth-token" }),
    } as never)
  })

  it("returns localized validation errors when creating a user with invalid input", async () => {
    const formData = new FormData()
    formData.set("username", "ab")
    formData.set("password", "123")
    formData.set("role", "")
    formData.set("is_active", "true")

    const result = await createUserAction(undefined, formData)

    expect(result).toMatchObject({
      status: "error",
      message: "Vui lòng kiểm tra lại thông tin tài khoản.",
      fieldErrors: {
        username: "Tên đăng nhập phải có ít nhất 3 ký tự.",
        role: "Vui lòng chọn vai trò.",
      },
    })
  })

  it("returns the localized missing-auth message before creating a user", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: () => undefined,
    } as never)
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    const formData = new FormData()
    formData.set("username", "admin-user")
    formData.set("password", "supersecret")
    formData.set("role", "ADMIN")
    formData.set("is_active", "true")

    const result = await createUserAction(undefined, formData)

    expect(result).toMatchObject({
      status: "error",
      message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("revalidates settings after a successful update", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            data: {
              id: "550e8400-e29b-41d4-a716-446655440000",
              username: "updated-admin",
              role: "ADMIN",
              is_active: true,
            },
          }),
      }),
    )

    const formData = new FormData()
    formData.set("user_id", "550e8400-e29b-41d4-a716-446655440000")
    formData.set("username", "updated-admin")
    formData.set("role", "ADMIN")
    formData.set("is_active", "true")

    const result = await updateUserAction(undefined, formData)

    expect(result.status).toBe("success")
    expect(result.message).toBe("Đã cập nhật tài khoản thành công.")
    expect(revalidatePath).toHaveBeenCalledWith("/settings")
  })

  it("sends the toggle request and surfaces backend failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        text: async () => JSON.stringify({ detail: "Not enough permissions" }),
      }),
    )

    const formData = new FormData()
    formData.set("user_id", "550e8400-e29b-41d4-a716-446655440000")
    formData.set("is_active", "false")

    const result = await toggleUserActiveAction(undefined, formData)

    expect(result).toMatchObject({
      status: "error",
      message: "Not enough permissions",
    })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
