import { FieldConfigurator } from "./field-configurator"
import { fetchAuthenticatedApiPayload, getEnvelopeData } from "@/lib/server-api"
import { fieldSettingsSchema } from "@/schemas/field-preferences"
import { SettingsUsersClient } from "@/app/settings/settings-users-client"
import { getI18n } from "@/locales/server"
import patterns from "@/styles/ui-patterns.module.css"
import { fetchCurrentUser, fetchUsers } from "@/lib/server-users"

export default async function SettingsPage() {
  const t = await getI18n()
  const currentUser = await fetchCurrentUser()
  const fields = fieldSettingsSchema.parse(getEnvelopeData(
    await fetchAuthenticatedApiPayload("/settings/fields", "Unable to load field settings."),
  ))
  const users = currentUser.role === "ADMIN" ? await fetchUsers() : []

  return (
    <div className={patterns.pageStack}>
      <h1>{t("settings.title")}</h1>
      <FieldConfigurator settings={fields} />
      {currentUser.role === "ADMIN" && (
        <SettingsUsersClient currentUser={currentUser} users={users} />
      )}
    </div>
  )
}
