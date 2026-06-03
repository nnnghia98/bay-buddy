import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  clearStoredToken,
  getActiveStoredToken,
  getCookieToken,
  getStoredToken,
  hydrateAuthTokenFromStorage,
  isAuthTokenExpired,
  setStoredToken,
} from "@/lib/auth-storage"

function createToken(expiresInSeconds: number): string {
  const payload = Buffer.from(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    }),
  ).toString("base64url")

  return `header.${payload}.signature`
}

function createStorageMock() {
  const storage = new Map<string, string>()

  return {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key)
    }),
  }
}

describe("auth-storage", () => {
  beforeEach(() => {
    const localStorage = createStorageMock()
    let cookieJar = ""

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage,
        location: {
          pathname: "/",
          search: "",
        },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      },
    })
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        get cookie() {
          return cookieJar
        },
        set cookie(value: string) {
          const [cookiePair] = value.split(";")
          const [name, rawCookieValue = ""] = cookiePair.split("=")
          const nextValue = rawCookieValue.trim()

          if (!nextValue) {
            cookieJar = ""
            return
          }

          cookieJar = `${name}=${nextValue}`
        },
      },
    })
  })

  it("hydrates auth state from the cookie and syncs local storage", () => {
    const activeToken = createToken(60)

    document.cookie = `bay-buddy.access-token=${activeToken}; Path=/; SameSite=Lax`

    const token = hydrateAuthTokenFromStorage()

    expect(token).toBe(activeToken)
    expect(getCookieToken()).toBe(activeToken)
    expect(getStoredToken()).toBe(activeToken)
  })

  it("clears stale local storage when the auth cookie is missing", () => {
    window.localStorage.setItem("bay-buddy.access-token", "stale-token")

    const token = hydrateAuthTokenFromStorage()

    expect(token).toBeNull()
    expect(getStoredToken()).toBeNull()
  })

  it("clears both storage locations on logout", () => {
    const activeToken = createToken(60)

    setStoredToken(activeToken)

    clearStoredToken()

    expect(getStoredToken()).toBeNull()
    expect(getCookieToken()).toBeNull()
  })

  it("clears expired cookie tokens during hydration", () => {
    const expiredToken = createToken(-60)

    document.cookie = `bay-buddy.access-token=${expiredToken}; Path=/; SameSite=Lax`

    expect(hydrateAuthTokenFromStorage()).toBeNull()
    expect(getStoredToken()).toBeNull()
    expect(getCookieToken()).toBeNull()
  })

  it("notifies listeners when an active stored token has expired", () => {
    const expiredToken = createToken(-60)

    window.localStorage.setItem("bay-buddy.access-token", expiredToken)

    expect(getActiveStoredToken()).toBeNull()
    expect(window.dispatchEvent).toHaveBeenCalled()
    expect(getStoredToken()).toBeNull()
  })

  it("treats malformed tokens as expired", () => {
    expect(isAuthTokenExpired("not-a-jwt")).toBe(true)
  })

  it("clears storage when the login route marks the session expired", () => {
    const activeToken = createToken(60)

    setStoredToken(activeToken)
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        pathname: "/login",
        search: "?session=expired",
      },
    })

    expect(hydrateAuthTokenFromStorage()).toBeNull()
    expect(getStoredToken()).toBeNull()
    expect(getCookieToken()).toBeNull()
  })
})
