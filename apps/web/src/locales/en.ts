export default {
  dashboard: {
    summary: {
      eyebrow: "Financial overview",
      title: "Revenue, profit, and receivables in one current snapshot.",
      description:
        "This view combines customer ledger balances with confirmed tickets to form the first Phase 5 finance summary slice.",
      primaryAriaLabel: "Primary financial summary metrics",
      secondaryAriaLabel: "Secondary financial summary metrics",
      unavailableTitle: "Financial overview unavailable",
      unavailableDescription:
        "We could not read customers or tickets right now. Please try again once the API is available.",
      snapshot: {
        label: "Updated at",
        sourceLabel: "Data source",
        sourceValue: "Ledger + confirmed tickets",
      },
      widgets: {
        revenue: {
          label: "Total revenue",
          detail: "confirmed tickets in the system.",
        },
        profit: {
          label: "Net profit",
          detail: "average margin.",
        },
        receivables: {
          label: "Total receivables",
          detail: "customers still owe money.",
        },
      },
      metrics: {
        customers: {
          label: "Tracked customers",
          detail: "customers currently hold credit / deposit.",
        },
        tickets: {
          label: "Recorded tickets",
          detail: "Only tickets in CONFIRMED status are counted.",
        },
        credit: {
          label: "Credit / deposit held",
          detail: "customers currently have a negative balance.",
        },
        coverage: {
          label: "Receivables to revenue",
          detail: "Shows how much revenue is still outstanding.",
        },
      },
    },
  },
  customers: {
    ledger: {
      eyebrow: "Customer ledger",
      back: "Back to customers",
      customerId: "Customer ID",
      currentBalance: "Current balance",
      amountInWords: "Amount in words",
      tableTitle: "Ledger history",
      tableDescription:
        "All tickets, payments, and debt adjustments are sorted by creation time.",
      balanceStates: {
        debt: "Outstanding debt",
        settled: "Settled",
        credit: "Credit / Deposit",
      },
      columns: {
        date: "Date",
        content: "Content",
        amount: "Change",
        balance: "Balance",
      },
      loading: "Loading customer ledger...",
      empty: "No ledger activity for this customer yet.",
      unavailableTitle: "Ledger unavailable",
      unavailableDescription:
        "We could not load this customer right now. Please try again.",
      fallbackContent: "No note provided",
      paymentDialog: {
        open: "Record payment",
        title: "Record customer payment",
        description:
          "Save a new payment transaction, optionally link it to a ticket, and update the ledger immediately.",
        submit: "Save payment",
        submitting: "Saving...",
        cancel: "Close",
        success: "Payment recorded successfully.",
        error: "Unable to record payment.",
        amountPlaceholder: "No amount entered",
        fields: {
          amount: "Amount",
          method: "Payment type",
          note: "Note",
          notePlaceholder: "Example: Customer transferred via BIDV at 09:15",
          evidence: "Receipt image",
          evidenceHint:
            "URL input is supported for now. Direct file upload can be added next.",
          evidenceEmpty: "No receipt attached yet.",
          evidenceReady: "Receipt URL added.",
          linkedTicket: "Specific reconciliation",
          linkedTicketPlaceholder: "Do not link to a specific ticket",
        },
      },
    },
  },
} as const
