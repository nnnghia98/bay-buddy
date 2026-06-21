const DEFAULT_PUBLIC_API_BASE_URL = "http://localhost:6768/api/v1"
const DEFAULT_INTERNAL_API_BASE_URL = "http://localhost:6768/api/v1"

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/$/, "")
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
}

function getBrowserReachableApiBaseUrl(configuredBaseUrl: string): string {
  if (typeof window === "undefined") {
    return configuredBaseUrl
  }

  try {
    const configuredUrl = new URL(configuredBaseUrl)

    if (!isLoopbackHost(configuredUrl.hostname) || isLoopbackHost(window.location.hostname)) {
      return configuredBaseUrl
    }

    configuredUrl.hostname = window.location.hostname
    return configuredUrl.toString()
  } catch {
    return configuredBaseUrl
  }
}

export function getClientApiBaseUrl(): string {
  return normalizeBaseUrl(
    getBrowserReachableApiBaseUrl(
      process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_PUBLIC_API_BASE_URL,
    ),
  )
}

export function getServerApiBaseUrl(): string {
  const defaultServerBaseUrl =
    process.env.NODE_ENV === "development"
      ? DEFAULT_PUBLIC_API_BASE_URL
      : DEFAULT_INTERNAL_API_BASE_URL

  return normalizeBaseUrl(
    process.env.INTERNAL_API_BASE_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      defaultServerBaseUrl,
  )
}

export function buildApiUrl(path: string, baseUrl: string): string {
  return `${baseUrl}/${path.replace(/^\//, "")}`
}
