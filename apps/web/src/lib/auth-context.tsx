"use client"

import * as React from "react"

import {
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from "@/lib/auth-storage"

type AuthContextValue = {
  token: string | null
  isReady: boolean
  login: (token: string) => void
  logout: () => void
}

const AuthContext = React.createContext<AuthContextValue | undefined>(
  undefined,
)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(null)
  const [isReady, setIsReady] = React.useState(false)

  React.useEffect(() => {
    const storedToken = getStoredToken()
    if (storedToken) {
      setStoredToken(storedToken)
    }
    setToken(storedToken)
    setIsReady(true)
  }, [])

  const login = React.useCallback((nextToken: string) => {
    setStoredToken(nextToken)
    setToken(nextToken)
  }, [])

  const logout = React.useCallback(() => {
    clearStoredToken()
    setToken(null)
  }, [])

  const value = React.useMemo<AuthContextValue>(
    () => ({
      token,
      isReady,
      login,
      logout,
    }),
    [isReady, login, logout, token],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context
}
