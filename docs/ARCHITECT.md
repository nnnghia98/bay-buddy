# System Architecture - Bay Buddy

## 1. Database Schema (SQLModel)
*Note: The database is now LIVE on Railway with 4 tables: `customer`, `ticket`, `transaction`, and `user`.*

## Authentication Standard
- JWT authentication is the required security standard for all write operations.
- Every create, update, delete, or confirmation endpoint must resolve the authenticated user through `get_current_user` before mutating data.
- The `user` table is active in production and is used as the source of truth for API authentication and RBAC.
- Operational note: on Railway, inserts into the `user` table may currently require an explicitly defined `id` value if automatic ID generation is not fully aligned with the deployed schema.

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
- `pnr`: String(6) - Unique Booking Reference
- `airline`: Enum (VNA, VJ, QH, VU)
- `passengers`: List[String] (JSON type in DB)
- `itinerary`: String (e.g., "HAN-SGN")
- `flight_date`: DateTime
- `net_price`: Float (Supplier/Airline cost)
- `selling_price`: Float (Price sold to Customer)
- `status`: Enum (DRAFT, CONFIRMED, VOID, REFUNDED)
- `customer_id`: UUID (FK to Customer)

### Model: Transaction
- `id`: UUID (PK)
- `amount`: Float
- `type`: Enum (PAYMENT, CHARGE, REFUND)
- `method`: String (Bank Transfer, Cash)
- `note`: String Nullable (Optional reference/note)
- `customer_id`: UUID (FK to Customer)
- `ticket_id`: UUID Nullable (FK to Ticket for auto-debt charge rows)
- `created_at`: DateTime (UTC auto-stamp)

### Relationship Map
- **Customer (1) <---> (N) Ticket**: One customer can have multiple confirmed tickets. Linked via `Ticket.customer_id`.
- **Customer (1) <---> (N) Transaction**: One customer can have multiple transactions (payments, charges). Linked via `Transaction.customer_id`.
- **Ticket (1) <---> (N) Transaction**: Auto-created debt rows may be linked back to the originating ticket via `Transaction.ticket_id`.

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

## 4. Customer Endpoints
- `GET /api/v1/customers` returns the customer directory used by the web UI.
- The directory payload includes `id`, `full_name`, `phone`, and `current_balance`.
- `current_balance` is sourced directly from the `customer.balance` value stored in the database.
- `GET /api/v1/customers/{id}/ledger` returns the customer ledger used by the ledger detail page.
- The ledger payload includes the `customer`, the `current_balance`, and an `entries` list that is already table-ready for the frontend.

### Customer Ledger Structure
- Each ledger row contains `id`, `entry_type`, `created_at`, `content`, `amount`, and `running_balance`.
- `entry_type="ticket"` represents a confirmed ticket and is shown as a positive debt row using `Ticket.selling_price`.
- `entry_type="payment"` represents `PAYMENT` or `REFUND` transactions and is shown as a negative amount because it reduces debt.
- `entry_type="adjustment"` represents standalone `CHARGE` transactions that are not tied to a ticket.
- Ticket rows use the linked `CHARGE` transaction timestamp as their ledger `created_at` when available; otherwise they fall back to `Ticket.flight_date`.
- Ledger rows are sorted by `created_at` ascending, with ticket rows ordered before non-ticket rows when timestamps are equal.
- Running balance is calculated incrementally: `running_balance = previous_running_balance + amount`.
- This produces the debt-first formula used in the UI: positive balances mean the customer owes money, negative balances mean the customer has credit.
