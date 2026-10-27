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
  field,
  className,
  label,
  value,
  valueClassName,
}: {
  field?: string
  className?: string
  label: ReactNode
  value: ReactNode
  valueClassName?: string
}) {
  return (
    <DetailField
      field={field}
      className={className}
      label={label}
      value={value}
      valueClassName={valueClassName}
    />
  )
}

export function FinanceLineItemsTable({
  descriptionClassName,
  fieldTable,
  items,
  labels,
  showLinkedTicketId = true,
}: {
  descriptionClassName?: string
  fieldTable?: "invoice_item" | "quote_item"
  items: FinanceDocumentLineItem[]
  labels: FinanceLineItemLabels
  showLinkedTicketId?: boolean
}) {
  return (
    <TableScrollArea>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead field={fieldTable ? `${fieldTable}.description` : undefined}>{labels.description}</TableHead>
            <TableHead field={fieldTable ? `${fieldTable}.passenger_name_snapshot` : undefined}>{labels.passenger}</TableHead>
            <TableHead field={fieldTable ? `${fieldTable}.quantity` : undefined} className={styles.numberCell}>{labels.quantity}</TableHead>
            <TableHead field={fieldTable ? `${fieldTable}.unit_price_snapshot` : undefined} className={styles.numberCell}>{labels.unitPrice}</TableHead>
            <TableHead field={fieldTable ? `${fieldTable}.total` : undefined} className={styles.numberCell}>{labels.total}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell field={fieldTable ? `${fieldTable}.description` : undefined} className={cn(styles.descriptionCell, descriptionClassName)}>
                <div className={styles.descriptionStack}>
                  <p className={styles.description}>{item.description}</p>
                  {showLinkedTicketId && item.linked_ticket_id ? (
                    <p className={styles.ticketId}>
                      {item.linked_ticket_id}
                    </p>
                  ) : null}
                </div>
              </TableCell>
              <TableCell field={fieldTable ? `${fieldTable}.passenger_name_snapshot` : undefined}>{item.passenger_name_snapshot}</TableCell>
              <TableCell field={fieldTable ? `${fieldTable}.quantity` : undefined} className={styles.numberCell}>{item.quantity}</TableCell>
              <TableCell field={fieldTable ? `${fieldTable}.unit_price_snapshot` : undefined} className={styles.numberCell}>
                {formatCurrency(item.unit_price_snapshot)}
              </TableCell>
              <TableCell field={fieldTable ? `${fieldTable}.total` : undefined} className={cn(styles.numberCell, styles.totalCell)}>
                {formatCurrency(item.total)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableScrollArea>
  )
}
