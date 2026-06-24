const AUTHENTICATED_SIDEBAR_CLASS_NAME = "w-[72px]"

const AUTHENTICATED_CONTENT_OFFSET_CLASS_NAME = "lg:pl-[72px]"

const AUTHENTICATED_MAIN_CLASS_NAME =
  "mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-7"

const WORK_SURFACE_CLASS_NAME =
  "rounded-xl border border-border bg-white shadow-[var(--shadow-sm)]"

const PAGE_HEADER_CLASS_NAME =
  "min-h-14 border-b border-border/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(247,249,252,0.86)_100%)] shadow-[0_16px_36px_-34px_rgba(15,48,106,0.56)] backdrop-blur-xl"

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
