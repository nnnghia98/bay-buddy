"use client"

import * as React from "react"
import { AppShell as AstryxAppShell, useAppShellMobile } from "@astryxdesign/core/AppShell"
import { Avatar } from "@astryxdesign/core/Avatar"
import { BreadcrumbItem, Breadcrumbs } from "@astryxdesign/core/Breadcrumbs"
import {
  DropdownMenu,
  DropdownMenuItem,
} from "@astryxdesign/core/DropdownMenu"
import { HStack } from "@astryxdesign/core/HStack"
import { Layout, LayoutContent } from "@astryxdesign/core/Layout"
import { MobileNav, MobileNavToggle } from "@astryxdesign/core/MobileNav"
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav"
import { Skeleton } from "@astryxdesign/core/Skeleton"
import { TopNav } from "@astryxdesign/core/TopNav"
import { VStack } from "@astryxdesign/core/VStack"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Activity,
  ChartColumn,
  CircleDollarSign,
  Database,
  FileSpreadsheet,
  LogOut,
  Settings,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { apiFetchData } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { LOGIN_PATH, SESSION_EXPIRED_LOGIN_PATH } from "@/lib/auth-token"
import {
  isUnauthorizedSessionError,
  shouldRenderAuthenticatedShell,
} from "@/lib/auth-session"
import { ThemeModeRadioGroup } from "@/components/theme-mode-menu"
import { useI18n } from "@/locales/client"

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
  | "workbookEditor"

type NavItem = {
  labelKey: NavLabelKey
  href: string
  icon: LucideIcon
  adminOnly?: boolean
  disabled?: boolean
}

const navItems: NavItem[] = [
  { labelKey: "manualDebts", href: "/debts/input", icon: CircleDollarSign },
  { labelKey: "reports", href: "/report", icon: ChartColumn },
  { labelKey: "workbookEditor", href: "/workbook-editor-v2", icon: FileSpreadsheet },
  { labelKey: "tickets", href: "/tickets/input", icon: Ticket },
  { labelKey: "activities", href: "/activities", icon: Activity },
  { labelKey: "customers", href: "/customers", icon: Users },
  { labelKey: "settings", href: "/settings", icon: Settings },
  { labelKey: "dataCenter", href: "/data_center", icon: Database, adminOnly: true },
]

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
    workbookEditor: string
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

    if (pathname.startsWith("/workbook-editor-v2")) {
      return [{ label: labels.workbookEditor, href: pathname }]
    }

    return [{ label: labels.fallback, href: pathname }]
  }, [customerName, homeLabel, labels, pathname])
}

function isNavigationItemActive(pathname: string, item: NavItem): boolean {
  if (item.disabled) {
    return false
  }

  if (pathname === item.href) {
    return true
  }

  if (item.href === "/tickets/input") {
    return pathname.startsWith("/tickets/")
  }

  if (item.href === "/debts/input") {
    return pathname.startsWith("/debts/")
  }

  return pathname.startsWith(item.href)
}

function BrandHeading() {
  const t = useI18n()

  return (
    <SideNavHeading
      as={Link}
      heading="Bay Buddy"
      headingHref="/"
      icon={
        <Image
          alt=""
          aria-hidden="true"
          height={26}
          priority
          src="/branding/logo-bay-buddy-v1-crop.png"
          width={32}
        />
      }
      subheading={t("appShell.productDescription")}
    />
  )
}

function ShellNavigation({
  currentUserRole,
  onNavigate,
  pathname,
}: {
  currentUserRole?: string
  onNavigate?: () => void
  pathname: string
}) {
  const t = useI18n()

  return (
    <SideNavSection
      isHeaderHidden
      title={t("appShell.navigationSection")}
    >
      {navItems.map((item) => {
        if (item.adminOnly && currentUserRole !== "ADMIN") {
          return null
        }

        const Icon = item.icon
        const label = t(`appShell.nav.${item.labelKey}`)

        return (
          <SideNavItem
            as={Link}
            href={item.href}
            icon={<Icon aria-hidden="true" size={18} strokeWidth={2} />}
            isDisabled={item.disabled}
            isSelected={isNavigationItemActive(pathname, item)}
            key={item.href}
            label={label}
            onClick={onNavigate}
          />
        )
      })}
    </SideNavSection>
  )
}

function MobileShellNavigation({
  currentUserRole,
  pathname,
}: {
  currentUserRole?: string
  pathname: string
}) {
  const { closeMobileNav } = useAppShellMobile()

  return (
    <ShellNavigation
      currentUserRole={currentUserRole}
      onNavigate={closeMobileNav}
      pathname={pathname}
    />
  )
}

