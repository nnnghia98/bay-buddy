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
  { label: "Tổng quan", href: "/", icon: Home, disabled: true },
  { label: "Khách hàng", href: "/customers", icon: Users },
  { label: "Hóa đơn", href: "/invoices", icon: FileText, disabled: true },
  { label: "Nhập vé", href: "/tickets/capture", icon: Ticket },
  { label: "Báo cáo", href: "/reports", icon: FileText, disabled: true },
  { label: "Thiết lập", href: "/settings", icon: Settings, disabled: true },
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

function useBreadcrumbs(pathname: string, customerName?: string) {
  return React.useMemo(() => {
    if (pathname === "/customers") {
      return [{ label: "Khách hàng", href: "/customers" }]
    }

    if (pathname.startsWith("/customers/")) {
      return [
        { label: "Khách hàng", href: "/customers" },
        {
          label: customerName?.trim() || "Chi tiết khách hàng",
          href: pathname,
        },
      ]
    }

    if (pathname.startsWith("/tickets/capture")) {
      return [
        { label: "Vé máy bay", href: "/tickets/capture" },
        { label: "Nhập vé bằng AI", href: pathname },
      ]
    }

    return [{ label: "Bay Buddy", href: pathname }]
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
    <nav className="space-y-2">
      {navItems.map((item) => {
        const Icon = item.icon
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
            <span className="flex-1 text-left">{item.label}</span>
            {item.disabled ? (
              <span className="rounded-full border border-border bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#75839a]">
                Sắp có
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
  const userRole = formatRoleLabel(userQuery.data?.role ?? "STAFF")

  if (!showShell) {
    return <>{children}</>
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-80 flex-col border-r border-sidebar-border bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.98)_100%)] px-5 py-5 lg:flex">
        <div className="rounded-[24px] border border-border bg-white p-5 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-primary text-lg font-semibold text-white shadow-[var(--shadow-md)]">
              BB
            </div>
            <div>
              <p className="text-lg font-medium tracking-[-0.02em] text-foreground">
                Bay Buddy
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                Hệ điều hành nội bộ
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Điều phối khách hàng, nhập vé và theo dõi công nợ trên cùng một giao diện vận hành.
          </p>
        </div>

        <div className="mt-6 rounded-[24px] border border-border bg-sidebar p-4 shadow-[var(--shadow-sm)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Điều hướng
          </p>
          <div className="mt-4">
            <ShellNavigation
              onNavigate={() => setIsSidebarOpen(false)}
              pathname={pathname}
            />
          </div>
        </div>

        <div className="mt-auto rounded-[24px] border border-border bg-white p-4 shadow-[var(--shadow-sm)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Tài khoản
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-accent text-sm font-semibold text-primary">
              {getInitials(userName)}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{userName}</p>
              <p className="text-sm text-muted-foreground">{userRole}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-80">
        <header className="sticky top-0 z-30 border-b border-border/80 bg-white/85 backdrop-blur-xl">
          <div className="flex min-h-20 items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
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
                  <SheetHeader className="border-b border-border px-6 py-6">
                    <SheetTitle>Bay Buddy</SheetTitle>
                    <SheetDescription>
                      Điều hành khách hàng, vé máy bay và công nợ theo một luồng làm việc thống nhất.
                    </SheetDescription>
                  </SheetHeader>

                  <div className="flex-1 overflow-y-auto px-4 py-5">
                    <ShellNavigation
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
              <p className="mt-2 hidden text-sm text-muted-foreground md:block">
                Nền tảng làm việc cho vé máy bay, khách hàng và sổ công nợ.
              </p>
            </div>

            <button
              className="hidden items-center gap-3 rounded-[12px] border border-border bg-white px-3.5 py-2.5 text-sm text-muted-foreground shadow-[var(--shadow-sm)] transition-all duration-200 hover:border-primary/20 hover:text-foreground md:flex"
              type="button"
            >
              <Search className="h-4 w-4" strokeWidth={2} />
              <span>Tìm nhanh</span>
              <span className="rounded-[8px] border border-border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#75839a]">
                Cmd+K
              </span>
            </button>

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

        <main className="min-h-[calc(100vh-5rem)] px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  )
}
