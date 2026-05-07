import {
  AUTH_TOKEN_COOKIE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
} from "@/lib/auth-token"

function decodeBase64Url(value: string): string {
  const normalizedValue = value.replace(/-/g, "+").replace(/_/g, "/")
  const paddingLength = (4 - (normalizedValue.length % 4)) % 4
  const paddedValue = normalizedValue + "=".repeat(paddingLength)

  return atob(paddedValue)
}

function isTokenExpired(token: string): boolean {
  try {
    const tokenParts = token.split(".")
    if (tokenParts.length < 2) {
      return true
    }

    const payload = JSON.parse(decodeBase64Url(tokenParts[1])) as {
      exp?: number
    }
    if (typeof payload.exp !== "number") {
      return true
    }

    const nowInSeconds = Math.floor(Date.now() / 1000)
    return payload.exp <= nowInSeconds
  } catch {
    return true
  }
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
  if (isTokenExpired(token)) {
    clearStoredToken()
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

export function getCookieToken(): string | null {
  return readCookieValue(AUTH_TOKEN_COOKIE_KEY)
}

export function hydrateAuthTokenFromStorage(): string | null {
  const cookieToken = getCookieToken()

  if (!cookieToken) {
    clearStoredToken()
    return null
  }

  const storedToken = getStoredToken()
  if (storedToken !== cookieToken) {
    setStoredToken(cookieToken)
  }

  if (isTokenExpired(cookieToken)) {
    clearStoredToken()
    return null
  }

  return cookieToken
}
