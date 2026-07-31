import { Card } from "@astryxdesign/core/Card"
import { Center } from "@astryxdesign/core/Center"
import { ClickableCard } from "@astryxdesign/core/ClickableCard"
import { Heading } from "@astryxdesign/core/Heading"
import { HStack } from "@astryxdesign/core/HStack"
import { Icon } from "@astryxdesign/core/Icon"
import { LayoutHeader } from "@astryxdesign/core/Layout"
import { Text } from "@astryxdesign/core/Text"
import { Token } from "@astryxdesign/core/Token"
import { VStack } from "@astryxdesign/core/VStack"
import {
  CircleDollarSign,
  Database,
  FileSpreadsheet,
  FileText,
  FileWarning,
  Landmark,
  Plane,
  ReceiptText,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  TrendingUp,
  Users,
  UsersRound,
  WalletCards,
} from "lucide-react"
import type {
  ComponentPropsWithoutRef,
  ComponentType,
  ReactNode,
  SVGProps,
} from "react"

import { cn } from "@/lib/utils"
import styles from "./command-center.module.css"

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

const serializableIconComponents = {
  circleDollarSign: CircleDollarSign,
  database: Database,
  fileSpreadsheet: FileSpreadsheet,
  fileText: FileText,
  fileWarning: FileWarning,
  landmark: Landmark,
  plane: Plane,
  receiptText: ReceiptText,
  shieldAlert: ShieldAlert,
  shieldCheck: ShieldCheck,
  shieldOff: ShieldOff,
  trendingUp: TrendingUp,
  users: Users,
  usersRound: UsersRound,
  walletCards: WalletCards,
} satisfies Record<string, IconComponent>

type SerializableIconName = keyof typeof serializableIconComponents

function SerializableIcon({
  name,
  size,
}: {
  name: SerializableIconName
  size: "sm" | "lg"
}) {
  const IconComponent = serializableIconComponents[name]

  return (
    <IconComponent
      aria-hidden="true"
      className={size === "lg" ? styles.emptyStateIcon : styles.metricIcon}
    />
  )
}

type PanelProps = Omit<
  ComponentPropsWithoutRef<typeof Card>,
  "padding" | "variant"
>

type PanelHeaderRowProps = {
  eyebrow?: string
  title: string
  titleId?: string
  description?: string
  action?: ReactNode
}

export function Panel({ children, className, ...props }: PanelProps) {
  return (
    <Card className={className} padding={0} {...props}>
      {children}
    </Card>
  )
}

export function TableSection({ children, className, ...props }: PanelProps) {
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
    <LayoutHeader hasDivider padding={5}>
      <HStack align="start" gap={4} justify="between" wrap="wrap">
        <VStack gap={1}>
          {eyebrow ? (
            <Text color="accent" display="block" type="label">
              {eyebrow}
            </Text>
          ) : null}
          <Heading id={titleId} level={2}>
            {title}
          </Heading>
          {description ? (
            <Text
              color="secondary"
              display="block"
              maxLines={3}
              type="supporting"
            >
              {description}
            </Text>
          ) : null}
        </VStack>
        {action}
      </HStack>
    </LayoutHeader>
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
    <HStack
      align="center"
      className={className}
      gap={3}
      justify="between"
      paddingBlock={3}
    >
      <Heading color="accent" id={id} level={3}>
        {title}
      </Heading>
      {action}
    </HStack>
  )
}

export function MetricCard({
  icon,
  iconName,
  label,
  value,
  description,
  action,
  className,
}: {
  icon?: IconComponent
  iconName?: SerializableIconName
  label: string
  value: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <Card className={className} padding={5}>
      <VStack gap={3}>
        <HStack align="start" justify="between">
          <Center height={32} width={32}>
            {iconName ? (
              <SerializableIcon name={iconName} size="sm" />
            ) : icon ? (
              <Icon color="accent" icon={icon} size="sm" />
            ) : null}
          </Center>
          {action}
        </HStack>
        <Text color="accent" display="block" type="label">
          {label}
        </Text>
        <Text
          display="block"
          hasTabularNumbers
          type="large"
          weight="semibold"
        >
          {value}
        </Text>
        {description ? (
          <Text color="secondary" display="block" type="supporting">
            {description}
          </Text>
        ) : null}
      </VStack>
    </Card>
  )
}

export function EmptyState({
  icon,
  iconName,
  message,
  action,
  className,
}: {
  icon?: IconComponent
  iconName?: SerializableIconName
  message: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <VStack
      align="center"
      className={className}
      gap={3}
      padding={8}
      role="status"
    >
      {iconName ? (
        <SerializableIcon name={iconName} size="lg" />
      ) : icon ? (
        <Icon color="secondary" icon={icon} size="lg" />
      ) : null}
      <Text color="secondary" display="block" justify="center" type="body">
        {message}
      </Text>
      {action}
    </VStack>
  )
}

export function StatusChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode
  tone?: "neutral" | "info" | "warning" | "success" | "danger"
}) {
  const label =
    typeof children === "string" || typeof children === "number"
      ? String(children)
      : ""

  return (
    <Token
      color={
        tone === "info"
          ? "blue"
          : tone === "warning"
            ? "orange"
            : tone === "success"
              ? "green"
              : tone === "danger"
                ? "red"
                : "gray"
      }
      label={label}
      size="sm"
    />
  )
}

export function CommandActionLink({
  href,
  icon,
  label,
  description,
  className,
}: {
  href: string
  icon: IconComponent
  label: string
  description: string
  className?: string
}) {
  return (
    <ClickableCard
      className={className}
      elevation="low"
      href={href}
      label={label}
      padding={4}
    >
      <HStack align="center" gap={3}>
        <Icon color="accent" icon={icon} size="sm" />
        <VStack gap={0.5}>
          <Text display="block" type="label">
            {label}
          </Text>
          <Text color="secondary" display="block" type="supporting">
            {description}
          </Text>
        </VStack>
      </HStack>
    </ClickableCard>
  )
}

export function TableScrollArea({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn(styles.tableScroll, className)} {...props}>
      {children}
    </div>
  )
}
