"use client"

import * as React from "react"

import {
  clearStoredToken,
  expireStoredSession,
  getAuthTokenExpiration,
  hydrateAuthTokenFromStorage,
  setStoredToken,
  subscribeToAuthSessionExpired,
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
const MAX_AUTH_EXPIRY_TIMEOUT_MS = 2_147_483_647

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(null)
  const [isReady, setIsReady] = React.useState(false)

  React.useEffect(() => {
    const tokenFromStorage = hydrateAuthTokenFromStorage()
    setToken(tokenFromStorage)
    setIsReady(true)
  }, [])

  React.useEffect(() => {
    return subscribeToAuthSessionExpired(() => {
      setToken(null)
    })
  }, [])

  React.useEffect(() => {
    if (!token) {
      return
    }

    const expiresAt = getAuthTokenExpiration(token)
    if (expiresAt === null) {
      expireStoredSession("expired")
      return
    }

    const nowInMilliseconds = Date.now()
    const expiresAtInMilliseconds = expiresAt * 1000
    const millisecondsUntilExpiry = expiresAtInMilliseconds - nowInMilliseconds

    if (millisecondsUntilExpiry <= 0) {
      expireStoredSession("expired")
      return
    }

    const timeoutId = window.setTimeout(() => {
      const currentExpiresAt = getAuthTokenExpiration(token)

      if (
        currentExpiresAt === null ||
        currentExpiresAt * 1000 <= Date.now()
      ) {
        expireStoredSession("expired")
      }
    }, Math.min(millisecondsUntilExpiry, MAX_AUTH_EXPIRY_TIMEOUT_MS))

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [token])

  const login = React.useCallback((nextToken: string) => {
    if (setStoredToken(nextToken)) {
      setToken(nextToken)
      return
    }

    setToken(null)
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
