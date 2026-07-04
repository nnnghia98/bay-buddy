"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Database,
  FileText,
  Menu,
  ReceiptText,
  Settings,
  Ticket,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { apiFetchData } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { LOGIN_PATH, SESSION_EXPIRED_LOGIN_PATH } from "@/lib/auth-token"
import {
  getAuthenticatedContentOffsetClassName,
  getAuthenticatedMainClassName,
  getAuthenticatedSidebarClassName,
  getPageHeaderClassName,
} from "@/lib/authenticated-layout"
import {
  isUnauthorizedSessionError,
  shouldRenderAuthenticatedShell,
} from "@/lib/auth-session"
import { useI18n } from "@/locales/client"
import { cn } from "@/lib/utils"

type AppShellProps = {
  children: React.ReactNode
}

type CurrentUser = {
  id: string
  username: string
  role: string
  is_active: boolean
}

type CustomerSummary = {
  id: string
  name: string
}

type NavLabelKey =
  | "tickets"
  | "manualDebts"
  | "activities"
  | "customers"
  | "reports"
  | "settings"
  | "dataCenter"

type NavItem = {
  labelKey: NavLabelKey
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  adminOnly?: boolean
  disabled?: boolean
}

const navItems: NavItem[] = [
  { labelKey: "manualDebts", href: "/debts/input", icon: ReceiptText },
  { labelKey: "reports", href: "/report", icon: FileText },
  { labelKey: "tickets", href: "/tickets/input", icon: Ticket },
  { labelKey: "activities", href: "/activities", icon: Activity },
  { labelKey: "customers", href: "/customers", icon: Users },
  { labelKey: "settings", href: "/settings", icon: Settings },
  { labelKey: "dataCenter", href: "/data_center", icon: Database, adminOnly: true },
]

function getInitials(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
}

function useBreadcrumbs(
  pathname: string,
  homeLabel: string,
  labels: {
    customers: string
    customerDetail: string
    tickets: string
    ticketActivity: string
    ticketDetail: string
    aiTicketInput: string
    manualDebts: string
    invoices: string
    financeDocuments: string
    quotes: string
    reports: string
    settings: string
    dataCenter: string
    fallback: string
  },
  customerName?: string,
) {
  return React.useMemo(() => {
    if (pathname === "/") {
      return [{ label: homeLabel, href: "/" }]
    }

    if (pathname === "/customers") {
      return [{ label: labels.customers, href: "/customers" }]
    }

    if (pathname.startsWith("/customers/")) {
      return [
        { label: labels.customers, href: "/customers" },
        {
          label: customerName?.trim() || labels.customerDetail,
          href: pathname,
        },
      ]
    }

    if (pathname.startsWith("/tickets/input")) {
      return [
        { label: labels.tickets, href: "/tickets/input" },
        { label: labels.aiTicketInput, href: pathname },
      ]
    }

    if (pathname.startsWith("/debts/input")) {
      return [
        { label: labels.tickets, href: "/tickets/input" },
        { label: labels.manualDebts, href: pathname },
      ]
    }

    if (pathname.startsWith("/activities") || pathname.startsWith("/activites")) {
      return [
        { label: labels.tickets, href: "/tickets/input" },
        { label: labels.ticketActivity, href: pathname },
      ]
    }

    if (pathname.startsWith("/tickets/")) {
      return [
        { label: labels.tickets, href: "/tickets/input" },
        { label: labels.ticketDetail, href: pathname },
      ]
    }

    if (pathname.startsWith("/invoices")) {
      return [
        { label: labels.invoices, href: "/invoices" },
        { label: labels.financeDocuments, href: pathname },
      ]
    }

    if (pathname.startsWith("/quotes")) {
      return [
        { label: labels.quotes, href: pathname },
        { label: labels.financeDocuments, href: pathname },
      ]
    }

    if (pathname.startsWith("/report")) {
      return [{ label: labels.reports, href: "/report" }]
    }

    if (pathname.startsWith("/settings")) {
      return [{ label: labels.settings, href: pathname }]
    }

    if (pathname.startsWith("/data_center")) {
      return [{ label: labels.dataCenter, href: pathname }]
    }

    return [{ label: labels.fallback, href: pathname }]
  }, [customerName, homeLabel, labels, pathname])
}

