---
version: beta
name: Bay Buddy Operations UI
design_system: Astryx
theme: neutral
description: Calm, high-trust operations UI for Vietnamese flight and debt workflows.
---

# Bay Buddy Design System

This document is the source of truth for Bay Buddy visual design. `docs/UX.md`
owns flow and behavior. General frontend skills may help with craft, but these
project rules win when guidance conflicts.

Bay Buddy uses **Astryx Design with the default Neutral theme**. Do not recreate
the old blue palette or add a Bay Buddy color override. The default theme,
semantic tokens, component states, light mode, and dark mode are canonical.

## 1. Required foundation

The web root must load Astryx in this order:

```tsx
import "@astryxdesign/core/reset.css"
import "@astryxdesign/core/astryx.css"
import "@astryxdesign/theme-neutral/theme.css"
import "./globals.css"
```

The application must be inside the Neutral theme provider:

```tsx
<Theme mode={mode} theme={neutralTheme}>
  {children}
</Theme>
```

`mode` is `light`, `dark`, or `system`. The default is `system`. Users can
change it from the login page or the authenticated user menu. Light and dark
preferences persist in browser storage; choosing system clears the override
and follows the device setting.

Use these packages:

- `@astryxdesign/core` for components and layout primitives.
- `@astryxdesign/theme-neutral` for the default theme.
- `@astryxdesign/cli` to inspect components, templates, and conventions.
- CSS Modules for product-specific layout that Astryx props do not cover.

Before using an unfamiliar component, inspect it with the CLI:

```bash
npx @astryxdesign/cli build "<screen or workflow>"
npx @astryxdesign/cli component <ComponentName>
npx @astryxdesign/cli docs <topic>
```

## 2. Styling order

Use the first option that solves the need:

1. Astryx component.
2. Astryx component props.
3. Shared Bay Buddy component backed by Astryx.
4. CSS Module using Astryx semantic tokens.

Do not use utility-class styling. Do not add a second design-system layer.
Avoid inline `style` values unless a runtime value cannot be expressed by a
class, such as a calculated sticky table offset.

The main shared UI modules are:

- `components/command-center.tsx`: `Panel`, `MetricCard`, `StatusChip`,
  `EmptyState`, `TableScrollArea`, and section helpers.
- `components/operations-ui.tsx`: form, detail, avatar, select, and restricted
  access patterns.
- `components/ui/*`: Bay Buddy compatibility components implemented with
  Astryx or semantic token CSS.
- `styles/ui-patterns.module.css`: common layout and text patterns.

Prefer direct Astryx components for new work. Use compatibility components when
they preserve an existing form or table API cleanly.

## 3. Neutral theme and color

Always use semantic roles. Never copy a theme value into application CSS.

| Role | Token |
|---|---|
| Page canvas | `--color-background-body` |
| Working surface | `--color-background-surface` |
| Quiet group | `--color-background-muted` |
| Main text | `--color-text-primary` |
| Supporting text | `--color-text-secondary` |
| Accent text | `--color-text-accent` |
| Primary action | `--color-accent` |
| Content on primary action | `--color-on-accent` |
| Standard border | `--color-border` |
| Strong input border | `--color-border-emphasized` |
| Hover overlay | `--color-overlay-hover` |
| Selected or extracted field | `--color-accent-muted` |

The default Neutral accent is monochrome. Blue is not the Bay Buddy primary
color. Blue, green, orange, and red are reserved for semantic information.

### Status roles

Use Astryx `Token`, `Banner`, or the shared `StatusChip`.

| Meaning | Astryx role |
|---|---|
| Informational | `blue` / `info` |
| Success or active | `green` / `success` |
| Warning or review needed | `orange` / `warning` |
| Error or destructive | `red` / `danger` |
| Neutral state | `gray` / `neutral` |

Every status must include text. Never encode financial meaning with color alone.

## 4. Typography

Use Astryx `Heading` and `Text` where practical. In CSS Modules, use the theme
type tokens:

| Role | Tokens |
|---|---|
| Main page title | `--text-heading-1-*` or `--text-heading-2-*` |
| Section title | `--text-heading-4-*` |
| Body | `--text-body-*` |
| Label | `--text-label-*` |
| Supporting text | `--text-supporting-*` |
| Large metric | `--text-large-*` |

