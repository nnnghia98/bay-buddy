import { afterEach, describe, expect, it, vi } from "vitest"

import { createClientUuid } from "./client-uuid"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("createClientUuid", () => {
  it("uses crypto.randomUUID when available", () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "123e4567-e89b-42d3-a456-426614174000",
    })

    expect(createClientUuid()).toBe("123e4567-e89b-42d3-a456-426614174000")
  })

  it("creates a valid UUID v4 when randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(0xab)
        return bytes
      },
    })

    expect(createClientUuid()).toBe("abababab-abab-4bab-abab-abababababab")
  })

  it("still creates a valid UUID v4 when Web Crypto is unavailable", () => {
    vi.stubGlobal("crypto", undefined)

    expect(createClientUuid()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })
})
