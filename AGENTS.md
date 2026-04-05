# Bay Buddy - Master Project Guidelines

You are an advanced AI Agent (Senior Fullstack Developer & Architect). Your mission is to build and maintain the "Bay Buddy" Flight & Debt Management System using an Agentic AI architecture.

## 🎯 Current Progress

Infrastructure & Database are complete. Backend Save Logic and Frontend Save button are connected and functionally verified.

**Current Status (Paused):**
We temporarily disabled backend authentication for the `POST /confirm` route to test the DB flow (Option 2). 
- **Current Issue:** Without the bypass, the Frontend Save button triggers a `401 Unauthorized` because it does not send a token. Next step is to implement JWT injection into Axios/Fetch headers OR finalize the Frontend Auth flow.
- **Architectural Decision:** All write operations to tickets and transactions MUST be authenticated.

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
- **Forms & Validation**: React Hook Form + Zod (Frontend) strictly synced with Pydantic (Backend).
- **i18n**: `next-international` (Default Locale: `vi`, Secondary: `en`).
- **Auth**: JWT (OAuth2PasswordBearer) with bcrypt password hashing.
- **Deployment**: Standalone Docker image (Frontend) & Uvicorn (Backend).

## 💻 Coding Standards

### 1. General Rules

- **No Hard-coding**: All UI text must use `t('key')` via `next-international`.
- **Naming Convention**: Use `docs/DICTIONARY.md` for domain-specific variables (e.g., `pnr`, `net_price`, `selling_price`).
- **Language Policy**: System communication is English; target market is Vietnam; UI labels are Vietnamese-first.
- **Semantic Integrity**: Preserve Vietnamese business terms with precision (e.g., "công nợ", "Nghị định 123", "số tiền bằng chữ", "báo có/báo nợ") while keeping variable names in English (e.g., `is_invoice_issued`).

### 2. Backend (Python/FastAPI)

- **Style**: Follow PEP 8 strictly. Use Type Hints for all parameters and return types.
- **Concurrency**: Use `async def` for all route handlers and IO-bound operations.
- **AI Logic**: All flight parsing must be handled in `services/ai_agent.py` using the **Gemini 2.5 Flash** SDK. The model supports multimodal input: it can process raw bytes from uploaded images (JPEG, PNG, WebP) and PDF documents directly, in addition to plain text.

### 3. Frontend (Next.js/TS)

- **Components**: Use Functional Components and Server Components by default.
- **UI**: Shadcn UI is the primary component library. Maintain a minimalist and clean aesthetic.
- **Data Fetching**: Use custom hooks wrapping TanStack Query for all API interactions.

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
3. The Backend reads the raw file bytes and submits them directly to **Gemini 2.5 Flash** using the GenAI SDK's multimodal part format.
4. Gemini 2.5 Flash uses the system prompt from `AGENT_PARSER.md` (including visual instructions for logos, QR codes, and price tables) to extract structured JSON.
5. Ensure the returned data passes both the Backend Pydantic validation and the Frontend Zod validation before allowing a database commit.
