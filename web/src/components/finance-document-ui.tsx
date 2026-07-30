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
import styles from "./finance-document-ui.module.css"

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
    <div className={cn(styles.summaryGrid, className)}>
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
          <TableRow>
            <TableHead>{labels.description}</TableHead>
            <TableHead>{labels.passenger}</TableHead>
            <TableHead className={styles.numberCell}>{labels.quantity}</TableHead>
            <TableHead className={styles.numberCell}>{labels.unitPrice}</TableHead>
            <TableHead className={styles.numberCell}>{labels.total}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className={cn(styles.descriptionCell, descriptionClassName)}>
                <div className={styles.descriptionStack}>
                  <p className={styles.description}>{item.description}</p>
                  {showLinkedTicketId && item.linked_ticket_id ? (
                    <p className={styles.ticketId}>
                      {item.linked_ticket_id}
                    </p>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>{item.passenger_name_snapshot}</TableCell>
              <TableCell className={styles.numberCell}>{item.quantity}</TableCell>
              <TableCell className={styles.numberCell}>
                {formatCurrency(item.unit_price_snapshot)}
              </TableCell>
              <TableCell className={cn(styles.numberCell, styles.totalCell)}>
                {formatCurrency(item.total)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableScrollArea>
  )
}
