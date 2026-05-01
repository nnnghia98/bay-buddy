import { ApiError } from "@/lib/api"

type AuthenticatedShellVisibilityInput = {
  pathname: string
  isReady: boolean
  token: string | null
}

export function shouldRenderAuthenticatedShell({
  pathname,
  isReady,
  token,
}: AuthenticatedShellVisibilityInput): boolean {
  if (pathname === "/login") {
    return false
  }

  if (!isReady) {
    return false
  }

  return Boolean(token)
}

export function isUnauthorizedSessionError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}
