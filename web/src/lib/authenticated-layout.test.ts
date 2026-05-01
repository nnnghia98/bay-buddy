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
    expect(getWorkSurfaceClassName()).toContain(
      "border-[color:var(--theme-panel-border-strong)]",
    )
    expect(getWorkSurfaceClassName()).toContain("bg-card")
    expect(getWorkSurfaceClassName()).toContain("shadow-sm")
    expect(getWorkSurfaceClassName()).not.toContain("bg-white")
  })

  it("returns compact page header and table wrapper classes", () => {
    expect(getPageHeaderClassName()).toContain("min-h-14")
    expect(getPageHeaderClassName()).not.toContain("min-h-20")
    expect(getTableSectionClassName()).toContain("overflow-hidden")
    expect(getTableSectionClassName()).toContain("rounded-xl")
    expect(getTableSectionClassName()).toContain(
      "border-[color:var(--theme-panel-border-strong)]",
    )
    expect(getTableSectionClassName()).toContain("shadow-sm")
    expect(getTableSectionClassName()).not.toContain("overflow-x-auto")
    expect(getTableSectionClassName()).not.toContain("bg-white")
    expect(getTableSectionClassName()).not.toContain("bg-card")
  })
})
