import { z } from "zod"

export const fieldPreferenceSchema = z.object({
  label: z.string().trim().max(80).default(""),
  visible: z.boolean().default(true),
  required: z.boolean().default(false),
  min_length: z.number().int().min(0).max(10000).nullable().default(null),
  max_length: z.number().int().min(1).max(10000).nullable().default(null),
  minimum: z.number().finite().nullable().default(null),
  maximum: z.number().finite().nullable().default(null),
}).strict().refine(p => !p.required || p.visible)
  .refine(p => p.min_length === null || p.max_length === null || p.min_length <= p.max_length)
  .refine(p => p.minimum === null || p.maximum === null || p.minimum <= p.maximum)

export const fieldSettingsSchema = z.object({
  catalog: z.array(z.object({
    key: z.string(), table: z.string(), name: z.string(), type: z.string(),
    rules: z.record(z.string(), z.unknown()),
  })),
  preferences: z.record(z.string(), fieldPreferenceSchema),
})
export type FieldPreference = z.infer<typeof fieldPreferenceSchema>
export type FieldSettings = z.infer<typeof fieldSettingsSchema>
export const fieldSettingsQueryKey = ["personal-field-settings"] as const
