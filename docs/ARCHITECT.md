# System Architecture - Bay Buddy

## 1. Database Schema (SQLModel)
*Note: The database is now LIVE on Railway and now includes `invoice` and `invoice_item` in addition to the financial core tables.*

## Authentication Standard
- JWT authentication is the required security standard for all write operations.
- Every create, update, delete, or confirmation endpoint must resolve the authenticated user through `get_current_user` before mutating data.
- The `user` table is active in production and is used as the source of truth for API authentication and RBAC.
- All primary-key UUID columns use database-side UUID generation so inserts should not require manual ID assignment on PostgreSQL deployments.

### JWT Authentication Flow
1. The client submits `username` and `password` to `POST /api/v1/auth/login`.
2. The login endpoint accepts `application/x-www-form-urlencoded` credentials via FastAPI's `OAuth2PasswordRequestForm`.
3. On success, the API returns `{ access_token, token_type }` where `token_type` is `bearer`.
4. The frontend stores the JWT access token and sends it in the `Authorization: Bearer <token>` header for protected requests.
5. Protected routes resolve the token through `OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")` and then load the authenticated user with `get_current_user`.
6. Swagger UI uses the same OAuth2 password flow, so the generated OpenAPI schema can request a token and attach the bearer header automatically to locked endpoints.

### Model: User
- `id`: UUID (PK)
- `username`: String (Unique)
- `hashed_password`: String
- `role`: Enum (ADMIN, STAFF)
- `is_active`: Boolean (Default: True)

### Model: Customer
- `id`: UUID (PK)
- `name`: String (Individual or Business)
- `type`: Enum (INDIVIDUAL, BUSINESS)
- `balance`: Float (Current debt status. Positive = Debt, Negative = Credit)

### Model: Ticket
- `id`: UUID (PK)
- `pnr`: String(6) - Booking Reference (may repeat across passenger-group rows; not globally unique)
- `ticket_number`: String Nullable - Airline ticket number (not unique; may repeat across outbound/return legs)
- `seat_code`: String Nullable - Optional seat assignment code (e.g. `12A`)
- `fare_class`: String Nullable - Raw fare class / fare family label from source data (e.g. `B`, `L`, `Eco1`, `Flexible`)
- `airline`: Enum Nullable (VNA, VJ, QH, VU)
- `passengers`: List[String] (JSON type in DB)
- `departure_place`: String Nullable (Human-readable origin place, e.g. "Đà Nẵng")
- `arrival_place`: String Nullable (Human-readable destination place, e.g. "Hồ Chí Minh")
- `departure_code`: String Nullable (Origin city/place code, e.g. "DAD")
- `arrival_code`: String Nullable (Destination city/place code, e.g. "SGN")
- `itinerary`: String Nullable (Compatibility/display field, e.g., "HAN-SGN")
- `flight_date`: DateTime
- `net_price`: Float (Supplier/Airline cost)
- `ev_price`: Float (Host net price from EV; empty values count as 0)
- `ast_price`: Float (Host net price from AST; empty values count as 0)
- `thf_price`: Float (Host net price from Thành Hoàng / THF; empty values count as 0)
- `web_price`: Float (Host net price from WEB; empty values count as 0)
- `insurance_price`: Float (Ticket insurance amount; empty values count as 0)
- `selling_price`: Float (Price sold to Customer)
- `discount`: Float (Airline add-in / discount amount earned by the agency)
- `true_income`: Float (Actual ticket income / doanh thu: `selling_price + discount - (ev_price + ast_price + thf_price + web_price + insurance_price)`)
- `status`: Enum (DRAFT, CONFIRMED, VOID, REFUNDED)
- `customer_id`: UUID (FK to Customer)
- `created_at`: DateTime (UTC auto-stamp for when Bay Buddy recorded the ticket)
- `updated_at`: DateTime (UTC auto-stamp for the latest ticket mutation)

### Ticket Route Rule
- New ticket writes should treat `departure_place`, `arrival_place`, `departure_code`, and `arrival_code` as the structured source-of-truth route fields.
- `itinerary` remains in the schema for backward compatibility and display, and should be derived from the route codes when both are available.
- `pnr` can repeat across grouped passengers from the same booking and must not be used as a unique-row key.
- Do not overload place fields with airport-level data. If the product later needs exact airport names/codes, add dedicated airport fields alongside the current place fields.

### Ticket Time Rule
- `flight_date` is the scheduled departure datetime. It may be earlier than the app base date time.
- `created_at` and `updated_at` are the audit timestamps used for app history, logs, and recent activity. Ticket active-window filtering uses `updated_at`, which is equal to `created_at` until the ticket is changed.
- Do not use `flight_date` to decide whether a ticket is active in the current app window.

