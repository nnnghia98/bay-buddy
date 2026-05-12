export default {
  login: {
    title: "Sign in",
    subtitle: "Please sign in to continue.",
    usernameLabel: "Username",
    usernamePlaceholder: "Username",
    passwordLabel: "Password",
    submit: "Sign in",
    submitting: "Signing in...",
    successToast: "Signed in successfully.",
  },
  appShell: {
    home: "Home",
  },
  settings: {
    eyebrow: "System settings",
    restricted: {
      title: "You do not have permission to manage staff accounts.",
      description: "This page is reserved for administrators managing internal accounts.",
      contact:
        "Contact an administrator if you need access changes or account status updates.",
    },
    guidance: {
      title: "Operating guidance",
      description: "Manage internal accounts in a way that stays safe, role-aware, and auditable.",
      access:
        "Only administrators can create accounts, change roles, or deactivate staff access.",
      status:
        "Deactivation only changes the `is_active` status so login history and role assignments stay intact. No records are permanently deleted.",
    },
    users: {
      eyebrow: "Account management",
      title: "Add, edit, and pause internal accounts from one compact work surface.",
      description:
        "All internal staff account controls live here so access changes stay explicit and easy to audit.",
      createAction: "Add account",
      editAction: "Edit",
      deactivateAction: "Deactivate",
      reactivateAction: "Reactivate",
      toggleSubmitting: "Updating...",
      currentSession: "Current session",
      currentUserChip: "You",
      empty: "No internal accounts are available yet.",
      metrics: {
        total: "Total accounts",
        active: "Active",
        inactive: "Inactive",
      },
      columns: {
        username: "Username",
        role: "Role",
        status: "Status",
        actions: "Actions",
      },
      roles: {
        ADMIN: "Administrator",
        STAFF: "Staff",
      },
      statuses: {
        active: "Active",
        inactive: "Inactive",
      },
      fields: {
        username: "Username",
        usernamePlaceholder: "e.g. admin.finance",
        password: "Password",
        passwordPlaceholder: "Enter a password",
        passwordHint: "Leave blank if you do not want to change the current password.",
        role: "Role",
        status: "Account status",
      },
      dialogs: {
        cancel: "Close",
        create: {
          title: "Add internal account",
          description: "Create a new account quickly and assign the right access level.",
          submit: "Create account",
          submitting: "Creating...",
        },
        edit: {
          title: "Update account",
          description: "Adjust the username, role, password, or active status.",
          submit: "Save changes",
          submitting: "Saving...",
        },
      },
      actions: {
        invalidInput: "Please review the account details.",
        missingAuth: "Your session has expired. Please sign in again.",
        createSuccess: "Account created successfully.",
        updateSuccess: "Account updated successfully.",
        toggleSuccess: "Account status updated.",
        failure: "Unable to update the account right now.",
      },
      validation: {
        usernameMin: "Username must be at least 3 characters.",
        usernameMax: "Username must be at most 50 characters.",
        passwordRequired: "Please enter a password.",
        roleRequired: "Please choose a role.",
        userIdInvalid: "User id is invalid.",
        statusRequired: "Please choose an account status.",
      },
    },
  },
  dashboard: {
    summary: {
      eyebrow: "Financial overview",
      title: "Revenue, profit, and receivables in one current snapshot.",
      description:
        "This view combines customer ledger balances with confirmed tickets to form the first Phase 5 finance summary slice.",
      primaryAriaLabel: "Primary financial summary metrics",
      secondaryAriaLabel: "Secondary financial summary metrics",
      analyticsAriaLabel: "Revenue chart and top debtors",
      unavailableTitle: "Financial overview unavailable",
      unavailableDescription:
        "We could not read customers or tickets right now. Please try again once the API is available.",
      snapshot: {
        label: "Updated at",
        sourceLabel: "Data source",
        sourceValue: "Ledger + confirmed tickets",
      },
      commandCenter: {
        title: "Today command center",
        description:
          "Track receivables, tickets, payments, and the next work that needs attention.",
        needsAction: {
          eyebrow: "Needs action",
          title: "Work queues",
          description:
            "Work groups that directly affect debt tracking and operations.",
        },
        queues: {
          receivables: {
            label: "Customers with debt",
            description: "Prioritize payment follow-up or reconciliation.",
          },
          heldCredit: {
            label: "Credit / deposit held",
            description: "Track negative balances to hold or refund.",
          },
          draftTickets: {
            label: "Draft tickets",
            description: "Confirm tickets to create debt entries.",
          },
        },
        queueAmounts: {
          receivables: "Outstanding balance",
          heldCredit: "Held amount",
          draftTickets: "Draft ticket value",
        },
        shortcuts: {
          eyebrow: "Quick actions",
          title: "Open workflow",
          customers: {
            label: "Open customers",
            description: "Find a customer and inspect their ledger.",
          },
          tickets: {
            label: "Capture ticket",
            description: "Upload a document and parse it with AI.",
          },
          invoices: {
            label: "Invoices",
            description: "Review financial documents by customer.",
          },
        },
        recent: {
          eyebrow: "Latest",
          title: "Recent activity",
          description: "The newest tickets and ledger transactions.",
          columns: {
            activity: "Activity",
            amount: "Amount",
            time: "Time",
          },
          empty: "No recent activity yet.",
          types: {
            ticket: "Ticket",
            payment: "Payment",
            adjustment: "Adjustment",
            refund: "Refund",
          },
          fallbacks: {
            ticketPurchase: "Recorded ticket",
            payment: "Payment",
            discount: "Discount",
            additionalFee: "Additional fee",
            refund: "Refund",
          },
        },
      },
      widgets: {
        revenue: {
          label: "Total revenue",
          detail: "confirmed tickets in the system.",
          show: "Show revenue",
          hide: "Hide revenue",
          cutoffLabel: "Revenue from date",
          applyCutoff: "Apply cutoff",
          cutoffHint: "Revenue includes records from the selected cutoff date to now.",
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
      analytics: {
        revenueTrend: {
          eyebrow: "Revenue Trend",
          title: "Revenue growth over the last 30 days",
          description:
            "Grouped by ledger transaction date so the recent sales pace is visible at a glance.",
          totalLabel: "30-day revenue",
          growthLabel: "Displayed cumulative",
          tooltip: {
            daily: "Daily revenue",
            cumulative: "Cumulative revenue",
            dateLabel: "Date",
          },
        },
        topDebtors: {
          eyebrow: "Who Owes Me",
          title: "Top customers with outstanding debt",
          description:
            "The 5 highest receivable balances based on total debit minus total credit.",
          columns: {
            customer: "Customer",
            balance: "Balance",
          },
          status: {
            high: "High debt",
            medium: "Medium debt",
          },
          balanceLabel: "Outstanding",
          empty: "No customers currently have outstanding receivables.",
        },
      },
    },
  },
  customers: {
    directory: {
      eyebrow: "Customer directory",
      title: "Track customers and ledgers from one compact work surface.",
      description:
        "Search by name or phone number, review the current debt state, and open each detailed ledger directly.",
      searchPlaceholder: "Search by name or phone number",
      metrics: {
        totalCustomers: "Total customers",
      },
      columns: {
        phone: "Phone number",
        actions: "Actions",
      },
      loading: "Loading customers...",
      error: "Unable to load customers right now.",
      empty: "No matching customers found.",
    },
    ledger: {
      eyebrow: "Customer ledger",
      back: "Back to customers",
      customerId: "Customer ID",
      currentBalance: "Current balance",
      entryCount: "Entry count",
      amountInWords: "Amount in words",
      tableTitle: "Ledger history",
      tableDescription:
        "All tickets, payments, and debt adjustments are sorted by creation time.",
      balanceStates: {
        debt: "Outstanding debt",
        settled: "Settled",
        credit: "Credit / Deposit",
      },
      entryTypes: {
        ticket: "Ticket",
        payment: "Payment",
        adjustment: "Adjustment",
      },
      columns: {
        date: "Date",
        type: "Type",
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
        validation: {
          customerIdInvalid: "Customer id is invalid.",
          amountPositive: "Amount must be greater than 0.",
          methodRequired: "Please choose a payment type.",
          noteRequired: "Please enter a note.",
          noteMax: "Note must not exceed 2000 characters.",
          evidenceUrlInvalid: "Receipt image must be a valid URL.",
          evidenceUrlMax: "Receipt image must not exceed 2048 characters.",
          linkedTicketInvalid: "Linked ticket is invalid.",
        },
        fields: {
          amount: "Amount",
          amountInputPlaceholder: "1,000,000",
          method: "Payment type",
          methodOptions: {
            bankTransfer: "Bank transfer",
            cash: "Cash",
          },
          note: "Note",
          notePlaceholder: "Example: Customer transferred via BIDV at 09:15",
          evidence: "Receipt image",
          evidencePlaceholder: "https://...",
          evidenceHint:
            "URL input is supported for now. Direct file upload can be added next.",
          evidenceEmpty: "No receipt attached yet.",
          evidenceReady: "Receipt URL added.",
          linkedTicket: "Specific reconciliation",
          linkedTicketPlaceholder: "Do not link to a specific ticket",
        },
      },
      invoices: {
        title: "Customer invoices",
        description:
          "Open this customer's scoped invoice list to review detail pages or public print views.",
        open: "View invoices",
      },
    },
    actions: {
      recordPayment: {
        invalidInput: "Please review the payment details.",
        missingAuth: "Your session has expired. Please sign in again.",
        failure: "Unable to record payment right now.",
        success: "Payment recorded successfully.",
      },
    },
    management: {
      createAction: "Add customer",
      editAction: "Edit customer",
      deleteAction: "Delete",
      archiveAction: "Archive",
      reactivateAction: "Reactivate",
      toggleSubmitting: "Updating...",
      types: {
        INDIVIDUAL: "Individual",
        BUSINESS: "Business",
      },
      statuses: {
        active: "Active",
        archived: "Archived",
      },
      fields: {
        name: "Customer name",
        namePlaceholder: "For example: Bay Buddy Company",
        type: "Customer type",
        status: "Customer status",
        phone: "Phone number",
        phonePlaceholder: "0909...",
        email: "Email",
        emailPlaceholder: "contact@example.com",
        address: "Address",
        addressPlaceholder: "1 Nguyen Hue, District 1",
        taxCode: "Tax code",
        taxCodePlaceholder: "0312345678",
      },
      dialogs: {
        cancel: "Close",
        create: {
          title: "Create customer",
          description: "Add a new customer directly from the current customer directory.",
          submit: "Create customer",
        },
        delete: {
          confirm: "Are you sure you want to delete this customer?",
        },
        edit: {
          title: "Update customer",
          description:
            "Adjust contact information and archive status without changing the ledger history.",
          submit: "Save changes",
          submitting: "Saving...",
        },
      },
      actions: {
        invalidInput: "Please review the customer details.",
        missingAuth: "Your session has expired. Please sign in again.",
        createSuccess: "Customer created successfully.",
        updateSuccess: "Customer updated successfully.",
        toggleSuccess: "Customer status updated.",
        deleteSuccess: "Customer deleted successfully.",
        failure: "Unable to update the customer right now.",
      },
      validation: {
        customerIdInvalid: "Customer id is invalid.",
        nameRequired: "Please enter the customer name.",
        nameMax: "Customer name must be at most 255 characters.",
        emailInvalid: "Customer email is invalid.",
        emailMax: "Email must be at most 255 characters.",
        phoneMax: "Phone number must be at most 30 characters.",
        addressMax: "Address must be at most 500 characters.",
        taxCodeMax: "Tax code must be at most 100 characters.",
        typeRequired: "Please choose a customer type.",
        statusRequired: "Please choose a customer status.",
      },
    },
  },
  financeDocuments: {
    common: {
      invoice: "Invoice",
      quote: "Quote",
      status: "Status",
      customer: "Customer",
      address: "Address",
      taxCode: "Tax code",
      createdAt: "Created at",
      issuedAt: "Issued at",
      validUntil: "Valid until",
      note: "Note",
      noNote: "No note",
      notUpdated: "Not updated",
      amountInWords: "Amount in words",
      total: "Total",
      taxAmount: "Tax",
      discountAmount: "Discount",
      print: "Print",
      viewDetail: "View detail",
      openPrint: "Open print view",
      backToInvoices: "Back to invoices",
      backToCustomer: "Back to customer ledger",
      snapshotNotice:
        "This view renders stored invoice/quote snapshots, not current customer or ticket records.",
      columns: {
        description: "Description",
        passenger: "Passenger",
        quantity: "Qty",
        unitPrice: "Unit price",
        total: "Line total",
      },
    },
    statuses: {
      invoice: {
        DRAFT: "Draft",
        ISSUED: "Issued",
        PAID: "Paid",
        CANCELLED: "Cancelled",
      },
      quote: {
        DRAFT: "Draft",
        ACCEPTED: "Accepted",
        EXPIRED: "Expired",
        CANCELLED: "Cancelled",
      },
    },
    invoices: {
      list: {
        eyebrow: "Customer invoices",
        title: "Invoice lists are scoped to a customer.",
        description:
          "Open a customer ledger to review created invoices, statuses, and public print views.",
        emptyScopeTitle: "Choose a customer to view invoices",
        emptyScopeDescription:
          "Invoice lists are currently customer-scoped. Open a customer ledger first, then choose invoices.",
        emptyList: "This customer has no invoices yet.",
      },
      detail: {
        eyebrow: "Invoice detail",
        titlePrefix: "Invoice",
        publicLink: "Open public print view",
        lineItemsTitle: "Invoice lines",
      },
      public: {
        eyebrow: "Invoice print view",
        title: "Payment invoice",
        contact: "Support information",
        lineItemsTitle: "Service details",
      },
    },
    quotes: {
      detail: {
        eyebrow: "Quote detail",
        titlePrefix: "Quote",
        lineItemsTitle: "Quote lines",
        informationalNotice:
          "Quotes are informational and do not affect the customer ledger until converted to an invoice.",
        convert: "Convert to invoice",
        converting: "Converting...",
        convertUnavailable:
          "This quote is no longer a draft, so it cannot be converted from this screen.",
        convertedTitle: "Invoice created",
        convertedDescription: "The quote was converted to a draft invoice.",
        openInvoice: "Open invoice",
      },
    },
    actions: {
      quoteConvert: {
        missingQuote: "Quote id is missing.",
        missingAuth: "Your session has expired. Please sign in again.",
        permission: "You do not have permission to convert this quote.",
        failure: "Unable to convert this quote right now.",
        success: "Quote converted to invoice.",
      },
    },
  },
} as const
