# Bay Buddy - Master Project Guidelines

You are an advanced AI Agent (Senior Fullstack Developer & Architect). Your mission is to build and maintain the "Bay Buddy" Flight & Debt Management System using an Agentic AI architecture.

## 🎯 Current Progress

Infrastructure, Database, and Stage 4 Financial Core are complete. The system now includes transaction compliance fields, server-action-based payment recording, ledger reconciliation rules, invoice/quote services, and snapshot-backed financial documents.

**Current Status:**
- **Financial Core:** Stage 4 backend is complete and ready for UI integration. Invoices, quotes, public invoice payloads, customer/ticket patch APIs, and invoice locking rules are implemented.
- **Frontend Finance Flow:** The customer ledger follows App Router best practices. Reads happen through React Server Components, and payment recording uses a Server Action with `useActionState`, `useFormStatus`, shared Zod validation, and optimistic ledger insertion.
- **Authentication Standard:** All write operations to tickets, transactions, invoices, quotes, customers, and related financial records MUST be authenticated.
- **Next Focus:** Continue the authenticated App Router UI integration on top of the completed backend finance APIs.

## 📁 Project Structure & Context (The "Bay Buddy DNA")

Before implementing any feature or modifying code, you **MUST** reference this file (`AGENTS.md`) and the documentation in the `/docs/` directory. Together, these files form the "**Bay Buddy DNA**" (or "**DNA**" in shorthand), which acts as the system's absolute source of truth:

- `docs/ARCHITECT.md`: System architecture, Database models (SQLModel), and Security flows.
- `docs/BUSINESS.md`: Core business rules, pricing logic, and debt (công nợ) management.
- `docs/AGENT_PARSER.md`: Specific instructions for Gemini-powered flight data extraction.
- `docs/DICTIONARY.md`: Industry terminology mapping (VI <-> EN) and i18n formatting rules.

## 🛠 Tech Stack

- **Frontend**: Next.js 16 (App Router, Turbopack), TypeScript, Shadcn UI, Tailwind CSS.
- **Backend**: Python 3.10+, FastAPI, SQLModel (Pydantic v2 + SQLAlchemy), Poetry.
- **Package Managers**: **Yarn** (Frontend) and **Poetry** (Backend).
- **State Management**: TanStack Query v5 (React Query).
- **Forms & Validation**: Zod-first validation shared between Client and Server boundaries.
- **i18n**: `next-international` (Default Locale: `vi`, Secondary: `en`).
- **Auth**: JWT (OAuth2PasswordBearer) with bcrypt password hashing.
- **Deployment**: Standalone Docker image (Frontend) & Uvicorn (Backend).
- **Frontend Standard**: `react-best-practices` is now part of the DNA. Follow Vercel's latest Next.js App Router recommendations by default.
- **UI Skill Standard**: For any UI, layout, styling, dashboard, form, table, or design-system task, the agent MUST also use the local `frontend-design` skill in `.agents/skills/frontend-design/SKILL.md` together with the Bay Buddy DNA.

## 💻 Coding Standards

### 1. General Rules

- **No Hard-coding**: All UI text must use `t('key')` via `next-international`.
- **Naming Convention**: Use `docs/DICTIONARY.md` for domain-specific variables (e.g., `pnr`, `net_price`, `selling_price`).
- **Language Policy**: System communication is English; target market is Vietnam; UI labels are Vietnamese-first.
- **Semantic Integrity**: Preserve Vietnamese business terms with precision (e.g., "công nợ", "Nghị định 123", "số tiền bằng chữ", "báo có/báo nợ") while keeping variable names in English (e.g., `is_invoice_issued`).

### 2. Backend (Python/FastAPI)

- **Style**: Follow PEP 8 strictly. Use Type Hints for all parameters and return types.
- **Concurrency**: Use `async def` for all route handlers and IO-bound operations.
- **AI Logic**: All flight parsing must be handled in `services/ai_agent.py` using the Google GenAI SDK. Choose the most suitable Gemini model available at implementation time based on current availability, cost, latency, and multimodal support. The selected model must support processing raw bytes from uploaded images (JPEG, PNG, WebP) and PDF documents directly, in addition to plain text.
- **Financial Integrity**: Invoice and quote APIs must use snapshot fields so issued documents remain unchanged even if live `customer` or `ticket` data is edited later.
- **Invoice Rules**: Invoice numbers use `BB-YYYYMM-XXXX`; quotes use `BQ-YYYYMM-XXXX`. Once an invoice reaches `ISSUED` or `PAID`, its editable fields become read-only.
- **Audit Trail**: Every transaction mutation must preserve `created_by`, and optional payment proof should be stored in `evidence_url` when available.

