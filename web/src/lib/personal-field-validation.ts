import type { FieldPreference } from "@/schemas/field-preferences"
import { parseSignedCurrencyInput } from "@/lib/formatters"

export function satisfiesPersonalRules(value: string, preference: FieldPreference | undefined, currency = false): boolean {
  if (!preference || preference.visible === false) return true
  if (!value.trim()) return !preference.required
  if (preference.min_length !== null && value.length < preference.min_length) return false
  if (preference.max_length !== null && value.length > preference.max_length) return false
  if (preference.minimum === null && preference.maximum === null) return true
  const number = currency ? parseSignedCurrencyInput(value) : Number(value)
  return Number.isFinite(number) && (preference.minimum === null || number >= preference.minimum) && (preference.maximum === null || number <= preference.maximum)
}
