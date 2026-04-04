"use client"

import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { AuthProvider } from "@/lib/auth-context"
import { I18nProviderClient } from "@/locales/client"

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Prevent refetching immediately on mount (SSR-friendly)
        staleTime: 60 * 1000,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always create a fresh client
    return makeQueryClient()
  }
  // Browser: reuse the same client across renders
  if (!browserQueryClient) browserQueryClient = makeQueryClient()
  return browserQueryClient
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProviderClient locale="vi">
        <AuthProvider>{children}</AuthProvider>
      </I18nProviderClient>
    </QueryClientProvider>
  )
}
