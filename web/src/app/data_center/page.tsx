import { DataCenterClient } from "@/app/data_center/data-center-client"
import { fetchCurrentUser } from "@/lib/server-users"

export default async function DataCenterPage() {
  const currentUser = await fetchCurrentUser()

  return <DataCenterClient currentUser={currentUser} />
}
