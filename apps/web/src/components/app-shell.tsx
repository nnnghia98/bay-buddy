"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  ChevronDown,
  FileText,
  Home,
  Menu,
  Search,
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

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  disabled?: boolean
}

const navItems: NavItem[] = [
  { label: "Home", href: "/", icon: Home, disabled: true },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Invoices", href: "/invoices", icon: FileText, disabled: true },
  { label: "Tickets", href: "/tickets/capture", icon: Ticket },
  { label: "Reports", href: "/reports", icon: FileText, disabled: true },
  { label: "Settings", href: "/settings", icon: Settings, disabled: true },
]

function getInitials(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
}

function useBreadcrumbs(pathname: string, customerName?: string) {
  return React.useMemo(() => {
    if (pathname === "/customers") {
      return [
        { label: "Customers", href: "/customers" },
      ]
    }

    if (pathname.startsWith("/customers/")) {
      return [
        { label: "Customers", href: "/customers" },
        {
          label: customerName?.trim() || "Customer Detail",
          href: pathname,
        },
      ]
    }

    if (pathname.startsWith("/tickets/capture")) {
      return [
        { label: "Tickets", href: "/tickets/capture" },
        { label: "Capture", href: pathname },
      ]
    }

    return [{ label: "Bay Buddy Dashboard", href: pathname }]
  }, [customerName, pathname])
}

function ShellNavigation({
  pathname,
  onNavigate,
}: {
  pathname: string
  onNavigate?: () => void
}) {
  return (
    <nav className="space-y-1.5">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive =
          !item.disabled &&
          (pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href)))

        const itemClasses = cn(
          "group relative flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-all duration-200 ease-out hover:translate-x-1 hover:bg-slate-100 hover:text-slate-900",
          isActive
            ? "bg-accent/50 font-semibold text-primary shadow-[var(--shadow-sm)]"
            : "",
          item.disabled && "cursor-default opacity-60",
        )

        const content = (
          <>
            {isActive ? (
              <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary" />
            ) : null}
            <Icon
              className={cn(
                "h-5 w-5 shrink-0 transition-all duration-200 ease-out",
                isActive && "text-primary drop-shadow-[0_0_8px_rgba(57,129,246,0.4)]",
                !item.disabled && "group-hover:translate-x-1 group-hover:text-primary",
              )}
              strokeWidth={2}
            />
            <span className="flex-1 text-left">{item.label}</span>
            {item.disabled ? (
              <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                Soon
              </span>
            ) : null}
          </>
        )

        if (item.disabled) {
          return (
            <div aria-disabled="true" className={itemClasses} key={item.label}>
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
  const pathname = usePathname()
  const router = useRouter()
  const { token, isReady, logout } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)

  const showShell = pathname !== "/login"
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

  const breadcrumbs = useBreadcrumbs(pathname, customerQuery.data?.name)
  const userName = userQuery.data?.username ?? "Staff"
  const userRole = userQuery.data?.role ?? "STAFF"

  if (!showShell) {
    return <>{children}</>
  }

  return (
    <div className="min-h-full bg-background font-sans text-foreground">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-72 flex-col border-r border-border/50 bg-sidebar px-4 py-5 shadow-[1px_0_10px_rgba(57,129,246,0.05)] lg:flex">
        <div className="flex items-center justify-between px-2">
          <div>
            <p className="font-sans text-xl font-bold tracking-tight text-slate-900">
              Bay Buddy
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-primary">
              Bay Buddy
            </p>
          </div>
        </div>

        <div className="mt-8 flex-1 space-y-6 overflow-y-auto">
          <div className="rounded-2xl border border-border/50 bg-card/80 p-4 shadow-[var(--shadow-sm)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Workspace
            </p>
            <p className="mt-2 text-sm leading-[1.6] text-slate-600">
              Bay Buddy operations shell for customers, tickets, and finance.
            </p>
          </div>

          <ShellNavigation
            onNavigate={() => setIsSidebarOpen(false)}
            pathname={pathname}
          />
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/85 p-4 shadow-[var(--shadow-sm)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Signed in
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{userName}</p>
          <p className="text-sm text-slate-500">{userRole}</p>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-md">
          <div className="flex min-h-20 items-center gap-4 px-4 py-4 sm:px-6">
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
                <div className="flex h-full flex-col bg-background">
                  <SheetHeader className="border-b border-border/50 px-6 py-6">
                    <SheetTitle className="font-sans text-3xl font-bold tracking-tight text-slate-900">
                      Bay Buddy
                    </SheetTitle>
                    <SheetDescription>
                      Professional flight, ticket, and receivable management.
                    </SheetDescription>
                  </SheetHeader>

                  <div className="flex-1 overflow-y-auto px-4 py-5">
                    <ShellNavigation
                      onNavigate={() => setIsSidebarOpen(false)}
                      pathname={pathname}
                    />
                  </div>

                  <div className="border-t border-border/50 px-6 py-5">
                    <p className="text-sm font-semibold text-slate-900">{userName}</p>
                    <p className="mt-1 text-sm text-slate-500">{userRole}</p>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <nav
                aria-label="Breadcrumb"
                className="flex flex-wrap items-center gap-2 text-sm text-slate-500"
              >
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={`${crumb.href}-${crumb.label}`}>
                    {index > 0 ? <span className="text-slate-300">/</span> : null}
                    {index === breadcrumbs.length - 1 ? (
                      <span className="font-semibold text-slate-900">{crumb.label}</span>
                    ) : (
                      <Link className="transition-colors hover:text-primary" href={crumb.href}>
                        {crumb.label}
                      </Link>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            </div>

            <button
              className="hidden items-center gap-3 rounded-md border border-slate-200 bg-card/80 px-2 py-1 text-xs text-slate-500 shadow-[var(--shadow-sm)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/20 hover:text-slate-700 md:flex"
              type="button"
            >
              <Search className="h-4 w-4" strokeWidth={2} />
              <span>Search...</span>
              <span className="rounded-sm border border-slate-200 px-1.5 py-0.5 text-[11px] uppercase tracking-[0.12em] text-slate-400">
                Cmd+K
              </span>
            </button>

            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-3 rounded-full border border-border/50 bg-card/90 px-3 py-2 shadow-[var(--shadow-sm)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
                  {getInitials(userName)}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-semibold leading-[1.2] text-slate-900">
                    {userName}
                  </p>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                    {userRole}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-border/50 bg-card p-2 shadow-[var(--shadow-lg)]">
                <button
                  className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition-colors duration-200 hover:bg-accent/40 hover:text-slate-900"
                  onClick={() => {
                    logout()
                    router.replace("/login")
                  }}
                  type="button"
                >
                  Sign out
                </button>
              </div>
            </details>
          </div>
        </header>

        <main className="min-h-[calc(100vh-5rem)] px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  )
}
