import {
  AUTH_TOKEN_COOKIE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
} from "@/lib/auth-token"

function writeTokenCookie(token: string): void {
  if (typeof document === "undefined") {
    return
  }

  document.cookie = `${AUTH_TOKEN_COOKIE_KEY}=${encodeURIComponent(token)}; Path=/; SameSite=Lax`
}

function clearTokenCookie(): void {
  if (typeof document === "undefined") {
    return
  }

  document.cookie = `${AUTH_TOKEN_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
  writeTokenCookie(token)
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  clearTokenCookie()
}
