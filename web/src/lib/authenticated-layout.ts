const AUTHENTICATED_SIDEBAR_CLASS_NAME = "w-[248px]"

const AUTHENTICATED_CONTENT_OFFSET_CLASS_NAME = "lg:pl-[248px]"

const AUTHENTICATED_MAIN_CLASS_NAME =
  "mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-7"

const WORK_SURFACE_CLASS_NAME =
  "rounded-xl border border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]"

const PAGE_HEADER_CLASS_NAME =
  "min-h-14 border-b border-border/90 bg-white/92 backdrop-blur-md"

const TABLE_SECTION_CLASS_NAME =
  "overflow-hidden rounded-xl border border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]"

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
