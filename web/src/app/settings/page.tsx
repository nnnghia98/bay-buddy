import { SettingsUsersClient } from "@/app/settings/settings-users-client"
import { fetchCurrentUser, fetchUsers } from "@/lib/server-users"

export default async function SettingsPage() {
  const currentUser = await fetchCurrentUser()
  const users = currentUser.role === "ADMIN" ? await fetchUsers() : []

  return <SettingsUsersClient currentUser={currentUser} users={users} />
}
