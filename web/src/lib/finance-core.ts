import type { BalanceState, CustomerLedger } from "@/schemas/customer"
import type { TransactionCategory } from "@/schemas/enums"

export type FinanceLedgerEntry = {
  id: string
  entry_type: "ticket" | "payment" | "adjustment"
  created_at: Date
  content: string
  amount: number
  running_balance: number
}

export type FinanceLedgerState = {
  current_balance: number
  balance_state: BalanceState
  entries: FinanceLedgerEntry[]
}

export type OptimisticPaymentInput = {
  amount: number
  note: string
  created_at?: Date
  id?: string
}

export type InvoiceSnapshotCustomerInput = {
  id: string
  name: string
  address?: string | null
  tax_code?: string | null
}

export type InvoiceSnapshotTicketInput = {
  id: string
  pnr: string
  itinerary: string | null
  passengers: string[]
  selling_price: number
}

export type InvoiceSnapshotItem = {
  linked_ticket_id: string
  description: string
  quantity: number
  unit_price: number
  unit_price_snapshot: number
  passenger_name_snapshot: string
  total: number
}

export type InvoiceSnapshot = {
  customer_id: string
  customer_name_snapshot: string
  customer_address_snapshot: string | null
  customer_tax_code_snapshot: string | null
  items: InvoiceSnapshotItem[]
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
}

const debtIncreasingTransactionCategories = new Set<TransactionCategory>([
  "TICKET_PURCHASE",
  "ADDITIONAL_FEE",
  "REFUND",
])
const ledgerEntryOrder: Record<FinanceLedgerEntry["entry_type"], number> = {
  ticket: 0,
  payment: 1,
  adjustment: 1,
}

function normalizeMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function compareLedgerEntries(
  left: Pick<FinanceLedgerEntry, "id" | "entry_type" | "created_at">,
  right: Pick<FinanceLedgerEntry, "id" | "entry_type" | "created_at">,
): number {
  const leftTimestamp = left.created_at.getTime()
  const rightTimestamp = right.created_at.getTime()

  if (leftTimestamp !== rightTimestamp) {
    return leftTimestamp - rightTimestamp
  }

  if (left.entry_type === right.entry_type) {
    return String(left.id).localeCompare(String(right.id))
  }

  return ledgerEntryOrder[left.entry_type] - ledgerEntryOrder[right.entry_type]
}

function buildTicketDescription(ticket: InvoiceSnapshotTicketInput): string {
  const route = ticket.itinerary ? ticket.itinerary.replace(/-/g, "/") : "No route"
  return `Flight PNR: ${ticket.pnr} - ${route}`
}

function buildPassengerSnapshot(ticket: InvoiceSnapshotTicketInput): string {
  const passengerNames = ticket.passengers
    .map((passenger) => passenger.trim())
    .filter(Boolean)

  return passengerNames.join(", ") || ticket.pnr
}

export function getBalanceState(balance: number): BalanceState {
  if (balance > 0) {
    return "debt"
  }

  if (balance < 0) {
    return "credit"
  }

  return "settled"
}

export function getTransactionBalanceDelta(
  amount: number,
  category: TransactionCategory,
): number {
  return debtIncreasingTransactionCategories.has(category) ? amount : -amount
}

export function applyTransactionToBalance(
  currentBalance: number,
  amount: number,
  category: TransactionCategory,
): {
  nextBalance: number
  balanceState: BalanceState
} {
  const nextBalance = currentBalance + getTransactionBalanceDelta(amount, category)

  return {
    nextBalance,
    balanceState: getBalanceState(nextBalance),
  }
}

export function calculateServiceFee(
  netPrice: number,
  sellingPrice: number,
): number {
  return sellingPrice - netPrice
}

export function rebuildLedger<TLedger extends FinanceLedgerState>(
  ledger: TLedger,
  entries: readonly FinanceLedgerEntry[],
): TLedger {
  const nextEntries = [...entries]
    .sort(compareLedgerEntries)
    .map((entry) => ({ ...entry }))

  let runningBalance = 0
  const entriesWithBalance = nextEntries.map((entry) => {
    runningBalance += entry.amount

    return {
      ...entry,
      running_balance: runningBalance,
    }
  })

  return {
    ...ledger,
    current_balance: runningBalance,
    balance_state: getBalanceState(runningBalance),
    entries: entriesWithBalance,
  }
}

export function applyOptimisticPaymentToLedger<TLedger extends FinanceLedgerState>(
  ledger: TLedger,
  payment: OptimisticPaymentInput,
): TLedger {
  const optimisticEntry: FinanceLedgerEntry = {
    id: payment.id ?? `optimistic-${Date.now()}`,
    entry_type: "payment",
    created_at: payment.created_at ?? new Date(),
    content: payment.note,
    amount: -payment.amount,
    running_balance: 0,
  }

  return rebuildLedger(ledger, [...ledger.entries, optimisticEntry])
}

export function cloneLedgerState(ledger: CustomerLedger): CustomerLedger {
  return {
    ...ledger,
    customer: {
      ...ledger.customer,
    },
    entries: ledger.entries.map((entry) => ({
      ...entry,
      created_at: new Date(entry.created_at),
    })),
  }
}

export function calculateInvoiceTotal(
  subtotal: number,
  taxAmount: number,
  discountAmount: number,
): number {
  return normalizeMoney(Math.max(0, subtotal + taxAmount - discountAmount))
}

export function buildInvoiceSnapshot(input: {
  customer: InvoiceSnapshotCustomerInput
  tickets: readonly InvoiceSnapshotTicketInput[]
  taxAmount?: number
  discountAmount?: number
}): InvoiceSnapshot {
  const taxAmount = normalizeMoney(input.taxAmount ?? 0)
  const discountAmount = normalizeMoney(input.discountAmount ?? 0)
  const items = input.tickets.map((ticket) => {
    const unitPrice = normalizeMoney(ticket.selling_price)

    return {
      linked_ticket_id: ticket.id,
      description: buildTicketDescription(ticket),
      quantity: 1,
      unit_price: unitPrice,
      unit_price_snapshot: unitPrice,
      passenger_name_snapshot: buildPassengerSnapshot(ticket),
      total: unitPrice,
    }
  })
  const subtotal = normalizeMoney(
    items.reduce((sum, item) => sum + item.total, 0),
  )

  return {
    customer_id: input.customer.id,
    customer_name_snapshot: input.customer.name,
    customer_address_snapshot: input.customer.address ?? null,
    customer_tax_code_snapshot: input.customer.tax_code ?? null,
    items,
    subtotal,
    tax_amount: taxAmount,
    discount_amount: discountAmount,
    total_amount: calculateInvoiceTotal(subtotal, taxAmount, discountAmount),
  }
}
