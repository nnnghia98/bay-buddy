import { Avatar } from "@astryxdesign/core/Avatar"
import { Banner } from "@astryxdesign/core/Banner"
import { Card } from "@astryxdesign/core/Card"
import { Center } from "@astryxdesign/core/Center"
import { Field } from "@astryxdesign/core/Field"
import { Heading } from "@astryxdesign/core/Heading"
import { HStack } from "@astryxdesign/core/HStack"
import { Icon } from "@astryxdesign/core/Icon"
import { Spinner } from "@astryxdesign/core/Spinner"
import { Text } from "@astryxdesign/core/Text"
import { VStack } from "@astryxdesign/core/VStack"
import type {
  ComponentType,
  ReactNode,
  SVGProps,
} from "react"

import { Panel } from "@/components/command-center"
import { TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import styles from "./operations-ui.module.css"

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

export const selectInputClassName = styles.selectInput

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node)
  }

  if (Array.isArray(node)) {
    return node.map(nodeText).join("")
  }

  return ""
}

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
    <Text
      className={className}
      color={muted ? "secondary" : "accent"}
      display="block"
      type="label"
    >
      {children}
    </Text>
  )
}

export function IconBadge({
  icon,
  className,
}: {
  icon: IconComponent
  className?: string
}) {
  return (
    <Center
      className={cn(styles.iconBadge, className)}
      height={36}
      width={36}
    >
      <Icon color="accent" icon={icon} size="sm" />
    </Center>
  )
}

export function FormField({
  children,
  className,
  error,
  hint,
  htmlFor,
  label,
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
  const errorMessage = nodeText(error)

  return (
    <Field
      className={className}
      description={nodeText(hint) || undefined}
      inputID={htmlFor}
      isRequired={required}
      label={nodeText(label)}
      status={
        errorMessage
          ? {
              message: errorMessage,
              type: "error",
            }
          : undefined
      }
      width="100%"
    >
      {children}
    </Field>
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
  icon,
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
      <TableCell className={cn(styles.tableStateCell, className)} colSpan={colSpan}>
        <VStack align="center" gap={2} padding={8}>
          {state === "loading" ? (
            <Spinner label={nodeText(message)} size="md" />
          ) : icon ? (
            <Icon
              color={state === "error" ? "error" : "secondary"}
              icon={icon}
              size="md"
            />
          ) : null}
          <Text
            className={state === "error" ? styles.errorText : undefined}
            color="secondary"
            display="block"
            justify="center"
            type="body"
          >
            {message}
          </Text>
        </VStack>
      </TableCell>
    </TableRow>
  )
}

export function RestrictedAccessPanel({
  description,
  icon = ShieldFallback,
  title,
}: {
  description: ReactNode
  icon?: IconComponent
  title: ReactNode
}) {
  return (
    <VStack paddingBlock={6}>
      <Panel>
        <HStack align="start" gap={4} padding={5}>
          <Icon color="warning" icon={icon} size="lg" />
          <VStack gap={1}>
            <Heading level={1}>{title}</Heading>
            <Text color="secondary" display="block" type="body">
              {description}
            </Text>
          </VStack>
        </HStack>
      </Panel>
    </VStack>
  )
}

function ShieldFallback(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        d="M12 3 5 6v5c0 4.5 2.8 8.1 7 10 4.2-1.9 7-5.5 7-10V6l-7-3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
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
    <Card className={className} padding={4} variant="muted">
      <VStack gap={2}>
        <Text
          color={labelMuted ? "secondary" : "accent"}
          display="block"
          type="label"
        >
          {label}
        </Text>
        <Text
          className={valueClassName}
          display="block"
          hasTabularNumbers
          type="body"
          weight="medium"
        >
          {value}
        </Text>
      </VStack>
    </Card>
  )
}

export function InitialsAvatar({
  className,
  value,
}: {
  className?: string
  value: string
}) {
  return (
    <Avatar
      className={className}
      name={value}
      size="md"
      tooltip={false}
    />
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
    <Banner
      className={className}
      container="card"
      status={status}
      title={children}
    />
  )
}
