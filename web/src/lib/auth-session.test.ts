import { describe, expect, it } from "vitest"

import {
  isUnauthorizedSessionError,
  shouldRenderAuthenticatedShell,
} from "@/lib/auth-session"
import { ApiError } from "@/lib/api"

describe("shouldRenderAuthenticatedShell", () => {
  it("returns false for the login route", () => {
    expect(
      shouldRenderAuthenticatedShell({
        pathname: "/login",
        isReady: false,
        token: null,
      }),
    ).toBe(false)
  })

  it("returns false until auth readiness is resolved on protected routes", () => {
    expect(
      shouldRenderAuthenticatedShell({
        pathname: "/customers",
        isReady: false,
        token: "active-token",
      }),
    ).toBe(false)
  })

  it("returns false when the protected route has no token", () => {
    expect(
      shouldRenderAuthenticatedShell({
        pathname: "/customers",
        isReady: true,
        token: null,
      }),
    ).toBe(false)
  })

  it("returns true once a protected route has a resolved session", () => {
    expect(
      shouldRenderAuthenticatedShell({
        pathname: "/customers",
        isReady: true,
        token: "active-token",
      }),
    ).toBe(true)
  })
})

describe("isUnauthorizedSessionError", () => {
  it("matches ApiError instances with status 401", () => {
    const unauthorizedError = new ApiError(
      "Session expired",
      401,
      { detail: "Unauthorized" },
    )

    expect(isUnauthorizedSessionError(unauthorizedError)).toBe(true)
  })

  it("ignores non-401 errors", () => {
    const validationError = new ApiError(
      "Bad request",
      400,
      { detail: "Bad request" },
    )

    expect(isUnauthorizedSessionError(validationError)).toBe(false)
    expect(isUnauthorizedSessionError(new Error("boom"))).toBe(false)
    expect(isUnauthorizedSessionError(null)).toBe(false)
  })
})
