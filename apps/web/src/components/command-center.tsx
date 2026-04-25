import Link from "next/link"
import type { ComponentPropsWithoutRef, ComponentType, ReactNode, SVGProps } from "react"

import {
  getTableSectionClassName,
} from "@/lib/authenticated-layout"
import { cn } from "@/lib/utils"

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

type CommandPanelHeaderProps = {
  eyebrow?: string
  title: string
  titleId?: string
  description?: string
  action?: ReactNode
}

export function CommandPanel({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return (
    <TableSection className={cn("bg-card", className)} {...props}>
      {children}
    </TableSection>
  )
}

export function TableSection({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return (
    <section className={cn(getTableSectionClassName(), "bg-white", className)} {...props}>
      {children}
    </section>
  )
}

export function CommandPanelHeader({
  eyebrow,
  title,
  titleId,
  description,
  action,
}: CommandPanelHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-secondary/45 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-base font-medium tracking-[-0.02em] text-foreground" id={titleId}>
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function StatusChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode
  tone?: "neutral" | "info" | "warning" | "success" | "danger"
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        tone === "neutral" &&
          "border-border bg-secondary text-muted-foreground",
        tone === "info" && "border-blue-200 bg-blue-50 text-blue-700",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-800",
        tone === "success" &&
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        tone === "danger" && "border-rose-200 bg-rose-50 text-rose-700",
      )}
    >
      {children}
    </span>
  )
}

export function CommandActionLink({
  href,
  icon: Icon,
  label,
  description,
  className,
  ...props
}: Omit<ComponentPropsWithoutRef<typeof Link>, "children"> & {
  icon: IconComponent
  label: string
  description: string
}) {
  return (
    <Link
      className={cn(
        "group flex items-start gap-3 rounded-lg border border-border bg-white px-4 py-3 transition-colors duration-200 hover:border-primary/30 hover:bg-accent/45",
        className,
      )}
      href={href}
      {...props}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-primary transition-colors duration-200 group-hover:border-primary/25 group-hover:bg-white">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">
          {label}
        </span>
        <span className="mt-1 block text-sm leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
    </Link>
  )
}

export function TableScrollArea({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("overflow-x-auto", className)} {...props}>
      {children}
    </div>
  )
}
