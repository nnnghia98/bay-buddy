"use client"

import * as React from "react"
import { Theme } from "@astryxdesign/core/theme"
import { neutralTheme } from "@astryxdesign/theme-neutral/built"

import {
  DEFAULT_THEME_MODE,
  parseThemeMode,
  persistThemeMode,
  readStoredThemeMode,
  THEME_MODE_STORAGE_KEY,
  type ThemeMode,
} from "@/lib/theme-mode"

type ThemeModeContextValue = {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

const ThemeModeContext = React.createContext<
  ThemeModeContextValue | undefined
>(undefined)
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect

export function ThemeModeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [mode, setModeState] =
    React.useState<ThemeMode>(DEFAULT_THEME_MODE)

  useIsomorphicLayoutEffect(() => {
    setModeState(readStoredThemeMode())

    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_MODE_STORAGE_KEY) {
        setModeState(parseThemeMode(event.newValue))
      }
    }

    window.addEventListener("storage", handleStorage)

    return () => {
      window.removeEventListener("storage", handleStorage)
    }
  }, [])

  const setMode = React.useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode)
    persistThemeMode(nextMode)
  }, [])

  const value = React.useMemo(
    () => ({
      mode,
      setMode,
    }),
    [mode, setMode],
  )

  return (
    <Theme mode={mode} theme={neutralTheme}>
      <ThemeModeContext.Provider value={value}>
        {children}
      </ThemeModeContext.Provider>
    </Theme>
  )
}

export function useThemeMode(): ThemeModeContextValue {
  const context = React.useContext(ThemeModeContext)

  if (!context) {
    throw new Error("useThemeMode must be used within a ThemeModeProvider")
  }

  return context
}
