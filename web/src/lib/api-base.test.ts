import { afterEach, describe, expect, it } from "vitest"

import { getServerApiBaseUrl } from "@/lib/api-base"

const originalEnv = {
  INTERNAL_API_BASE_URL: process.env.INTERNAL_API_BASE_URL,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NODE_ENV: process.env.NODE_ENV,
}

afterEach(() => {
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

describe("getServerApiBaseUrl", () => {
  it("uses localhost during development when no explicit server base is configured", () => {
    delete process.env.INTERNAL_API_BASE_URL
    delete process.env.NEXT_PUBLIC_API_BASE_URL
    process.env.NODE_ENV = "development"

    expect(getServerApiBaseUrl()).toBe("http://localhost:6768/api/v1")
  })
})
