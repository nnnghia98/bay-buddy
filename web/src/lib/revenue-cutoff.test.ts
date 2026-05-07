import { describe, expect, it } from "vitest"

import { parseRevenueFromParam } from "@/lib/revenue-cutoff"

describe("parseRevenueFromParam", () => {
  it("falls back to Vietnam month start when param is missing", () => {
    const parsed = parseRevenueFromParam(undefined, new Date("2026-05-18T00:00:00.000Z"))

    expect(parsed.toISOString()).toBe("2026-04-30T17:00:00.000Z")
  })

  it("falls back to Vietnam month start when param is invalid", () => {
    const parsed = parseRevenueFromParam("invalid-date", new Date("2026-05-18T00:00:00.000Z"))

    expect(parsed.toISOString()).toBe("2026-04-30T17:00:00.000Z")
  })

  it("parses a valid cutoff date", () => {
    const parsed = parseRevenueFromParam("2026-04-25", new Date("2026-05-18T00:00:00.000Z"))

    expect(parsed.toISOString()).toBe("2026-04-24T17:00:00.000Z")
  })
})
