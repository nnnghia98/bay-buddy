# Bay Buddy - Business Logic & Requirements

This document defines the core business rules, financial logic, and operational workflows for the Bay Buddy system. All AI Agents and developers must adhere to these rules when implementing features.

## 0. Language Policy (Mandatory)

System communication: English | Target Market: Vietnam | UI Labels: Vietnamese-first.

- **System communication**: English (all assistant responses, developer documentation, and code comments).
- **Target market**: Vietnam (implement business logic according to Vietnamese market practices and applicable Vietnamese legal/compliance requirements).
- **UI labels**: Vietnamese-first (default locale is Vietnamese; English is secondary for developer convenience).
- **Engineering identifiers**: English variable names and schema fields (e.g., `is_invoice_issued`) while UI values and labels remain Vietnamese (e.g., "Đã xuất hóa đơn").
- **Semantic integrity**: Preserve Vietnamese domain terms with accounting/legal precision:
  - **Công nợ**: Accounts Receivable (debt-first customer ledger).
  - **Nghị định 123 (Decree 123/2020/ND-CP)**: E-invoice formatting and compliance requirements.
  - **Số tiền bằng chữ**: Convert invoice totals into Vietnamese words.
  - **Báo có / Báo nợ**: Correct bank statement terminology for incoming/outgoing transaction records.

## 1. Ticket Lifecycle

Each ticket parsed into the system follows a specific lifecycle. Status changes affect how financial data is calculated.

| Status        | Description                                               | Financial Impact                                   |
| :------------ | :-------------------------------------------------------- | :------------------------------------------------- |
| **DRAFT**     | Newly parsed from AI, awaiting human review.              | No impact on Customer Balance.                     |
| **CONFIRMED** | Verified by user and saved to the database.               | Increases Customer Debt (Balance).                 |
| **VOID**      | Cancelled shortly after booking (usually same day).       | Reverses the debt completely.                      |
| **REFUNDED**  | Ticket returned after a period for a partial/full refund. | Requires a 'Credit' transaction to adjust balance. |

### Ticket Identity & Route Data

- `pnr` (Mã chỗ) may be null when the booking reference is unavailable. When present, it may repeat across multiple passengers in the same booking group and must not be treated as a globally unique ticket identity.
- Every ticket should store the airline `ticket_number` when available.
- `ticket_number` is not a unique business key. Multiple rows may share the same number for return-trip scenarios or different legs.
- `flight_date` is the scheduled flight datetime. It can be in the past and must not be blocked by the app base date time.
- Ticket `created_at` / `updated_at` are audit timestamps for when Bay Buddy recorded or changed the ticket.
- App base date-time filtering applies to ticket `updated_at`, not to `flight_date`; on untouched records, `updated_at` is the original creation timestamp.
- The ticket debt workbench defaults to `created_at` descending so an edit does not move the active row. It keeps `updated_at` separate for active-window filtering and audit context.
- Logs, histories, recent activity lists, and audit-style views must show `created_at` / `updated_at`; `flight_date` belongs only in flight-detail context.
- Route data should be captured explicitly with:
  - `departure_place`
  - `arrival_place`
  - `departure_code`
  - `arrival_code`
- `itinerary` should remain available for display and compatibility, but new writes must treat `departure_code` + `arrival_code` as the structured source for route display.
- Do not overload city/place fields with airport-specific detail. If airport-level detail is needed later, add dedicated airport fields.

## 2. Pricing Architecture

The system distinguishes between what the airline charges and what the customer pays.

- **Net Price**: The actual cost from the airline/supplier (VNA, Vietjet, etc.).
- **EV Price**: Host price passed down from the EV upstream agency.
- **AST Price**: Host net price passed down from the AST upstream agency.
- **THF Price / Thành Hoàng**: Host net price passed down from Thành Hoàng (THF).
- **WEB Price**: Host net price passed down from the WEB upstream channel.
- **Insurance Price / Bảo hiểm**: Insurance amount attached to the ticket. Empty values count as `0`.
- **Service Fee**: The profit margin added by the agent.
- **Selling Price**: The final price charged to the customer.
- **Discount**: The airline add-in / discount amount earned by the agency for each ticket.
- **True Income / Doanh thu**: The actual ticket income after customer collection, airline discount, and host net prices.
- **Formula**: `selling_price = net_price + service_fee`
- **True Income Formula**: `true_income = selling_price + discount - (ev_price + ast_price + thf_price + web_price + insurance_price)`. Empty EV/AST/THF/WEB/insurance values count as `0`.

> **Note**: Taxes and airport fees are usually included in the `net_price` during AI parsing unless specified otherwise.

## 3. Debt Management (Công Nợ)

Bay Buddy is a debt-first system. Every confirmed ticket is a debt entry.

**Save Ticket & Auto-Debt Requirement:**
Every confirmed ticket MUST trigger a DEBT (CHARGE) transaction and update `customer.balance`.

### Balance Calculation

The **Customer Balance** is a real-time calculation of all interactions:

- **Total Debt**: Sum of all `selling_price` from `CONFIRMED` tickets.
- **Total Paid**: Sum of all `amount` from `PAYMENT` transactions.
- **Discounts**: `DISCOUNT` transactions reduce debt without representing cash movement.
- **Additional Fees**: `ADDITIONAL_FEE` transactions increase debt for post-booking charges.
- **Formula**: `Current Balance = Total Debt + Additional Fees - Total Paid - Discounts - Confirmed Refund Effects`

### Balance Indicators

- **Positive Balance (> 0)**: The customer owes money to the agent.
- **Negative Balance (< 0)**: The agent owes money or holds a deposit for the customer.
- When a payment pushes the balance below zero, the UI must clearly label that state as **"Tiền dư / Đặt cọc"**.
- **Zero Balance (= 0)**: All accounts are settled.

