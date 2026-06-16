import Link from "next/link"
import type { ComponentPropsWithoutRef, ComponentType, ReactNode, SVGProps } from "react"

import { cn } from "@/lib/utils"

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

const panelClassName =
  "overflow-hidden rounded-xl border border-border/90 bg-white shadow-[var(--shadow-sm)]"

type PanelHeaderRowProps = {
  eyebrow?: string
  title: string
  titleId?: string
  description?: string
  action?: ReactNode
}

export function Panel({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return (
    <section className={cn(panelClassName, className)} {...props}>
      {children}
    </section>
  )
}

export function TableSection({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return (
    <Panel className={className} {...props}>
      {children}
    </Panel>
  )
}

export function PanelHeaderRow({
  eyebrow,
  title,
  titleId,
  description,
  action,
}: PanelHeaderRowProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-white px-5 py-3.5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-base font-semibold text-foreground" id={titleId}>
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

export function SectionHeader({
  title,
  id,
  action,
  className,
}: {
  title: string
  id?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-between pb-3", className)}>
      <h2
        className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary"
        id={id}
      >
        {title}
      </h2>
      {action}
    </div>
  )
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  description,
  action,
  className,
}: {
  icon: IconComponent
  label: string
  value: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <Panel
      className={cn(
        "group p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[var(--shadow-md)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary text-primary transition-colors group-hover:border-primary/20 group-hover:bg-accent/60">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        {action}
      </div>
      <p className="mt-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-normal text-foreground tabular-nums">
        {value}
      </p>
      {description ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
      ) : null}
    </Panel>
  )
}

export function EmptyState({
  icon: Icon,
  message,
  action,
  className,
}: {
  icon: IconComponent
  message: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-16 text-center", className)}>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-secondary text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <p className="max-w-md text-sm leading-6 text-muted-foreground">{message}</p>
      {action}
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
        "group flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3.5 transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-accent/45 hover:shadow-[var(--shadow-sm)] active:translate-y-px",
        className,
      )}
      href={href}
      {...props}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-primary transition-colors group-hover:border-primary/20 group-hover:bg-white">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">
          {label}
        </span>
        <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
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
    <div className={cn("w-full overflow-x-auto", className)} {...props}>
      {children}
    </div>
  )
}
