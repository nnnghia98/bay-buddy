const AUTHENTICATED_SIDEBAR_CLASS_NAME = "w-[72px]"

const AUTHENTICATED_CONTENT_OFFSET_CLASS_NAME = "lg:pl-[72px]"

const AUTHENTICATED_MAIN_CLASS_NAME =
  "mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-7"

const WORK_SURFACE_CLASS_NAME =
  "rounded-xl border border-border bg-white shadow-[var(--shadow-sm)]"

const PAGE_HEADER_CLASS_NAME =
  "min-h-12 border-b border-border/70 bg-background/92 backdrop-blur-md"

const TABLE_SECTION_CLASS_NAME =
  "overflow-hidden rounded-xl border border-border bg-white shadow-[var(--shadow-sm)]"

export function getAuthenticatedMainClassName(): string {
  return AUTHENTICATED_MAIN_CLASS_NAME
}

export function getAuthenticatedSidebarClassName(): string {
  return AUTHENTICATED_SIDEBAR_CLASS_NAME
}

export function getAuthenticatedContentOffsetClassName(): string {
  return AUTHENTICATED_CONTENT_OFFSET_CLASS_NAME
}

export function getWorkSurfaceClassName(): string {
  return WORK_SURFACE_CLASS_NAME
}

export function getPageHeaderClassName(): string {
  return PAGE_HEADER_CLASS_NAME
}

export function getTableSectionClassName(): string {
  return TABLE_SECTION_CLASS_NAME
}