function LoadingShell({
  homeLabel,
  loadingLabel,
}: {
  homeLabel: string
  loadingLabel: string
}) {
  const t = useI18n()

  return (
    <AstryxAppShell
      contentPadding={0}
      height="fill"
      sideNav={
        <SideNav header={<BrandHeading />}>
          <VStack gap={3} padding={4}>
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton height={32} index={index} key={index} radius={2} />
            ))}
          </VStack>
        </SideNav>
      }
      topNav={
        <TopNav
          label={t("appShell.topNavigationAria")}
          startContent={
            <Breadcrumbs label={t("appShell.breadcrumbAria")}>
              <BreadcrumbItem isCurrent>{homeLabel}</BreadcrumbItem>
            </Breadcrumbs>
          }
          endContent={<Skeleton height={36} radius="rounded" width={112} />}
        />
      }
      variant="section"
    >
      <Layout
        content={
          <LayoutContent isScrollable={false} padding={6}>
            <VStack
              align="center"
              aria-busy="true"
              aria-label={loadingLabel}
              gap={4}
              minHeight="50dvh"
              role="status"
              justify="center"
            >
              <Skeleton height={20} width={220} />
              <Skeleton height={12} width={320} />
            </VStack>
          </LayoutContent>
        }
        contentWidth={1600}
        height="auto"
      />
    </AstryxAppShell>
  )
}

export function AppShell({ children }: AppShellProps) {
  const t = useI18n()
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { token, isReady, logout } = useAuth()

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
        workbookEditor: t("appShell.breadcrumbs.workbookEditor"),
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

  if (!showShell) {
    return <>{children}</>
  }

  if (!isReady) {
    return (
      <LoadingShell
        homeLabel={t("appShell.home")}
        loadingLabel={t("appShell.loading")}
      />
    )
  }

  if (!shouldRenderShell) {
    return null
  }

  const userName = userQuery.data?.username ?? t("appShell.userFallback")
  const userRole =
    userQuery.data?.role === "ADMIN"
      ? t("appShell.roles.admin")
      : t("appShell.roles.staff")

  const signOut = () => {
    logout()
    queryClient.clear()
    router.replace(LOGIN_PATH)
  }

  return (
    <AstryxAppShell
      contentPadding={0}
      height="auto"
      mobileNav={
        <MobileNav
          header="Bay Buddy"
          label={t("appShell.navigationAria")}
          side="start"
        >
          <MobileShellNavigation
            currentUserRole={userQuery.data?.role}
            pathname={pathname}
          />
        </MobileNav>
      }
      sideNav={
        <SideNav
          collapsible={{
            buttonLabel: t("appShell.collapseNavigation"),
            defaultIsCollapsed: false,
          }}
          header={<BrandHeading />}
        >
          <ShellNavigation
            currentUserRole={userQuery.data?.role}
            pathname={pathname}
          />
        </SideNav>
      }
      topNav={
        <TopNav
          label={t("appShell.topNavigationAria")}
          startContent={
            <HStack align="center" gap={2}>
              <MobileNavToggle label={t("appShell.mobileMenuAria")} />
              <Breadcrumbs label={t("appShell.breadcrumbAria")} variant="supporting">
                {breadcrumbs.map((crumb, index) => (
                  <BreadcrumbItem
                    as={Link}
                    href={
                      index === breadcrumbs.length - 1
                        ? undefined
                        : crumb.href
                    }
                    isCurrent={index === breadcrumbs.length - 1}
                    key={`${crumb.href}-${crumb.label}`}
                  >
                    {crumb.label}
                  </BreadcrumbItem>
                ))}
              </Breadcrumbs>
            </HStack>
          }
          endContent={
            <DropdownMenu
              button={{
                icon: <Avatar name={userName} size="md" tooltip={false} />,
                label: `${userName} · ${userRole}`,
                variant: "ghost",
              }}
              hasChevron
              menuWidth={260}
              placement="below"
            >
              <ThemeModeRadioGroup />
              <DropdownMenuItem
                icon={
                  <LogOut
                    aria-hidden="true"
                    size={16}
                    strokeWidth={2}
                  />
                }
                label={t("appShell.signOut")}
                onClick={signOut}
              />
            </DropdownMenu>
          }
        />
      }
      variant="section"
    >
      <Layout
        content={
          <LayoutContent isScrollable={false} padding={6}>
            {children}
          </LayoutContent>
        }
        contentWidth={1600}
        height="auto"
      />
    </AstryxAppShell>
  )
}