Rules:

- Use `--font-family-body` and `--font-family-heading` from the theme.
- Use `--font-family-code` for PNRs, invoice numbers, ticket numbers, IDs, and
  other references.
- Use tabular numbers for money, balances, quantities, and dates.
- Right-align money in forms and tables.
- Use compact headings on authenticated screens. Landing-page typography does
  not belong in the operations app.
- Uppercase eyebrow labels are optional. When used, keep them short and use
  semantic text tokens rather than a custom color.

## 5. Spacing, size, shape, and elevation

Astryx spacing follows a 4 px base:

| Token | Size |
|---|---:|
| `--spacing-1` | 4 px |
| `--spacing-2` | 8 px |
| `--spacing-3` | 12 px |
| `--spacing-4` | 16 px |
| `--spacing-5` | 20 px |
| `--spacing-6` | 24 px |
| `--spacing-8` | 32 px |
| `--spacing-10` | 40 px |
| `--spacing-12` | 48 px |

Default control heights are `--size-element-sm`, `--size-element-md`, and
`--size-element-lg`. Do not recreate control height with local pixel values.

Use the Neutral shape tokens:

| Token | Use |
|---|---|
| `--radius-inner` | Inner and very compact details |
| `--radius-element` | Inputs, buttons, nested controls |
| `--radius-container` | Panels, cards, dialogs, grouped blocks |
| `--radius-page` | Rare large page-level framing |
| `--radius-full` | Tokens and circular affordances |

Use `--shadow-low`, `--shadow-med`, or `--shadow-high` only when elevation
communicates layering. Static work panels normally stay flat. Do not add hover
lift to a non-interactive container.

Functional widths, table minimum widths, print sizes, and sticky offsets may use
explicit `rem`, `px`, or calculated values inside a local CSS Module.

## 6. Layout rules

### App shell

- Use Astryx `AppShell`, `SideNav`, `TopNav`, `Breadcrumbs`, and related shell
  primitives.
- The Bay Buddy logo links to `/`; do not duplicate Home in the sidebar.
- Keep the top bar focused on breadcrumbs and the user menu.
- Do not show placeholder utilities.
- Mobile navigation must expose the same main work areas.

### Standard page

- Use a simple vertical stack with a `24 px` major-section gap.
- Avoid an intro card when breadcrumbs and controls already explain the page.
- Add a page heading only when it improves orientation.
- Add metric cards only when the values change the next decision.

### Operational workbench

`/debts/input` is the reference for data entry beside a table:

- Two columns on desktop, one column on narrow screens.
- Form on the left and related table or ledger on the right.
- Keep the primary action attached to the form.
- Keep long desktop forms scroll-contained.
- Keep filters attached to the table.
- Use dense rows and small action columns.
- Do not add a hero, summary strip, or repeated panel title.

Specialized grid and sticky behavior belongs in a page-level CSS Module using
theme tokens.

## 7. Component rules

### Cards and panels

- Use Astryx `Card` for dashboard widgets, settings groups, and meaningful
  bounded content.
- Use `ClickableCard` only for real navigation or actions.
- Use shared `Panel` for a table, workbench, or finance document container.
- Do not wrap each list or table row in a Card.
- Avoid nested cards. A border, divider, or muted surface is usually enough.

### Buttons

| Bay Buddy use | Variant |
|---|---|
| Save, create, confirm | `primary` (`default` in the compatibility wrapper) |
| Cancel, filter, secondary navigation | `secondary` (`outline`) |
| Low-emphasis row action | `ghost` |
| Delete, wipe, irreversible action | `destructive` |

Use one dominant action per work area. Icon-only buttons require `aria-label`
and `title`. Pending actions must be disabled or use Astryx loading state and
show a clear in-flight label.

### Forms

- Use Astryx form components or the shared `Input`, `Textarea`, `Label`, and
  token-based select style.
- Labels are required; placeholders are examples, not labels.
- Required fields must use the field wrapper's `isRequired` state, a visible
  semantic marker, and native input validation. Optional fields must not show a
  required marker.
