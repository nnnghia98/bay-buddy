import { describe, expect, it, vi } from "vitest"

import {
  DEFAULT_THEME_MODE,
  parseThemeMode,
  persistThemeMode,
  readStoredThemeMode,
  THEME_MODE_STORAGE_KEY,
} from "@/lib/theme-mode"

function createStorageMock(initialValue: string | null = null) {
  const storage = new Map<string, string>()

  if (initialValue !== null) {
    storage.set(THEME_MODE_STORAGE_KEY, initialValue)
  }

  return {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    removeItem: vi.fn((key: string) => {
      storage.delete(key)
    }),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value)
    }),
  }
}

describe("theme-mode", () => {
  it("uses system mode when the stored value is missing or invalid", () => {
    expect(parseThemeMode(null)).toBe(DEFAULT_THEME_MODE)
    expect(parseThemeMode("sepia")).toBe(DEFAULT_THEME_MODE)
  })

  it.each(["light", "dark", "system"] as const)(
    "accepts the %s mode",
    (mode) => {
      expect(parseThemeMode(mode)).toBe(mode)
    },
  )

  it("reads a valid stored mode", () => {
    const storage = createStorageMock("dark")

    expect(readStoredThemeMode(storage)).toBe("dark")
  })

  it("stores explicit light and dark preferences", () => {
    const storage = createStorageMock()

    persistThemeMode("light", storage)

    expect(storage.setItem).toHaveBeenCalledWith(
      THEME_MODE_STORAGE_KEY,
      "light",
    )
  })

  it("removes the preference when system mode is selected", () => {
    const storage = createStorageMock("dark")

    persistThemeMode("system", storage)

    expect(storage.removeItem).toHaveBeenCalledWith(
      THEME_MODE_STORAGE_KEY,
    )
    expect(readStoredThemeMode(storage)).toBe("system")
  })

  it("falls back safely when browser storage is unavailable", () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error("blocked")
      }),
      removeItem: vi.fn(() => {
        throw new Error("blocked")
      }),
      setItem: vi.fn(() => {
        throw new Error("blocked")
      }),
    }

    expect(readStoredThemeMode(storage)).toBe("system")
    expect(() => persistThemeMode("dark", storage)).not.toThrow()
  })
})