function ShellNavigation({
  compact = false,
  currentUserRole,
  pathname,
  onNavigate,
}: {
  compact?: boolean
  currentUserRole?: string
  pathname: string
  onNavigate?: () => void
}) {
  const t = useI18n()

  return (
    <nav className={cn(compact ? "flex flex-col items-center gap-2" : "space-y-2")}>
      {navItems.map((item) => {
        if (item.adminOnly && currentUserRole !== "ADMIN") {
          return null
        }

        const Icon = item.icon
        const label = t(`appShell.nav.${item.labelKey}`)
        const isActive =
          !item.disabled &&
          (pathname === item.href ||
            (item.href === "/tickets/input"
              ? pathname.startsWith("/tickets/")
              : item.href === "/debts/input"
                ? pathname.startsWith("/debts/")
              : item.href !== "/" && pathname.startsWith(item.href)))

        const itemClasses = cn(
          "group relative flex min-h-11 items-center rounded-md border border-transparent text-sm font-semibold tracking-[0.08px] text-muted-foreground transition-[background-color,border-color,color,box-shadow,transform] duration-200 hover:border-primary/15 hover:bg-sidebar-accent hover:text-foreground active:translate-x-0",
          compact
            ? "w-12 justify-center px-1 py-1"
            : "gap-3 px-3.5 py-2.5 hover:translate-x-0.5",
          isActive &&
            (compact
              ? "border-primary/10 bg-white text-primary shadow-[0_10px_24px_-18px_rgba(27,97,201,0.7)]"
              : "border-primary/15 bg-white text-primary shadow-[var(--shadow-sm)]"),
          item.disabled && "cursor-default opacity-55",
        )

        const content = (
          <>
            {compact && isActive ? (
              <span className="absolute left-[-0.55rem] h-7 w-1 rounded-r-full bg-primary" />
            ) : null}
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md border border-border/70 bg-white text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-colors duration-200 group-hover:border-primary/20 group-hover:text-primary",
                compact && "border-transparent bg-transparent shadow-none group-hover:bg-white group-hover:shadow-[var(--shadow-sm)]",
                isActive && (compact ? "bg-accent text-primary" : "border-primary/20 bg-accent text-primary"),
              )}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
            </div>
            <span className={cn("flex-1 text-left", compact && "sr-only")}>
              {label}
            </span>
            {compact ? (
              <span
                className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground opacity-0 shadow-[var(--shadow-md)] transition-opacity duration-150 group-hover:block group-hover:opacity-100"
                role="tooltip"
              >
                {label}
              </span>
            ) : null}
            {item.disabled && !compact ? (
              <span className="rounded-full border border-border bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("appShell.comingSoon")}
              </span>
            ) : null}
          </>
        )

        if (item.disabled) {
          return (
            <div aria-disabled="true" className={itemClasses} key={item.labelKey}>
              {content}
            </div>
          )
        }

        return (
          <Link
            aria-label={compact ? label : undefined}
            className={itemClasses}
            href={item.href}
            key={item.href}
            onClick={onNavigate}
          >
            {content}
          </Link>
        )
      })}
    </nav>
  )
}

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-lg bg-muted", className)}
    />
  )
}

