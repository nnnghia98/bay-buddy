# Authenticated App UX Rework Design

## Goal

Improve focus, content readability, and usable workspace across Bay Buddy authenticated pages by rebalancing the app shell and shared page patterns.

This redesign is not a visual rebrand. It is a structural UX refinement for the internal operations product so staff can scan pages faster, distinguish sections more clearly, and reach the main working surface with less friction.

## Context

The UI already had a compact operational baseline, but several authenticated pages still felt harder to scan than they should. The main issues identified during review were:

- Section boundaries feel too soft, which makes it harder to concentrate on the main work area.
- Decorative framing and large card treatments consume attention without adding enough operational value.
- The current shell and page spacing leave less room than necessary for tables, ledgers, and document views.
- Oversized headers and nested panels delay the user's path to the real task surface.

The redesign direction approved for this work is:

- Layout direction: `Operational balanced`
- Density: `Moderate overall, strong for data surfaces`
- Sidebar: `Slimmer to return width to the main workspace`
- Section contrast: `Balanced contrast`, not overly soft and not overly rigid

## Design Principles

The redesign must preserve Bay Buddy DNA:

- Keep the product calm, operational, and trustworthy.
- Preserve Vietnamese-first terminology and existing finance semantics.
- Avoid turning authenticated pages into marketing-style compositions.
- Prefer shared page patterns over one-off page-specific styling.
- Use contrast and structure to create hierarchy before using stronger decoration.

The new UX should feel:

- Easier to scan at a glance
- More spacious where the work happens
- More disciplined in how sections are separated
- Less visually noisy without becoming sterile

## Scope

This design covers authenticated App Router surfaces in `apps/web`, especially:

- Global app shell
- Shared page rhythm and wrappers
- Dashboard
- Customer directory
- Customer ledger
- Invoice and quote detail pages
- Ticket capture page

This design does not change:

- Core business logic
- Finance rules
- API contracts
- Authentication flows
- Public invoice print layout unless needed for shell separation only

## Proposed UX Direction

### 1. App Shell Rebalance

The app shell should stop competing with page content for attention.

Changes:

- Reduce desktop sidebar width from the current oversized presentation to a slimmer operational width.
- Remove heavy internal framing inside the sidebar where possible. The sidebar should read as one navigation zone, not several stacked cards.
- Keep the sidebar visually distinct through subtle background and border treatment, not multiple decorative containers.
- Keep the top header shorter and calmer, with breadcrumbs and utility actions occupying less vertical space.
- Maintain sticky shell behavior, but reduce the feeling that the shell wraps the page in chrome.

Expected outcome:

- More horizontal space for tables and documents.
- Faster orientation without losing navigation clarity.
- Better emphasis on the page itself rather than on the shell furniture.

### 2. Page Rhythm And Hierarchy

Authenticated pages should reach the main working surface faster.

Changes:

- Replace oversized hero-style headers with compact command-center headers.
- Shorten page intros and descriptive copy.
- Reduce vertical padding between page sections.
- Use a clearer distinction between page header, summary strip, and primary data surface.
- Make the first actionable or data-bearing section visible earlier in the viewport on common laptop sizes.

Expected outcome:

- Users arrive at the table, ledger, or document content sooner.
- Summary information still exists, but no longer dominates the page.

### 3. Section Contrast Standard

Section separation should be easier to read at a glance.

Changes:

- Use more disciplined borders and surface tone changes between sections.
- Keep white working surfaces for primary content and use muted background tones only for secondary framing.
- Reduce reliance on large rounded containers and deep shadow stacks.
- Use smaller radii and lighter surface nesting.
- Ensure data surfaces such as ledgers and tables have the strongest structural clarity on the page.

Expected outcome:

- Users can visually identify the main content block immediately.
- Adjacent sections no longer blur together.
- The UI remains calm because contrast comes from structure, not heavy ornament.

### 4. Data-First Surface Rules

The most important pages in Bay Buddy are data-heavy. Those surfaces should get more room and clearer treatment than summary widgets.

Changes:

- Expand the visual dominance of tables, ledgers, line-item lists, and record views.
- Reduce decorative metric-card prominence when those cards do not directly support immediate action.
- Keep money values right-aligned and easy to scan.
- Use sticky headers, repeated context, or tighter wrappers where long financial tables need support.
- Keep primary actions near the object they affect without surrounding them with oversized presentation blocks.

