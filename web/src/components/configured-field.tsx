"use client"

import { createContext, useContext, type ComponentProps, type HTMLAttributes, type ReactNode } from "react"
import { Field } from "@astryxdesign/core/Field"
import { useQuery } from "@tanstack/react-query"
import { useI18n } from "@/locales/client"
import { UserReadSchema } from "@/schemas/user"
import { useAuth } from "@/lib/auth-context"
import { apiFetchData } from "@/lib/api"
import { fieldSettingsQueryKey, fieldSettingsSchema, type FieldPreference, type FieldSettings } from "@/schemas/field-preferences"

import styles from "./configured-field.module.css"

const Preferences = createContext<FieldSettings["preferences"]>({})
const ValidationMessage = createContext("")
const CurrentField = createContext<FieldPreference | undefined>(undefined)

export function FieldPreferencesProvider({ children }: { children: ReactNode }) {
  const t = useI18n()
  const { token, isReady } = useAuth()
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    enabled: isReady && !!token,
    queryFn: async () => UserReadSchema.parse(await apiFetchData("/auth/me")),
  })
  const { data } = useQuery({
    queryKey: [...fieldSettingsQueryKey, currentUser?.id],
    enabled: !!token && !!currentUser?.id,
    queryFn: async () => fieldSettingsSchema.parse(await apiFetchData("/settings/fields")),
  })
  return <ValidationMessage.Provider value={t("settings.fields.invalidValue")}><Preferences.Provider value={token ? data?.preferences ?? {} : {}}>{children}</Preferences.Provider></ValidationMessage.Provider>
}

export function useFieldPreference(field: string) {
  return useContext(Preferences)[field]
}

export function usePersonalValidationMessage() {
  return useContext(ValidationMessage)
}

export function useCurrentFieldPreference() {
  return useContext(CurrentField)
}

export function ConfiguredField({ field, children, systemRequired = false, ...props }: HTMLAttributes<HTMLDivElement> & { field: string; systemRequired?: boolean }) {
  const preference = useFieldPreference(field)
  return <CurrentField.Provider value={preference}>
    <div {...props} className={`${styles.field} ${props.className ?? ""}`} hidden={props.hidden || (!systemRequired && preference?.visible === false)}>{children}</div>
  </CurrentField.Provider>
}

export function ConfiguredText({ field, children }: { field: string; children: ReactNode }) {
  const preference = useFieldPreference(field)
  return <>{preference?.label || children}</>
}

export function ConfiguredValue({ field, children }: { field: string; children: ReactNode }) {
  const preference = useFieldPreference(field)
  return preference?.visible === false ? null : children
}

export function ConfiguredAstryxField(props: ComponentProps<typeof Field>) {
  const preference = useCurrentFieldPreference()
  return <Field {...props} label={preference?.label || props.label} />
}