function AuthenticatedShellLoading({
  loadingLabel,
  homeLabel,
}: {
  loadingLabel: string
  homeLabel: string
}) {
  return (
    <div
      aria-busy="true"
      aria-label={loadingLabel}
      className="min-h-full bg-background text-foreground"
      role="status"
    >
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-sidebar-border bg-sidebar/96 px-2 py-4 shadow-[12px_0_36px_-34px_rgba(15,48,106,0.48)] lg:block",
          getAuthenticatedSidebarClassName(),
        )}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-border/80 pb-4">
            <div className="flex justify-center py-2">
              <SkeletonBlock className="h-10 w-10" />
            </div>
          </div>
          <div className="space-y-3 py-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                className="flex min-h-11 items-center justify-center rounded-md px-2 py-2"
                key={index}
              >
                <SkeletonBlock className="h-9 w-9" />
              </div>
            ))}
          </div>
        </div>
      </aside>

      <div className={getAuthenticatedContentOffsetClassName()}>
        <header className={cn("sticky top-0 z-30", getPageHeaderClassName())}>
          <div className="flex min-h-14 items-center gap-3 px-4 py-2 sm:px-6 lg:px-7">
            <SkeletonBlock className="h-11 w-11 lg:hidden" />
            <div className="min-w-0 flex-1">
              <div className="inline-flex min-h-10 max-w-full items-center rounded-md border border-border/75 bg-white/78 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <p className="truncate text-sm font-semibold text-foreground">
                  {homeLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-md border border-border/80 bg-white/86 px-2.5 py-1.5 shadow-[var(--shadow-sm)]">
              <SkeletonBlock className="h-10 w-10 rounded-md" />
              <div className="hidden min-w-24 space-y-2 sm:block">
                <SkeletonBlock className="h-3 w-24" />
                <SkeletonBlock className="h-2.5 w-16" />
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-3.5rem)]">
          <div className={getAuthenticatedMainClassName()}>
            <div className="space-y-6 pb-12">
              <section className="rounded-xl border border-border bg-white px-5 py-4 shadow-[var(--shadow-sm)]">
                <SkeletonBlock className="h-3 w-40" />
                <SkeletonBlock className="mt-3 h-7 max-w-lg" />
                <SkeletonBlock className="mt-3 h-4 max-w-2xl" />
              </section>
              <div className="grid gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <section
                    className="rounded-xl border border-border bg-white p-5 shadow-[var(--shadow-sm)]"
                    key={index}
                  >
                    <SkeletonBlock className="h-8 w-8" />
                    <SkeletonBlock className="mt-4 h-3 w-28" />
                    <SkeletonBlock className="mt-3 h-7 w-32" />
                    <SkeletonBlock className="mt-3 h-3 w-44 max-w-full" />
                  </section>
                ))}
              </div>
              <section className="rounded-xl border border-border bg-white shadow-[var(--shadow-sm)]">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    className="grid gap-3 border-b border-border px-5 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto]"
                    key={index}
                  >
                    <div className="flex items-start gap-3">
                      <SkeletonBlock className="h-9 w-9" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <SkeletonBlock className="h-4 max-w-xs" />
                        <SkeletonBlock className="h-3 max-w-lg" />
                      </div>
                    </div>
                    <SkeletonBlock className="h-5 w-24" />
                  </div>
                ))}
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export function AppShell({ children }: AppShellProps) {
  const t = useI18n()
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { token, isReady, logout } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)

  const showShell = pathname !== "/login"
  const shouldRenderShell = shouldRenderAuthenticatedShell({
    pathname,
    isReady,
    token,
  })
  const customerId =
    pathname.startsWith("/customers/") && pathname.split("/")[2]
      ? pathname.split("/")[2]
      : null

  const userQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: () => apiFetchData<CurrentUser>("/auth/me"),
    enabled: showShell && isReady && Boolean(token),
  })

  const customerQuery = useQuery({
    queryKey: ["shell-customer-breadcrumb", customerId],
    queryFn: () => apiFetchData<CustomerSummary>(`/customers/${customerId}`),
    enabled: showShell && isReady && Boolean(token) && Boolean(customerId),
  })

  React.useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  React.useEffect(() => {
    if (isReady && !token && showShell) {
      queryClient.clear()
      router.replace(LOGIN_PATH)
    }
  }, [isReady, queryClient, router, showShell, token])

  React.useEffect(() => {
    if (
      !showShell ||
      (!isUnauthorizedSessionError(userQuery.error) &&
        !isUnauthorizedSessionError(customerQuery.error))
    ) {
      return
    }

    logout()
    queryClient.clear()
    router.replace(SESSION_EXPIRED_LOGIN_PATH)
  }, [customerQuery.error, logout, queryClient, router, showShell, userQuery.error])

  const breadcrumbs = useBreadcrumbs(
    pathname,
    t("appShell.home"),
    React.useMemo(
      () => ({
        aiTicketInput: t("appShell.breadcrumbs.aiTicketInput"),
        customerDetail: t("appShell.breadcrumbs.customerDetail"),
        customers: t("appShell.nav.customers"),
        dataCenter: t("appShell.nav.dataCenter"),
        fallback: t("appShell.breadcrumbs.fallback"),
        financeDocuments: t("appShell.breadcrumbs.financeDocuments"),
        invoices: t("appShell.nav.invoices"),
        manualDebts: t("appShell.breadcrumbs.manualDebts"),
        quotes: t("appShell.breadcrumbs.quotes"),
        reports: t("appShell.nav.reports"),
        settings: t("appShell.nav.settings"),
        ticketActivity: t("appShell.breadcrumbs.ticketActivity"),
        ticketDetail: t("appShell.breadcrumbs.ticketDetail"),
        tickets: t("appShell.breadcrumbs.tickets"),
      }),
      [t],
    ),
    customerQuery.data?.name,
  )
  const userName = userQuery.data?.username ?? t("appShell.userFallback")
  const userRole =
    userQuery.data?.role === "ADMIN"
      ? t("appShell.roles.admin")
      : t("appShell.roles.staff")

  if (!showShell) {
    return <>{children}</>
  }

  if (!isReady) {
    return (
      <AuthenticatedShellLoading
        homeLabel={t("appShell.home")}
        loadingLabel={t("appShell.loading")}
      />
    )
  }

  if (!shouldRenderShell) {
    return null
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-sidebar-border bg-sidebar/96 px-2 py-4 shadow-[12px_0_36px_-34px_rgba(15,48,106,0.48)] lg:block",
          getAuthenticatedSidebarClassName(),
        )}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-border/80 pb-4">
            <div className="flex justify-center py-2">
              <Link
                aria-label={t("appShell.brandHomeAria")}
                className="flex justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                href="/"
              >
                <Image
                  alt="Bay Buddy"
                  className="h-10 w-auto object-contain"
                  height={820}
                  priority
                  src="/branding/logo-bay-buddy-v1-crop.png"
                  width={1020}
                />
              </Link>
            </div>
          </div>
          <div className="flex-1 py-4">
            <ShellNavigation
              compact
              currentUserRole={userQuery.data?.role}
              onNavigate={() => setIsSidebarOpen(false)}
              pathname={pathname}
            />
          </div>
        </div>
      </aside>

      <div className={getAuthenticatedContentOffsetClassName()}>
        <header className={cn("sticky top-0 z-30", getPageHeaderClassName())}>
          <div className="flex min-h-14 items-center gap-3 px-4 py-2 sm:px-6 lg:px-7">
            <Sheet onOpenChange={setIsSidebarOpen} open={isSidebarOpen}>
              <SheetTrigger asChild>
                <Button
                  aria-label={t("appShell.mobileMenuAria")}
                  className="lg:hidden"
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <Menu className="h-5 w-5" strokeWidth={2} />
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-sidebar p-0" side="left">
                <div className="flex h-full flex-col bg-sidebar">
                  <SheetHeader className="border-b border-border px-5 py-5">
                    <SheetTitle className="flex justify-center px-2 py-2">
                      <Link
                        aria-label={t("appShell.brandHomeAria")}
                        className="flex justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        href="/"
                        onClick={() => setIsSidebarOpen(false)}
                      >
                        <Image
                          alt="Bay Buddy"
                          className="h-20 w-auto object-contain"
                          height={820}
                          priority
                          src="/branding/logo-bay-buddy-v1-crop.png"
                          width={1020}
                        />
                      </Link>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto px-4 py-5">
                    <ShellNavigation
                      currentUserRole={userQuery.data?.role}
                      onNavigate={() => setIsSidebarOpen(false)}
                      pathname={pathname}
                    />
                  </div>

                </div>
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <nav
                aria-label="Breadcrumb"
                className="inline-flex min-h-10 max-w-full items-center overflow-hidden rounded-md border border-border/75 bg-white/78 px-3 text-sm text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
              >
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={`${crumb.href}-${crumb.label}`}>
                    {index > 0 ? (
                      <ChevronRight
                        aria-hidden="true"
                        className="mx-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/45"
                        strokeWidth={2}
                      />
                    ) : null}
                    {index === breadcrumbs.length - 1 ? (
                      <span className="min-w-0 truncate font-semibold text-foreground">
                        {crumb.label}
                      </span>
                    ) : (
                      <Link
                        className="shrink-0 font-medium text-muted-foreground transition-colors hover:text-primary"
                        href={crumb.href}
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            </div>

            <details className="group relative">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md border border-border/80 bg-white/86 px-2.5 py-1.5 shadow-[var(--shadow-sm)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:border-primary/25 hover:bg-white hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-primary/10 bg-[linear-gradient(135deg,var(--theme-blue-soft),#ffffff)] text-sm font-semibold text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  {getInitials(userName)}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="max-w-36 truncate text-sm font-semibold leading-[1.2] text-foreground">
                    {userName}
                  </p>
                  <p className="max-w-36 truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {userRole}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border/85 bg-white p-2 shadow-[var(--shadow-lg)]">
                <button
                  className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground"
                  onClick={() => {
                    logout()
                    router.replace(LOGIN_PATH)
                  }}
                  type="button"
                >
                  {t("appShell.signOut")}
                </button>
              </div>
            </details>
          </div>
        </header>

        <main className="min-h-[calc(100vh-3.5rem)]">
          <div className={getAuthenticatedMainClassName()}>{children}</div>
        </main>
      </div>
    </div>
  )
}