Expected outcome:

- More of the screen is devoted to actionable data.
- Summary content supports the work instead of overshadowing it.

## Shared Design Rules

These rules should be implemented as reusable foundations for authenticated pages.

### Background

- Remove or substantially soften decorative full-page gradients in authenticated surfaces.
- Use a quiet canvas that increases contrast between page background and white work surfaces.
- Preserve the existing palette direction from `docs/DESIGN.md`.

### Radius

- Shift toward smaller radii for authenticated app sections and data wrappers.
- Reserve larger radii only where a reusable pattern truly benefits from emphasis.

### Shadows

- Use restrained shadows only where layering needs clarification.
- Prefer border definition over stacked glow-like elevation.

### Spacing

- Tighten shell padding and page gutters moderately.
- Tighten section spacing so related content stays grouped.
- Keep enough breathing room to preserve calm scanning.

### Typography

- Reduce oversized page-display typography on authenticated surfaces.
- Favor compact section titles and dense-but-readable supporting copy.
- Maintain strong numeric readability for financial values.

## Page-Specific Guidance

### Dashboard

- Keep the dashboard as a command center, not a showcase.
- Shorten the top summary band.
- Make queues, recent activity, and financial snapshot feel like the primary surfaces.
- Avoid dark or highly branded hero sections that dominate the page before the work queue.

### Customer Directory

- Replace the large introductory section with a more compact page header and search/action bar.
- Keep key metrics, but make the customer table the dominant visual surface.
- Reduce height and radius of summary cards.

### Customer Ledger

- Keep customer identity, balance state, and `Record Payment` immediately visible.
- Reduce oversized hero treatment around customer identity and current balance.
- Make the ledger table visually dominant and accessible earlier in the page.
- Preserve explicit optimistic, rollback, pending, and empty states.

### Invoices And Quotes

- Keep status, customer snapshot, and totals clearly grouped but compact.
- Emphasize document content and line items over decorative wrappers.
- Preserve lock-state clarity for invoices without oversized status presentation.

### Ticket Capture

- Preserve the review workflow, but avoid large framing that reduces preview or field area.
- Prioritize side-by-side preview and extracted values on desktop.
- Keep parse status and confirm action visible without excessive top-of-page exposition.

## Implementation Strategy

The redesign should be applied in shared layers first so improvements cascade naturally:

1. Shell and global authenticated-page foundations
2. Shared surface patterns and command-center wrappers
3. Dashboard and customer pages
4. Remaining finance detail pages and ticket capture

This keeps the change coherent and reduces the risk of page-by-page drift.

## Risks And Mitigations

### Risk: The redesign becomes too compact

Mitigation:

- Keep density moderate overall.
- Apply stronger compression only to data surfaces.
- Preserve readable line height and clear spacing between unrelated controls.

### Risk: Contrast fixes become visually harsh

Mitigation:

- Use balanced contrast with subtle background differences and disciplined borders.
- Avoid dark blocks or high-shadow separation as the default pattern.

### Risk: Shared-shell changes unintentionally affect non-target surfaces

Mitigation:

- Limit the redesign to authenticated shell and authenticated page patterns.
- Review login and public invoice surfaces separately before applying global changes there.

## Success Criteria

The redesign is successful when:

- Main content is visually identifiable within the first scan of the page.
- Authenticated pages show more useful work area on laptop screens.
- Tables, ledgers, and document content feel easier to read and less boxed in.
- Page headers no longer dominate the screen before the actual work begins.
- The product still feels calm, operational, and trustworthy rather than cramped or harsh.

## Files Likely Affected

Expected implementation will likely focus on:

- `apps/web/src/components/app-shell.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/components/command-center.tsx`
- `apps/web/src/components/financial-summary-dashboard.tsx`
- `apps/web/src/app/customers/page.tsx`
- `apps/web/src/components/customer-ledger-client.tsx`
- `apps/web/src/app/customers/[id]/page.tsx`
- `apps/web/src/app/invoices/page.tsx`
- `apps/web/src/app/invoices/[id]/page.tsx`
- `apps/web/src/app/quotes/[id]/page.tsx`
- `apps/web/src/app/tickets/capture/page.tsx`

## Out Of Scope For This Design

- New navigation features such as quick search implementation
- New dashboard metrics or business rules
- Backend changes
- Public marketing or branding work