### Model: Transaction
- `id`: UUID (PK)
- `amount`: Float
- `type`: Enum (PAYMENT, CHARGE, REFUND)
- `category`: Enum (TICKET_PURCHASE, PAYMENT, DISCOUNT, ADDITIONAL_FEE, REFUND)
- `method`: String (Bank Transfer, Cash)
- `note`: Text Nullable (Required for manual payments and manual adjustments)
- `evidence_url`: String Nullable (Receipt / payment proof URL)
- `customer_id`: UUID (FK to Customer)
- `linked_ticket_id`: UUID Nullable (FK to Ticket for specific reconciliation / đích danh)
- `is_refund_confirmed`: Boolean (Marks confirmed overpayment-return / refund payouts)
- `is_invoiced`: Boolean (Locked once included in an issued invoice)
- `invoice_id`: UUID Nullable (FK to Invoice for duplicate-billing prevention)
- `created_by`: UUID (FK to User for audit trail ownership)
- `occurred_at`: DateTime (Real-world event timestamp)
- `created_at`: DateTime (UTC auto-stamp)

### Transaction Time Rule
- `occurred_at` is the real-world payment/adjustment event timestamp and may be earlier than the app base date time.
- `created_at` is the audit timestamp for when Bay Buddy recorded the transaction and is used for active app-window filtering, histories, logs, and recent activity.

### Model: Invoice
- `id`: UUID (PK)
- `invoice_number`: String Unique (Format `BB-YYYYMM-XXXX`)
- `customer_id`: UUID (FK to Customer)
- `customer_name_snapshot`: String
- `customer_address_snapshot`: String Nullable
- `customer_tax_code_snapshot`: String Nullable
- `total_amount`: Float
- `tax_amount`: Float
- `discount_amount`: Float
- `status`: Enum (DRAFT, ISSUED, PAID, CANCELLED)
- `note`: Text Nullable
- `created_at`: DateTime (UTC auto-stamp)
- `issued_at`: DateTime Nullable

### Invoice Numbering Logic
- Invoice numbers are generated in the backend service using format `BB-YYYYMM-XXXX`.
- `YYYYMM` comes from the creation month in UTC.
- `XXXX` is a 4-digit monthly sequence derived from the latest invoice numbers already stored for that same month.
- The sequence resets automatically when the month changes because the lookup scope is limited to the active `YYYYMM` prefix.

### Backend Currency Words Utility
- The backend exposes a Vietnamese amount-in-words helper for invoice payloads.
- `convert_vnd_to_words(amount)` returns strings such as `Một triệu đồng chẵn`.
- The Invoice detail API must return this value so decree-style printable outputs can reuse one consistent source of truth.

### Model: InvoiceItem
- `id`: UUID (PK)
- `invoice_id`: UUID (FK to Invoice)
- `description`: String Snapshot
- `quantity`: Float
- `unit_price`: Float
- `unit_price_snapshot`: Float
- `passenger_name_snapshot`: String
- `total`: Float
- `linked_ticket_id`: UUID Nullable (FK to Ticket)

### Model: Quote
- `id`: UUID (PK)
- `quote_number`: String Unique (Format `BQ-YYYYMM-XXXX`)
- `customer_id`: UUID (FK to Customer)
- `customer_name_snapshot`: String
- `customer_address_snapshot`: String Nullable
- `customer_tax_code_snapshot`: String Nullable
- `total_amount`: Float
- `tax_amount`: Float
- `discount_amount`: Float
- `valid_until`: DateTime
- `status`: Enum (DRAFT, ACCEPTED, EXPIRED, CANCELLED)
- `note`: Text Nullable
- `created_at`: DateTime

### Model: QuoteItem
- `id`: UUID (PK)
- `quote_id`: UUID (FK to Quote)
- `description`: String Snapshot
- `quantity`: Float
- `unit_price`: Float
- `unit_price_snapshot`: Float
- `passenger_name_snapshot`: String
- `total`: Float
- `linked_ticket_id`: UUID Nullable (FK to Ticket)

### Snapshot Integrity Rule
- Invoice and Quote payloads must render from snapshot fields only.
- Once an invoice or quote is created, later edits to `customer` or `ticket` rows must not change printable/output data.
- `GET /api/v1/finance/invoices/{id}` and `GET /api/v1/finance/invoices/{id}/public` must use stored snapshots instead of live joins.

### Relationship Map
- **Customer (1) <---> (N) Ticket**: One customer can have multiple confirmed tickets. Linked via `Ticket.customer_id`.
- **Customer (1) <---> (N) Transaction**: One customer can have multiple transactions (payments, charges). Linked via `Transaction.customer_id`.
- **Customer (1) <---> (N) Invoice**: One customer can have multiple draft or issued invoices. Linked via `Invoice.customer_id`.
- **Customer (1) <---> (N) Quote**: One customer can have multiple informational quotes. Linked via `Quote.customer_id`.
- **Ticket (1) <---> (N) Transaction**: Auto-created debt rows and specific reconciliations may be linked back to the originating ticket via `Transaction.linked_ticket_id`.
- **Invoice (1) <---> (N) InvoiceItem**: Each invoice contains one or more line items. Linked via `InvoiceItem.invoice_id`.
- **Invoice (1) <---> (N) Transaction**: Selected transactions are attached to the invoice through `Transaction.invoice_id`, and become locked when the invoice is `ISSUED`.
- **Quote (1) <---> (N) QuoteItem**: Each quote contains immutable informational line items. Linked via `QuoteItem.quote_id`.

