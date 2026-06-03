import {
  AUTH_TOKEN_COOKIE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
} from "@/lib/auth-token"

export const AUTH_SESSION_EXPIRED_EVENT = "bay-buddy:auth-session-expired"

export type AuthSessionExpiredReason = "expired" | "unauthorized"

type AuthSessionExpiredEvent = CustomEvent<{
  reason: AuthSessionExpiredReason
}>

function decodeBase64Url(value: string): string {
  const normalizedValue = value.replace(/-/g, "+").replace(/_/g, "/")
  const paddingLength = (4 - (normalizedValue.length % 4)) % 4
  const paddedValue = normalizedValue + "=".repeat(paddingLength)

  return atob(paddedValue)
}

export function getAuthTokenExpiration(token: string): number | null {
  try {
    const tokenParts = token.split(".")
    if (tokenParts.length < 2) {
      return null
    }

    const payload = JSON.parse(decodeBase64Url(tokenParts[1])) as {
      exp?: number
    }
    if (typeof payload.exp !== "number") {
      return null
    }

    return payload.exp
  } catch {
    return null
  }
}

export function isAuthTokenExpired(token: string): boolean {
  const expiresAt = getAuthTokenExpiration(token)
  if (expiresAt === null) {
    return true
  }

  const nowInSeconds = Math.floor(Date.now() / 1000)
  return expiresAt <= nowInSeconds
}

function getTokenMaxAgeSeconds(token: string): number | null {
  const expiresAt = getAuthTokenExpiration(token)
  if (expiresAt === null) {
    return null
  }

  const nowInSeconds = Math.floor(Date.now() / 1000)
  return Math.max(0, expiresAt - nowInSeconds)
}

function readCookieValue(name: string): string | null {
  if (typeof document === "undefined") {
    return null
  }

  const cookiePrefix = `${name}=`
  const matchedCookie = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(cookiePrefix))

  if (!matchedCookie) {
    return null
  }

  return decodeURIComponent(matchedCookie.slice(cookiePrefix.length))
}

function writeTokenCookie(token: string): void {
  if (typeof document === "undefined") {
    return
  }

  const maxAgeSeconds = getTokenMaxAgeSeconds(token)

  if (!maxAgeSeconds) {
    clearTokenCookie()
    return
  }

  document.cookie = `${AUTH_TOKEN_COOKIE_KEY}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`
}

function clearTokenCookie(): void {
  if (typeof document === "undefined") {
    return
  }

  document.cookie = `${AUTH_TOKEN_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`
}

function shouldResetSessionFromLoginUrl(): boolean {
  if (typeof window === "undefined") {
    return false
  }

  if (window.location.pathname !== "/login") {
    return false
  }

  return new URLSearchParams(window.location.search).get("session") === "expired"
}

function dispatchAuthSessionExpired(reason: AuthSessionExpiredReason): void {
  if (typeof window === "undefined") {
    return
  }

  window.dispatchEvent(
    new CustomEvent(AUTH_SESSION_EXPIRED_EVENT, {
      detail: { reason },
    }),
  )
}

export function subscribeToAuthSessionExpired(
  listener: (reason: AuthSessionExpiredReason) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined
  }

  const handleSessionExpired = (event: Event) => {
    listener((event as AuthSessionExpiredEvent).detail.reason)
  }

  window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired)

  return () => {
    window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired)
  }
}

export function expireStoredSession(reason: AuthSessionExpiredReason): void {
  clearStoredToken()
  dispatchAuthSessionExpired(reason)
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
}

export function getActiveStoredToken(): string | null {
  const token = getStoredToken()

  if (!token) {
    return null
  }

  if (isAuthTokenExpired(token)) {
    expireStoredSession("expired")
    return null
  }

  return token
}

export function setStoredToken(token: string): boolean {
  if (typeof window === "undefined") {
    return false
  }
  if (isAuthTokenExpired(token)) {
    clearStoredToken()
    return false
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
  writeTokenCookie(token)
  return true
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  clearTokenCookie()
}

export function getCookieToken(): string | null {
  return readCookieValue(AUTH_TOKEN_COOKIE_KEY)
}

export function hydrateAuthTokenFromStorage(): string | null {
  if (shouldResetSessionFromLoginUrl()) {
    clearStoredToken()
    return null
  }

  const cookieToken = getCookieToken()

  if (!cookieToken) {
    clearStoredToken()
    return null
  }

  const storedToken = getStoredToken()
  if (storedToken !== cookieToken) {
    setStoredToken(cookieToken)
  }

  if (isAuthTokenExpired(cookieToken)) {
    clearStoredToken()
    return null
  }

  return cookieToken
}
