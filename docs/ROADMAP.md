# 🗺️ BAY BUDDY MASTER ROADMAP

**Project Status:** 🟢 Phase 4 (Completed) | 🔵 Phase 5 (In-Progress)
**Design System:** Astryx Design with the default Neutral theme
**Core Aesthetics:** High-density, data-driven, calm operational UI

---

## 🏗️ PAST PHASES: THE FOUNDATION (COMPLETED)

### Phase 1: Infrastructure & Tech Stack
- [x] Service workspace setup with **separate `api/` and `web/` services**.
- [x] Styling with **Astryx Design**, the **Neutral theme**, and token-based CSS Modules.
- [x] Database architecture with **PostgreSQL** & **Prisma**.
- [x] Centralized design tokens in `globals.css`.

### Phase 2: Customer CRM & Profile Logic
- [x] Full CRUD operations for Customers.
- [x] **Customer Segmentation:** Personal Clients vs. Sub-agents.
- [x] Unified Customer Profile dashboard.

### Phase 3: Booking & Ticket Engine
- [x] **Booking Schema:** Flight PNR, Airline carriers, Itineraries, and Schedules.
- [x] **Financial Logic:** Net Price (Cost) vs. Selling Price calculation.
- [x] **Commission Engine:** Automated profit/markup tracking per ticket.

### Phase 4: Financial Core & Ledger (The Heart)
- [x] **Double-entry Ledger:** Comprehensive transaction logging for every customer.
- [x] **Invoice Snapshots:** Point-in-time billing records for easy auditing.
- [x] **Payment Tracking:** Payment receipts & debt offsetting logic.
- [x] **UI Transition:** Migration to the Astryx Neutral operations UI.

---

## 🚀 CURRENT PHASE: GROWTH & INTELLIGENCE (ACTIVE)

### Phase 5: Dashboard & Visual Analytics
*Goal: Turn Ledger data into actionable business insights.*
- [ ] **Financial Widgets:** Total Revenue, Net Profit, Total Receivables (Công nợ phải thu).
- [ ] **Debt Aging Reports:** Visual breakdown of overdue payments (0-30, 31-60, 60+ days).
- [ ] **Revenue Trends:** Interactive line charts using `Recharts` and Neutral semantic tokens.
- [ ] **Performance Benchmarking:** Top-performing customers and high-profit routes.

---

## ⏳ FUTURE PHASES: AUTOMATION & SCALING

### Phase 6: Professional Output & Communication
*Goal: Professionalize customer-facing interactions.*
- [ ] **Operations-style PDFs:** High-density, clean PDF invoice generation.
- [ ] **Public View Links:** Unique, secure URLs for customers to view their Ledger/Invoices.
- [ ] **Zalo/Social Integration:** Quick-share buttons for booking details and debt reminders.

### Phase 7: Efficiency Boost (AI Integration)
*Goal: Minimize manual data entry.*
- [ ] **Ticket OCR:** AI-powered extraction of PNR, Route, and Price from ticket images/PDFs.
- [ ] **Itinerary AI:** Automated travel schedule drafting in "Grid View" based on customer requirements.

### Phase 8: Production Ready & Scaling
*Goal: Finalize for multi-user use and public deployment.*
- [ ] **Authentication:** Secure login with `NextAuth` (Google/OTP).
- [ ] **RBAC:** Roles for Admin (Nghĩa), Staff (Booking agents), and Accountants.
- [ ] **CRM Enhancements:** Loyalty points, seat preferences, and birthday automation.
- [ ] **Final Deployment:** Optimized production build on Vercel/Railway.

---

## 🛠️ DEVELOPER GUIDELINES (FOR AGENT)
1. **Theme Lock:** Use the Astryx Neutral semantic tokens. Do not add a local color palette.
2. **UI Density:** Prioritize showing more information with less whitespace.
3. **Logic Integrity:** Never modify Phase 4 Ledger/Financial logic unless explicitly requested. 
4. **Consistency:** All new components must follow `docs/DESIGN.md` and `docs/UX.md`.
