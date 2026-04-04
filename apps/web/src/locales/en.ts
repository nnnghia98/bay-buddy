export default {
  customers: {
    ledger: {
      eyebrow: "Customer ledger",
      back: "Back to customers",
      customerId: "Customer ID",
      currentBalance: "Current balance",
      tableTitle: "Ledger history",
      tableDescription:
        "All tickets and payment transactions are sorted by creation time.",
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
    },
  },
} as const
