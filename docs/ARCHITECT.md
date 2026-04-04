# System Architecture - Bay Buddy

## 1. Database Schema (SQLModel)
*Note: The database is now LIVE on Railway with 4 tables: `customer`, `ticket`, `transaction`, and `user`.*

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
- `created_at`: DateTime (UTC auto-stamp)

### Relationship Map
- **Customer (1) <---> (N) Ticket**: One customer can have multiple confirmed tickets. Linked via `Ticket.customer_id`.
- **Customer (1) <---> (N) Transaction**: One customer can have multiple transactions (payments, charges). Linked via `Transaction.customer_id`.
*(Note: Transactions are currently linked only to Customers to adjust their balance. They do not have a direct foreign key to individual Tickets yet in the current schema.)*

## 2. AI Model
- **Primary Model**: `gemini-2.5-flash` (Google Gemini 2.5 Flash)
- **Capability**: Multimodal — processes raw text, images (JPEG/PNG/WebP), and PDF documents in a single inference call.
- **Logic**: All AI parsing is handled exclusively in `services/ai_agent.py` using the Google GenAI Python SDK.

## 3. Agentic Flow
1. **Input**: User uploads a file (image or PDF of a booking confirmation) via the web UI.
2. **Transport**: Frontend sends `multipart/form-data` with the file to `POST /api/v1/ai/parse`.
3. **AI Action**: FastAPI reads the file bytes and passes them to Gemini 2.5 Flash along with the `docs/AGENT_PARSER.md` extraction prompt.
4. **Validation**: API returns structured JSON; Frontend validates via Zod and populates the `react-hook-form` fields.
5. **Finalization**: On User confirmation, Backend creates a Ticket record and updates the `Customer.balance` via a DB transaction.