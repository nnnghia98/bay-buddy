import { describe, expect, it } from "vitest"

import {
  getAuthenticatedContentOffsetClassName,
  getAuthenticatedMainClassName,
  getAuthenticatedSidebarClassName,
  getPageHeaderClassName,
  getTableSectionClassName,
  getWorkSurfaceClassName,
} from "./authenticated-layout"

describe("authenticated-layout", () => {
  it("returns static authenticated shell sizing classes", () => {
    expect(getAuthenticatedSidebarClassName()).toBe("w-[248px]")
    expect(getAuthenticatedContentOffsetClassName()).toBe("lg:pl-[248px]")
    expect(getAuthenticatedContentOffsetClassName()).not.toContain("w-[248px]")
  })

  it("returns the wider authenticated main content contract", () => {
    expect(getAuthenticatedMainClassName()).toContain("mx-auto")
    expect(getAuthenticatedMainClassName()).toContain("w-full")
    expect(getAuthenticatedMainClassName()).toContain("max-w-[1600px]")
    expect(getAuthenticatedMainClassName()).toContain("px-4")
    expect(getAuthenticatedMainClassName()).toContain("py-5")
  })

  it("returns a semantic work-surface contract", () => {
    expect(getWorkSurfaceClassName()).toContain("rounded-xl")
    expect(getWorkSurfaceClassName()).toContain("border")
    expect(getWorkSurfaceClassName()).toContain("border-border")
    expect(getWorkSurfaceClassName()).toContain("bg-white")
    expect(getWorkSurfaceClassName()).toContain("shadow-[0_1px_3px_rgba(0,0,0,0.06)]")
  })

  it("returns compact page header and table wrapper classes", () => {
    expect(getPageHeaderClassName()).toContain("min-h-14")
    expect(getPageHeaderClassName()).not.toContain("min-h-20")
    expect(getTableSectionClassName()).toContain("overflow-hidden")
    expect(getTableSectionClassName()).toContain("rounded-xl")
    expect(getTableSectionClassName()).toContain("border-border")
    expect(getTableSectionClassName()).toContain("shadow-[0_1px_3px_rgba(0,0,0,0.06)]")
    expect(getTableSectionClassName()).not.toContain("overflow-x-auto")
    expect(getTableSectionClassName()).toContain("bg-white")
    expect(getTableSectionClassName()).not.toContain("bg-card")
  })
})
