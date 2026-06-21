import { afterEach, describe, expect, it } from "vitest"

import { getClientApiBaseUrl, getServerApiBaseUrl } from "@/lib/api-base"

const originalEnv = {
  INTERNAL_API_BASE_URL: process.env.INTERNAL_API_BASE_URL,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NODE_ENV: process.env.NODE_ENV,
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window")

  if (originalEnv.INTERNAL_API_BASE_URL === undefined) {
    delete process.env.INTERNAL_API_BASE_URL
  } else {
    process.env.INTERNAL_API_BASE_URL = originalEnv.INTERNAL_API_BASE_URL
  }

  if (originalEnv.NEXT_PUBLIC_API_BASE_URL === undefined) {
    delete process.env.NEXT_PUBLIC_API_BASE_URL
  } else {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv.NEXT_PUBLIC_API_BASE_URL
  }

  if (originalEnv.NODE_ENV === undefined) {
    delete process.env.NODE_ENV
  } else {
    process.env.NODE_ENV = originalEnv.NODE_ENV
  }
})

function mockBrowserHostname(hostname: string): void {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: {
        hostname,
      },
    },
  })
}

describe("getClientApiBaseUrl", () => {
  it("keeps the configured localhost API URL for localhost browser sessions", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:6768/api/v1"
    mockBrowserHostname("localhost")

    expect(getClientApiBaseUrl()).toBe("http://localhost:6768/api/v1")
  })

  it("replaces a localhost API host with the current browser host for LAN sessions", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:6768/api/v1"
    mockBrowserHostname("100.81.220.45")

    expect(getClientApiBaseUrl()).toBe("http://100.81.220.45:6768/api/v1")
  })

  it("preserves an explicitly remote API URL", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.com/api/v1"
    mockBrowserHostname("100.81.220.45")

    expect(getClientApiBaseUrl()).toBe("https://api.example.com/api/v1")
  })
})

describe("getServerApiBaseUrl", () => {
  it("uses localhost during development when no explicit server base is configured", () => {
    delete process.env.INTERNAL_API_BASE_URL
    delete process.env.NEXT_PUBLIC_API_BASE_URL
    process.env.NODE_ENV = "development"

    expect(getServerApiBaseUrl()).toBe("http://localhost:6768/api/v1")
  })
})
