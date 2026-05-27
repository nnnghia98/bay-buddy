"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  ChevronDown,
  Database,
  FileText,
  Menu,
  Settings,
  Ticket,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { apiFetchData } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
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
  | "customers"
  | "invoices"
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
  { labelKey: "tickets", href: "/tickets/input", icon: Ticket },
  { labelKey: "customers", href: "/customers", icon: Users },
  { labelKey: "invoices", href: "/invoices", icon: FileText, disabled: true },
  { labelKey: "reports", href: "/report", icon: FileText },
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

function formatRoleLabel(role: string): string {
  return role === "ADMIN" ? "Quản trị viên" : "Nhân viên"
}

function useBreadcrumbs(
  pathname: string,
  homeLabel: string,
  labels: {
    customers: string
    customerDetail: string
    tickets: string
    ticketDetail: string
    aiTicketInput: string
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
  currentUserRole,
  pathname,
  onNavigate,
}: {
  currentUserRole?: string
  pathname: string
  onNavigate?: () => void
}) {
  const t = useI18n()

  return (
    <nav className="space-y-2">
      {navItems.map((item) => {
        if (item.adminOnly && currentUserRole !== "ADMIN") {
          return null
        }

        const Icon = item.icon
        const label = t(`appShell.nav.${item.labelKey}`)
        const isActive =
          !item.disabled &&
          (pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href)))

        const itemClasses = cn(
          "group relative flex min-h-12 w-full items-center gap-3 rounded-[12px] border border-transparent px-3.5 py-2.5 text-sm font-medium tracking-[0.08px] text-[#46556a] transition-all duration-200 ease-out hover:border-primary/15 hover:bg-sidebar-accent hover:text-foreground",
          isActive && "border-primary/15 bg-white text-primary shadow-[var(--shadow-sm)]",
          item.disabled && "cursor-default opacity-55",
        )

        const content = (
          <>
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-[10px] border border-border/70 bg-white text-[#66768d] transition-all duration-200 group-hover:border-primary/20 group-hover:text-primary",
                isActive && "border-primary/20 bg-accent text-primary",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
            </div>
            <span className="flex-1 text-left">{label}</span>
            {item.disabled ? (
              <span className="rounded-full border border-border bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#75839a]">
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
          <Link className={itemClasses} href={item.href} key={item.href} onClick={onNavigate}>
            {content}
          </Link>
        )
      })}
    </nav>
  )
}

export function AppShell({ children }: AppShellProps) {
  const t = useI18n()
  const pathname = usePathname()
  const router = useRouter()
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
      router.replace("/login")
    }
  }, [isReady, router, showShell, token])

  React.useEffect(() => {
    if (
      !showShell ||
      (!isUnauthorizedSessionError(userQuery.error) &&
        !isUnauthorizedSessionError(customerQuery.error))
    ) {
      return
    }

    logout()
    router.replace("/login")
  }, [customerQuery.error, logout, router, showShell, userQuery.error])

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
        quotes: t("appShell.breadcrumbs.quotes"),
        reports: t("appShell.nav.reports"),
        settings: t("appShell.nav.settings"),
        ticketDetail: t("appShell.breadcrumbs.ticketDetail"),
        tickets: t("appShell.breadcrumbs.tickets"),
      }),
      [t],
    ),
    customerQuery.data?.name,
  )
  const userName = userQuery.data?.username ?? "Staff"
  const userRole = formatRoleLabel(userQuery.data?.role ?? "STAFF")

  if (!showShell) {
    return <>{children}</>
  }

  if (!shouldRenderShell) {
    return null
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-sidebar-border bg-[#f6f8fb] px-4 py-4 lg:block",
          getAuthenticatedSidebarClassName(),
        )}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-2 pb-4">
            <div className="flex justify-center px-2 py-2">
              <Link
                aria-label="Về trang chủ"
                className="flex justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                href="/"
              >
                <Image
                  alt="Bay Buddy"
                  className="h-24 w-auto object-contain"
                  height={820}
                  priority
                  src="/branding/logo-bay-buddy-v1-crop.png"
                  width={1020}
                />
              </Link>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-4">
            <ShellNavigation
              currentUserRole={userQuery.data?.role}
              onNavigate={() => setIsSidebarOpen(false)}
              pathname={pathname}
            />
          </div>
          <div className="border-t border-border px-2 pt-4">
            <p className="text-sm font-medium text-foreground">{userName}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {userRole}
            </p>
          </div>
        </div>
      </aside>

      <div className={getAuthenticatedContentOffsetClassName()}>
        <header className={cn("sticky top-0 z-30", getPageHeaderClassName())}>
          <div className="flex min-h-14 items-center gap-3 px-4 py-3 sm:px-6 lg:px-7">
            <Sheet onOpenChange={setIsSidebarOpen} open={isSidebarOpen}>
              <SheetTrigger asChild>
                <Button
                  className="lg:hidden"
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <Menu className="h-5 w-5" strokeWidth={2} />
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-background p-0" side="left">
                <div className="flex h-full flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.98)_100%)]">
                  <SheetHeader className="border-b border-border px-5 py-5">
                    <SheetTitle className="flex justify-center px-2 py-2">
                      <Link
                        aria-label="Về trang chủ"
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
                    <SheetDescription className="px-1 pt-2 text-left">
                      Điều phối khách hàng, nhận vé và ghi nhận công nợ trong một luồng thống nhất.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto px-4 py-5">
                    <ShellNavigation
                      currentUserRole={userQuery.data?.role}
                      onNavigate={() => setIsSidebarOpen(false)}
                      pathname={pathname}
                    />
                  </div>

                  <div className="border-t border-border px-6 py-5">
                    <p className="text-sm font-medium text-foreground">{userName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{userRole}</p>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <nav
                aria-label="Breadcrumb"
                className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
              >
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={`${crumb.href}-${crumb.label}`}>
                    {index > 0 ? <span className="text-border">/</span> : null}
                    {index === breadcrumbs.length - 1 ? (
                      <span className="font-medium text-foreground">{crumb.label}</span>
                    ) : (
                      <Link className="transition-colors hover:text-primary" href={crumb.href}>
                        {crumb.label}
                      </Link>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            </div>

            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-3 rounded-[16px] border border-border bg-white px-3 py-2 shadow-[var(--shadow-sm)] transition-all duration-200 hover:border-primary/20">
                <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-accent text-sm font-semibold text-primary">
                  {getInitials(userName)}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-medium leading-[1.2] text-foreground">
                    {userName}
                  </p>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {userRole}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <div className="absolute right-0 mt-3 w-56 rounded-[18px] border border-border bg-white p-2 shadow-[var(--shadow-lg)]">
                <button
                  className="flex w-full items-center rounded-[12px] px-3 py-2 text-left text-sm text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground"
                  onClick={() => {
                    logout()
                    router.replace("/login")
                  }}
                  type="button"
                >
                  Đăng xuất
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
