export default {
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