### Quote Logic
- Quotes are informational only and must not affect `customer.balance` or the ledger.
- Accepting a quote converts its snapshot lines into a draft invoice through backend-only `convert_quote_to_invoice`.
- Quote conversion links matching ticket-purchase transactions to the new invoice when available.

### Invoice State Machine
- `DRAFT -> ISSUED -> PAID`
- `DRAFT -> ISSUED -> CANCELLED`
- Once an invoice is `ISSUED` or `PAID`, its editable fields become read-only through the API.
- `CANCELLED` is treated as terminal for business purposes and must not be mutated back into an active billing document.

## 2. AI Model
- **Primary Model**: `gemini-2.5-flash` (Google Gemini 2.5 Flash)
- **Capability**: Multimodal — processes raw text, images (JPEG/PNG/WebP), and PDF documents in a single inference call.
- **Logic**: All AI parsing is handled exclusively in `services/ai_agent.py` using the Google GenAI Python SDK.

## 3. Agentic Flow
1. **Input**: User uploads a file (image or PDF of a booking confirmation) via the web UI.
2. **Transport**: Frontend sends `multipart/form-data` with the file to `POST /api/v1/ai/parse`.
3. **AI Action**: FastAPI reads the file bytes and passes them to Gemini 2.5 Flash along with the `docs/AGENT_PARSER.md` extraction prompt.
4. **Validation**: API returns structured JSON; Frontend validates via Zod and populates the `react-hook-form` fields.
5. **Authentication Gate**: Before any write operation, the backend resolves the authenticated user from the JWT bearer token.
6. **Finalization**: On user confirmation, the backend creates a Ticket record and updates the `Customer.balance` via a DB transaction.

## 4. Frontend Architecture Standard (Vercel App Router)

Bay Buddy now follows the `react-best-practices` standard aligned with Vercel's latest Next.js App Router guidance.

- **Read Path**: Prefer React Server Components for fetching ledger data, ticket details, and other initial page payloads.
- **Write Path**: Prefer Server Actions for mutations such as recording payments, confirming tickets, and updating ticket metadata.
- **Validation Boundary**: Zod schemas must be shared across Client and Server so the same contract validates form input before and after submission.
- **Form State**: App Router forms should use `useActionState` / `useFormState` for result handling and `useFormStatus` for pending UI.
- **TypeUI Principle**: Interfaces must communicate state clearly. The user should always understand whether data is pending, saved, failed, or rolled back.
- **Optimistic UX**: Use `useOptimistic` where latency would otherwise degrade the workflow, especially on financial ledgers where a newly recorded payment should appear instantly.

### Record Payment Flow (Step 4.3)

1. The customer ledger page loads via an RSC and passes the current ledger rows into the interactive payment surface.
2. The ledger page must not fetch `/ledger` inside a client-side `useEffect` or render path; client components receive the server-fetched ledger as props.
3. The Payment Dialog uses a shared Zod schema for both client-side preflight validation and server-side action validation.
4. Submission is handled by a Server Action wrapped with `useActionState` (or `useFormState`).
5. The submit button derives its loading state from `useFormStatus`.
6. The ledger applies `useOptimistic` so the new payment row appears immediately in the table.
7. `recordPaymentAction` must call `revalidatePath('/customers/[id]')` so the RSC ledger refreshes after a successful mutation, instead of manually refetching on the client.
8. After the Server Action completes, the optimistic row is reconciled with the persisted transaction or rolled back if validation/authentication fails.

## 5. Customer Endpoints
- `GET /api/v1/customers` returns the customer directory used by the web UI.
- The directory payload includes `id`, `full_name`, `phone`, and `current_balance`.
- `current_balance` is sourced directly from the `customer.balance` value stored in the database.
- `GET /api/v1/customers/{id}/ledger` returns the customer ledger used by the ledger detail page.
- The ledger payload includes the `customer`, the `current_balance`, and an `entries` list that is already table-ready for the frontend.

### Customer Ledger Structure
- Each ledger row contains `id`, `entry_type`, `created_at`, `content`, `amount`, and `running_balance`.
- In the ledger payload, `created_at` represents the audit/history timestamp used for chronological display.
- `entry_type="ticket"` represents a confirmed ticket and is shown as a positive debt row using `Ticket.selling_price`.
- `entry_type="payment"` represents cash movement categories. `PAYMENT` is shown as a negative amount because it reduces debt, while outbound `REFUND` increases debt / reduces held credit after money is returned to the customer.
- `entry_type="adjustment"` represents non-cash debt adjustments such as `DISCOUNT` and `ADDITIONAL_FEE`.
- Ticket rows use `Ticket.updated_at` so corrections and reassignments are reflected in history without using `flight_date`.
- Ledger rows are sorted by `created_at` ascending, with ticket rows ordered before non-ticket rows when timestamps are equal.
- Running balance is calculated incrementally: `running_balance = previous_running_balance + amount`.
- This produces the debt-first formula used in the UI: positive balances mean the customer owes money, negative balances mean the customer has credit / deposit (`Tiền dư / Đặt cọc`).
