import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  clearStoredToken,
  getCookieToken,
  getStoredToken,
  hydrateAuthTokenFromStorage,
  setStoredToken,
} from "@/lib/auth-storage"

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
      value: { localStorage },
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
    document.cookie = "bay-buddy.access-token=cookie-token; Path=/; SameSite=Lax"

    const token = hydrateAuthTokenFromStorage()

    expect(token).toBe("cookie-token")
    expect(getCookieToken()).toBe("cookie-token")
    expect(getStoredToken()).toBe("cookie-token")
  })

  it("clears stale local storage when the auth cookie is missing", () => {
    window.localStorage.setItem("bay-buddy.access-token", "stale-token")

    const token = hydrateAuthTokenFromStorage()

    expect(token).toBeNull()
    expect(getStoredToken()).toBeNull()
  })

  it("clears both storage locations on logout", () => {
    setStoredToken("active-token")

    clearStoredToken()

    expect(getStoredToken()).toBeNull()
    expect(getCookieToken()).toBeNull()
  })
})