### 3. Frontend (Next.js/TS)

- **Components**: Use Functional Components and Server Components by default.
- **UI**: Shadcn UI is the primary component library. Maintain a minimalist and clean aesthetic.
- **App Shell Navigation**: Treat `/` as the real homepage. Do not duplicate it as a separate left-sidebar destination when the logo already serves as the home entry point. The homepage breadcrumb label must be locale-aware (`Trang chủ` in `vi`, `Home` in `en`).
- **Data Fetching**: Prefer React Server Components (RSC) for read operations and initial data loading in App Router.
- **Mutations**: Use Server Actions for all data mutations, especially creating payments and updating tickets.
- **Forms**: For App Router forms, prefer `useActionState` / `useFormState` over client-only mutation handlers.
- **Pending State**: Use `useFormStatus` to drive submit-button loading, disabled states, and in-flight labels.
- **Validation**: Reuse the same Zod schema on both Client and Server for every critical form.
- **TypeUI Principle**: UI should feel type-safe, predictable, and immediate. Pending, success, error, and rollback states must be explicit.
- **Optimistic UI**: Consider `useOptimistic` for mutation-heavy surfaces such as the customer ledger so newly recorded payments appear instantly before server confirmation.
- **TanStack Query Usage**: Keep TanStack Query for client-side cache coordination, background refresh, or interactive islands where RSC alone is not sufficient.
- **Logo Treatment**: In the authenticated shell, the Bay Buddy logo should read as a direct navigation affordance to the homepage, centered in the sidebar, and should avoid decorative card framing unless a future redesign explicitly changes the shell pattern.

### 4. Record Payment Standard (Step 4.3)

- The Payment Dialog must submit through a **Server Action**.
- The form state must be driven by `useActionState` (or `useFormState` where applicable).
- The submit button must read its pending state from `useFormStatus`.
- Validation must use a shared Zod schema on both Client and Server.
- The ledger view should adopt **optimistic insertion** so the payment row appears immediately while the action is still pending.
- Optimistic entries must reconcile cleanly with the confirmed server response and roll back safely on validation or network failure.

### 5. Financial Core Standard (Stage 4.4)

- **Invoices**: `GET /api/v1/finance/invoices/{id}` and `GET /api/v1/finance/invoices/{id}/public` must render from stored invoice snapshots, not live joins.
- **Quotes**: Quotes are informational only and MUST NOT affect `customer.balance` or ledger rows.
- **Quote Conversion**: `convert_quote_to_invoice` is the only supported bridge from quote acceptance to invoice creation.
- **Ledger Integrity**: `DISCOUNT` reduces debt without cash flow, `ADDITIONAL_FEE` increases debt, and negative balances must be labeled as `Tiền dư / Đặt cọc` in the UI.
- **Public Invoice Payload**: Printable invoice responses must include Bay Buddy brand info, snapshot fields, and Vietnamese amount-in-words from the backend utility.

## 🔐 Authentication & Security

- **JWT**: Use JWT for session management. Store tokens securely (HttpOnly Cookies preferred).
- **RBAC**: Implement Role-Based Access Control.
  - `ADMIN`: Full system access, user management, and financial reporting.
  - `STAFF`: Ticket entry, customer management, and debt tracking.

## 🚀 Common Commands

### Backend (apps/api)

- **Install Dependencies**: `poetry install`
- **Run Development Server**: `yarn api` (from project root) or `poetry run uvicorn main:app --reload --port 6768`
- **Database Migrations**: `poetry run alembic upgrade head`

### Frontend (apps/web)

- **Install Dependencies**: `yarn install`
- **Run Development Server**: `yarn web` (from project root) or `yarn dev --port 6769`
- **Build Production**: `yarn build`
- **Add Packages**: `yarn add <package_name>`

## 🤖 Agentic Workflow

When tasked with "Parsing a ticket":

1. Interrogate `docs/AGENT_PARSER.md` for the latest prompt engineering strategies.
2. The Frontend sends a `multipart/form-data` request with the uploaded file (image/PDF) to `POST /api/v1/ai/parse`.
3. The Backend reads the raw file bytes and submits them directly to the most suitable currently available Gemini model using the GenAI SDK's multimodal part format.
4. The selected Gemini model uses the system prompt from `AGENT_PARSER.md` (including visual instructions for logos, QR codes, and price tables) to extract structured JSON.
5. Ensure the returned data passes both the Backend Pydantic validation and the Frontend Zod validation before allowing a database commit.
