import type { ThemeMode } from "@astryxdesign/core/theme"

export type { ThemeMode }

export const DEFAULT_THEME_MODE: ThemeMode = "system"
export const THEME_MODE_STORAGE_KEY = "bay-buddy.theme-mode"

type ThemeModeStorage = Pick<
  Storage,
  "getItem" | "removeItem" | "setItem"
>

function getBrowserStorage(): ThemeModeStorage | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system"
}

export function parseThemeMode(value: string | null): ThemeMode {
  return isThemeMode(value) ? value : DEFAULT_THEME_MODE
}

export function readStoredThemeMode(
  storage: ThemeModeStorage | null = getBrowserStorage(),
): ThemeMode {
  if (!storage) {
    return DEFAULT_THEME_MODE
  }

  try {
    return parseThemeMode(storage.getItem(THEME_MODE_STORAGE_KEY))
  } catch {
    return DEFAULT_THEME_MODE
  }
}

export function persistThemeMode(
  mode: ThemeMode,
  storage: ThemeModeStorage | null = getBrowserStorage(),
): void {
  if (!storage) {
    return
  }

  try {
    if (mode === DEFAULT_THEME_MODE) {
      storage.removeItem(THEME_MODE_STORAGE_KEY)
      return
    }

    storage.setItem(THEME_MODE_STORAGE_KEY, mode)
  } catch {
    // The selected mode still applies for this tab when storage is unavailable.
  }
}
