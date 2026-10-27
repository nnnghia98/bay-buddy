"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { AUTH_TOKEN_COOKIE_KEY } from "@/lib/auth-token"
import { buildApiUrl, getServerApiBaseUrl } from "@/lib/api-base"
import { fieldPreferenceSchema } from "@/schemas/field-preferences"

export type FieldActionState = { status: "idle" | "saved" | "error" }

export async function saveFieldPreference(_: FieldActionState, data: FormData): Promise<FieldActionState> {
  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_KEY)?.value
  if (!token) return { status: "error" }
  const number = (name: string) => data.get(name) === "" ? null : Number(data.get(name))
  const parsed = z.object({ field: z.string().min(1).max(150), preference: fieldPreferenceSchema.nullable() }).safeParse({
    field: data.get("field"),
    preference: data.get("reset") ? null : {
      label: data.get("label"), visible: data.get("visible") === "on", required: data.get("required") === "on",
      min_length: number("min_length"), max_length: number("max_length"), minimum: number("minimum"), maximum: number("maximum"),
    },
  })
  if (!parsed.success) return { status: "error" }
  try {
    const response = await fetch(buildApiUrl("/settings/fields", getServerApiBaseUrl()), {
      method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data), cache: "no-store",
    })
    if (!response.ok) return { status: "error" }
    revalidatePath("/settings")
    return { status: "saved" }
  } catch { return { status: "error" } }
}