- Keep errors next to the field and use `role="alert"` when appropriate.
- Use the same Zod schema across client and server boundaries.
- Use semantic state styling for parsed or selected fields.
- Optional controls start inactive until the user chooses the enabling option.
- Native date controls must remain usable in light and dark mode.

### Tables

- Tables are the default for financial and ledger records.
- Use a muted header background and semantic borders.
- Keep rows dense but readable.
- Right-align money and use tabular numbers.
- Use monospace for reference values.
- Long operational tables may use sticky headers and sticky edge columns.
- Use horizontal containment on narrow screens.
- Row action columns are sized to their controls.
- Use `EmptyState` or `TableStateRow` for empty, loading, and error states.

### Dialogs and feedback

- Use Astryx `Dialog` through the shared dialog API while legacy call sites
  remain.
- Dialog width must match content; avoid oversized modal framing.
- Use Astryx `Banner` for persistent success, warning, and error feedback.
- Use toasts for short action confirmation.
- Every mutation surface must expose pending, success, error, and rollback or
  recovery states where relevant.

### Icons and avatars

- Use `lucide-react` icons through Astryx `Icon` where possible.
- Keep inline control icons at the theme small icon size.
- Use Astryx `Avatar` or `InitialsAvatar` for people.
- Icons support labels; they do not replace labels for unfamiliar actions.

## 8. Product recipes

### Dashboard

- Lead with work that needs attention.
- Use metrics only for receivables, credit/deposit, revenue, or margin that
  affect daily decisions.
- Label confirmed ticket `selling_price` totals as ticket sales and
  `true_income` totals as true income. Do not present true income as net profit.
- Keep recent activity in a dense table.
- Shortcuts use `ClickableCard`, not decorative cards.

### Customer directory and ledger

- Keep search and create actions together.
- Show current balance near customer identity and payment action.
- Label negative balance as `Tiền dư / Đặt cọc`.
- Preserve running balance visibility.
- History timestamps use `created_at` or `updated_at`, never `flight_date`.
- Optimistic payments must reconcile or roll back clearly.

### Ticket entry

- Keep file preview and review form side by side on desktop.
- Support upload, drag-and-drop, and clipboard paste.
- Use a visible parsing overlay and Astryx feedback banners.
- Treat AI values as suggestions until staff confirms them.
- Make the resulting công nợ impact explicit at save time.

### Invoices and quotes

- Put document number, status, customer snapshot, total, and primary action
  above line items.
- Mark `ISSUED` and `PAID` invoices as locked.
- Make clear that quotes do not affect công nợ until conversion.
- Public invoice pages are print-first and do not use the app shell.

### Settings and data center

- Show restricted access with an explicit state, not a blank page.
- Use status tokens for users and data scope.
- Destructive database actions use a red Astryx surface, explicit confirmation,
  and a destructive button.

### Workbook editor

- Keep table controls close to the table.
- Use edge-to-edge dense rows inside one container.
- Sticky columns and formula previews may use specialized token-based CSS.
- Show conflicts and unsaved state explicitly.

## 9. Responsive, accessibility, and print

- Start with a single-column layout and add columns when space supports them.
- Never let a wide table break the viewport.
- Keep touch targets at Astryx control sizes.
- Preserve visible keyboard focus.
- Respect reduced motion preferences.
- Use semantic headings, labels, table structure, and live/error regions.
- Normal text must meet 4.5:1 contrast.
- Print views hide app controls and use stable document spacing.

## 10. Implementation checklist

- Astryx core reset, core CSS, and Neutral theme CSS are loaded.
- The root uses `neutralTheme` with the saved light, dark, or system mode.
- No local color palette overrides the Neutral theme.
- No utility-class styling or legacy design-system dependency is added.
- Custom CSS uses semantic Astryx tokens.
- Components and props are used before custom CSS.
- User-facing copy uses `next-international`.
- Money is right-aligned and tabular.
- Reference values use the code font.
- Status always has a text label.
- Static panels do not move on hover.
- Destructive actions use the destructive role.
- Loading, empty, success, error, locked, optimistic, and rollback states are
  handled where relevant.
- Icon-only controls have accessible names.
- Desktop and mobile layouts remain usable.
