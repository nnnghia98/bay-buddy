import type { ReactNode } from "react"

import { TableScrollArea } from "@/components/command-center"
import { DetailField } from "@/components/operations-ui"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/formatters"
import { cn } from "@/lib/utils"

export type FinanceDocumentLineItem = {
  id: string
  description: string
  linked_ticket_id?: string | null
  passenger_name_snapshot: string
  quantity: number
  total: number
  unit_price_snapshot: number
}

export type FinanceLineItemLabels = {
  description: string
  passenger: string
  quantity: string
  total: string
  unitPrice: string
}

export function DocumentSummaryGrid({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("grid gap-3 p-4 lg:grid-cols-2", className)}>
      {children}
    </div>
  )
}

export function DocumentField({
  className,
  label,
  value,
  valueClassName,
}: {
  className?: string
  label: ReactNode
  value: ReactNode
  valueClassName?: string
}) {
  return (
    <DetailField
      className={className}
      label={label}
      value={value}
      valueClassName={valueClassName}
    />
  )
}

export function FinanceLineItemsTable({
  descriptionClassName,
  items,
  labels,
  showLinkedTicketId = true,
}: {
  descriptionClassName?: string
  items: FinanceDocumentLineItem[]
  labels: FinanceLineItemLabels
  showLinkedTicketId?: boolean
}) {
  return (
    <TableScrollArea>
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/55 hover:bg-secondary/55">
            <TableHead>{labels.description}</TableHead>
            <TableHead>{labels.passenger}</TableHead>
            <TableHead className="text-right">{labels.quantity}</TableHead>
            <TableHead className="text-right">{labels.unitPrice}</TableHead>
            <TableHead className="text-right">{labels.total}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className={cn("max-w-[28rem]", descriptionClassName)}>
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{item.description}</p>
                  {showLinkedTicketId && item.linked_ticket_id ? (
                    <p className="font-mono text-xs text-muted-foreground">
                      {item.linked_ticket_id}
                    </p>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>{item.passenger_name_snapshot}</TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(item.unit_price_snapshot)}
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(item.total)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableScrollArea>
  )
}