### Banking Terminology (Báo Có / Báo Nợ)

For bank transfer-based accounting workflows in Vietnam, the system must preserve the correct semantics:

- **Báo có**: Incoming money (credit advice) to the agency's bank account (typically customer payments).
- **Báo nợ**: Outgoing money (debit advice) from the agency's bank account (typically refunds or supplier payments).

### Debt Reconciliation (Biên bản đối chiếu công nợ)

To comply with Vietnamese Accounting Standards (Circular 200/2014/TT-BTC or Circular 133/2016/TT-BTC), the system must be capable of generating a formal **Debt Reconciliation Minute** at the end of each accounting period. This document must clearly list:
- Exact opening and closing balances.
- All incurred debts (`CONFIRMED` tickets/`CHARGE` transactions) during the period.
- All payments and cash returns (`PAYMENT` and `REFUND` transactions).
- Non-cash debt adjustments (`DISCOUNT`, `ADDITIONAL_FEE`) separately from cash movement.
- Dedicated signature blocks for both the Agent and the Customer confirming the closing balance.

### Audit Trail Requirement

- Every transaction must store the authenticated internal user in `created_by`.
- Manual customer payments support the method labels `Chuyển khoản`, `Tiền mặt`, `AST`, and `THF`.
- Transaction `occurred_at` is the real-world business event time and may be historical; transaction `created_at` is the Bay Buddy audit timestamp used for logs, histories, and base date-time filtering.
- The optional payment in `/debts/input` may capture `occurred_at` as the payment date; omitting it uses the transaction creation time.
- Payment receipts or transfer screenshots should be attached via `evidence_url` whenever available.
- Refund / overpayment returns should use `is_refund_confirmed` to distinguish planned vs. confirmed outbound payouts.

## 4. Invoicing Logic

Invoices are the primary request-for-payment documents sent to customers.

- **Bulk Invoicing**: A single invoice can contain multiple tickets (e.g., a family booking or a week's worth of business travel).
- **Invoice Content**: Must display PNR, Passenger Name, Itinerary, and individual Selling Prices.
- **State**: Once an invoice is generated, the related `Transaction` rows must be linked to that invoice and marked as invoiced to prevent duplicate billing.
- **Numbering**: Official invoice numbers use the monthly format `BB-YYYYMM-XXXX`.
- **Snapshot Rule**: Customer and ticket data must be copied into invoice and invoice-item snapshot fields at creation time. Later edits to live records must not change issued invoice content.
- **Read-Only Rule**: Once an invoice reaches `ISSUED` or `PAID`, its editable business fields become read-only through the API.
- **Printable Payload**: Public/printable invoice responses must include Bay Buddy brand info and `Số tiền bằng chữ` generated by the backend.

### Invoice State Machine

- `DRAFT -> ISSUED -> PAID`
- `DRAFT -> ISSUED -> CANCELLED`
- `CANCELLED` is terminal and exists for business history, not for reactivation.

## 4.1 Quote Logic

Quotes are pre-sale informational documents and are not part of the receivable ledger until accepted.

- **No Ledger Impact**: Creating, editing, or cancelling a quote must not change `customer.balance` or create ledger rows.
- **Numbering**: Quote numbers use the monthly format `BQ-YYYYMM-XXXX`.
- **Snapshot Rule**: Quotes must also store immutable customer and ticket snapshots so later edits do not alter the original commercial offer.
- **Conversion Rule**: `convert_quote_to_invoice` is the only supported bridge from quote acceptance to invoice creation. Only after conversion may normal invoicing and ledger-linking rules apply.

## 5. User Roles & Permissions

- **Authentication Requirement**: All write operations to tickets, transactions, invoices, quotes, customers, and related financial records must resolve the authenticated user before mutating data.
- **STAFF**: Can parse emails, create tickets, and manage their assigned customers. They cannot modify `net_price` once a ticket is confirmed.
- **ADMIN**: Can modify any field, delete transactions, view global profit reports, and manage staff accounts.

## 6. AI Agent Constraints

When the Agentic AI (Gemini) interacts with data:

1. **Never guess prices**: If an email doesn't show a total price, set `net_price` to `0` and flag for manual entry.
2. **Date Integrity**: Preserve the extracted `flight_date` as the scheduled departure datetime even when it is in the past. Use `created_at` / `updated_at` for app history, audit logs, and base date-time filtering.
3. **Currency**: Default currency is `VND`. All calculations must handle integer values (no decimals for VND).

## 7. Legal & Tax Compliance (Vietnam)

To operate compliantly within the Vietnamese market, the system must adhere to local taxation and e-invoice laws.

### E-Invoice Structure (Decree 123/2020/ND-CP)

When generating official electronic invoices (Hóa đơn điện tử) for `BUSINESS` accounts, the system data must support:
- **Buyer & Seller Tax IDs (Mã số thuế)**: Mandatory for B2B transactions.
- **VAT Breakdown**: Displaying the separated taxable and non-taxable components.
- **Total in Words (Số tiền bằng chữ)**: The final grand total must be written out in Vietnamese script securely.

### VAT Calculation Logic

Flight ticket taxation in Vietnam is complex and components must be partitioned correctly for accounting:
- **Taxable Fare & Surcharges**: The base flight fare and airline surcharges (e.g., fuel, system fees). Subject to VAT (historically 10%, or 8% depending on active stimulus decrees).
- **Non-Taxable Airport Fees**: Government and airport fees (e.g., passenger service charge, security screening) collected on behalf of the respective authorities. These are non-taxable (0% VAT).
- **Taxable Service Fees**: The Agent's profit margin (`service_fee`) is treated as a service rendered and is always subject to standard VAT.
