import { z } from "zod"

const userRoles = ["ADMIN", "STAFF"] as const

export type SettingsUserValidationMessages = {
  usernameMin: string
  usernameMax: string
  passwordRequired: string
  passwordMax: string
  roleRequired: string
  userIdInvalid: string
  statusRequired: string
}

const defaultSettingsUserValidationMessages: SettingsUserValidationMessages = {
  usernameMin: "Tên đăng nhập phải có ít nhất 3 ký tự.",
  usernameMax: "Tên đăng nhập không được vượt quá 50 ký tự.",
  passwordRequired: "Vui lòng nhập mã truy cập.",
  passwordMax: "Mã truy cập không được vượt quá 64 ký tự.",
  roleRequired: "Vui lòng chọn vai trò.",
  userIdInvalid: "Mã tài khoản không hợp lệ.",
  statusRequired: "Vui lòng chọn trạng thái tài khoản.",
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }

  const normalizedValue = value.trim()
  return normalizedValue ? normalizedValue : undefined
}

function normalizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value
  }

  if (typeof value !== "string") {
    return undefined
  }

  if (value === "true") {
    return true
  }

  if (value === "false") {
    return false
  }

  return undefined
}

export function getSettingsUserValidationMessages(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, ...args: any[]) => string,
): SettingsUserValidationMessages {
  return {
    usernameMin: t("settings.users.validation.usernameMin"),
    usernameMax: t("settings.users.validation.usernameMax"),
    passwordRequired: t("settings.users.validation.passwordRequired"),
    passwordMax: t("settings.users.validation.passwordMax"),
    roleRequired: t("settings.users.validation.roleRequired"),
    userIdInvalid: t("settings.users.validation.userIdInvalid"),
    statusRequired: t("settings.users.validation.statusRequired"),
  }
}

export function createCreateUserFormSchema(
  messages: SettingsUserValidationMessages,
) {
  return z.object({
    username: z
      .string()
      .trim()
      .min(3, messages.usernameMin)
      .max(50, messages.usernameMax),
    password: z
      .string()
      .min(1, messages.passwordRequired)
      .max(64, messages.passwordMax),
    role: z.enum(userRoles, {
      message: messages.roleRequired,
    }),
    is_active: z.preprocess(
      normalizeBoolean,
      z.boolean({ message: messages.statusRequired }),
    ),
  })
}

export function createUpdateUserFormSchema(
  messages: SettingsUserValidationMessages,
) {
  return z.object({
    user_id: z.string().uuid(messages.userIdInvalid),
    username: z
      .string()
      .trim()
      .min(3, messages.usernameMin)
      .max(50, messages.usernameMax),
    password: z.preprocess(
      normalizeOptionalString,
      z
        .string()
        .min(1, messages.passwordRequired)
        .max(64, messages.passwordMax)
        .optional(),
    ),
    role: z.enum(userRoles, {
      message: messages.roleRequired,
    }),
    is_active: z.preprocess(
      normalizeBoolean,
      z.boolean({ message: messages.statusRequired }),
    ),
  })
}

export function createToggleUserActiveFormSchema(
  messages: SettingsUserValidationMessages,
) {
  return z.object({
    user_id: z.string().uuid(messages.userIdInvalid),
    is_active: z.preprocess(
      normalizeBoolean,
      z.boolean({ message: messages.statusRequired }),
    ),
  })
}

export const createUserFormSchema = createCreateUserFormSchema(
  defaultSettingsUserValidationMessages,
)
export const updateUserFormSchema = createUpdateUserFormSchema(
  defaultSettingsUserValidationMessages,
)
export const toggleUserActiveFormSchema = createToggleUserActiveFormSchema(
  defaultSettingsUserValidationMessages,
)

export type CreateUserFormValues = z.infer<typeof createUserFormSchema>
export type UpdateUserFormValues = z.infer<typeof updateUserFormSchema>
export type ToggleUserActiveFormValues = z.infer<typeof toggleUserActiveFormSchema>

export type SettingsUserActionField =
  | "user_id"
  | "username"
  | "password"
  | "role"
  | "is_active"

export type SettingsUserActionState = {
  status: "idle" | "success" | "error"
  message: string | null
  fieldErrors: Partial<Record<SettingsUserActionField, string>>
  submittedAt: number | null
  userId: string | null
}

export const initialSettingsUserActionState: SettingsUserActionState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  submittedAt: null,
  userId: null,
}
