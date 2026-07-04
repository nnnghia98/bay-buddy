import type { ComponentType, ReactNode, SVGProps } from "react"
import { Loader2, ShieldOff } from "lucide-react"

import { Panel } from "@/components/command-center"
import { Label } from "@/components/ui/label"
import { TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

export const selectInputClassName =
  "flex h-11 w-full rounded-md border border-input bg-white px-3.5 py-2 text-sm text-foreground shadow-[var(--shadow-sm)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:border-primary"

export function EyebrowLabel({
  children,
  className,
  muted = false,
}: {
  children: ReactNode
  className?: string
  muted?: boolean
}) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.16em]",
        muted ? "text-muted-foreground" : "text-primary",
        className,
      )}
    >
      {children}
    </p>
  )
}

export function IconBadge({
  icon: Icon,
  className,
}: {
  icon: IconComponent
  className?: string
}) {
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-primary",
        className,
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
  )
}

export function FormField({
  children,
  className,
  error,
  hint,
  htmlFor,
  label,
  labelClassName,
  required = false,
}: {
  children: ReactNode
  className?: string
  error?: ReactNode
  hint?: ReactNode
  htmlFor: string
  label: ReactNode
  labelClassName?: string
  required?: boolean
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label
        className={cn(
          "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
          labelClassName,
        )}
        htmlFor={htmlFor}
      >
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p className="text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function SelectField({
  children,
  className,
  error,
  hint,
  htmlFor,
  label,
  labelClassName,
  required = false,
}: {
  children: ReactNode
  className?: string
  error?: ReactNode
  hint?: ReactNode
  htmlFor: string
  label: ReactNode
  labelClassName?: string
  required?: boolean
}) {
  return (
    <FormField
      className={className}
      error={error}
      hint={hint}
      htmlFor={htmlFor}
      label={label}
      labelClassName={labelClassName}
      required={required}
    >
      {children}
    </FormField>
  )
}

export function TableStateRow({
  className,
  colSpan,
  icon: Icon,
  message,
  state = "empty",
}: {
  className?: string
  colSpan: number
  icon?: IconComponent
  message: ReactNode
  state?: "loading" | "empty" | "error"
}) {
  return (
    <TableRow>
      <TableCell
        className={cn(
          "py-16 text-center text-sm",
          state === "error" ? "text-red-600" : "text-muted-foreground",
          className,
        )}
        colSpan={colSpan}
      >
        <div className="flex flex-col items-center gap-2">
          {state === "loading" ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : Icon ? (
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
          ) : null}
          <span>{message}</span>
        </div>
      </TableCell>
    </TableRow>
  )
}

export function RestrictedAccessPanel({
  description,
  icon: Icon = ShieldOff,
  title,
}: {
  description: ReactNode
  icon?: IconComponent
  title: ReactNode
}) {
  return (
    <div className="pb-12 text-foreground">
      <Panel>
        <div className="flex items-start gap-4 px-5 py-8">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-800">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">{title}</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </Panel>
    </div>
  )
}

export function DetailField({
  className,
  label,
  labelMuted = false,
  value,
  valueClassName,
}: {
  className?: string
  label: ReactNode
  labelMuted?: boolean
  value: ReactNode
  valueClassName?: string
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-secondary/35 p-4", className)}>
      <EyebrowLabel muted={labelMuted}>{label}</EyebrowLabel>
      <div className={cn("mt-2 text-sm font-medium leading-6 text-foreground", valueClassName)}>
        {value}
      </div>
    </div>
  )
}

export function InitialsAvatar({
  className,
  value,
}: {
  className?: string
  value: string
}) {
  const initials = value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")

  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-xs font-semibold text-primary",
        className,
      )}
    >
      {initials}
    </div>
  )
}

export function InlineFeedback({
  children,
  className,
  status,
}: {
  children: ReactNode
  className?: string
  status: "success" | "error" | "info" | "warning"
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        status === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        status === "error" && "border-red-200 bg-red-50 text-red-700",
        status === "info" && "border-blue-200 bg-blue-50 text-blue-700",
        status === "warning" && "border-amber-200 bg-amber-50 text-amber-800",
        className,
      )}
      role={status === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  )
}
