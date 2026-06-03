---
version: alpha
name: Bay Buddy Operations UI
description: Calm, high-trust operations interface for flight and debt management with Vietnamese-first financial workflows.
colors:
  primary: "#1B61C9"
  primary-strong: "#254FAD"
  primary-soft: "#EDF5FF"
  secondary: "#F6F8FB"
  muted: "#F3F7FC"
  neutral: "#FFFFFF"
  canvas: "#F4F7FA"
  canvas-highlight: "#F7F9FC"
  foreground: "#181D26"
  foreground-subtle: "#4A5565"
  border: "#E0E2E6"
  border-strong: "#CFD9E4"
  success: "#006400"
  danger: "#D53B3B"
  warning: "#F59E0B"
  sidebar: "#FBFCFE"
  sidebar-accent: "#EEF4FB"
  overlay-ink: "#181D26"
  chart-1: "#1B61C9"
  chart-2: "#3275DD"
  chart-3: "#254FAD"
  chart-4: "#12397B"
  chart-5: "#0B264F"
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: -0.02em
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0.01rem
  body-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0.01rem
  label-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.18em
  label-xs:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.16em
  mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0em
rounded:
  sm: 0.5rem
  md: 0.625rem
  lg: 0.75rem
  xl: 0.875rem
  card: 1.5rem
  full: 9999px
spacing:
  xs: 0.25rem
  sm: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.25rem
  2xl: 1.5rem
  3xl: 2rem
  4xl: 3rem
  panel-x: 1.25rem
  panel-y: 0.875rem
  page-section-gap: 1.5rem
  metric-card-padding: 1.25rem
components:
  page-background:
    backgroundColor: "{colors.canvas}"
  page-highlight:
    backgroundColor: "{colors.canvas-highlight}"
  panel:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "{spacing.panel-x}"
    typography: "{typography.body-sm}"
  panel-muted:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
  panel-border:
    backgroundColor: "{colors.border}"
  panel-border-strong:
    backgroundColor: "{colors.border-strong}"
  panel-header:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    typography: "{typography.label-xs}"
    padding: "{spacing.panel-y}"
  section-title:
    textColor: "{colors.foreground}"
    typography: "{typography.headline-md}"
  page-title:
    textColor: "{colors.foreground}"
    typography: "{typography.headline-lg}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.md}"
    typography: "{typography.body-sm}"
    height: 2.75rem
  button-primary-hover:
    backgroundColor: "{colors.chart-2}"
  button-outline:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    typography: "{typography.body-sm}"
  button-outline-active:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-strong}"
  input-default:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    typography: "{typography.body-sm}"
    height: 2.75rem
  table-header:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.foreground-subtle}"
    typography: "{typography.label-sm}"
  reference-number:
    textColor: "{colors.foreground}"
    typography: "{typography.mono-sm}"
  metric-card:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "{spacing.metric-card-padding}"
  status-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.full}"
  status-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.full}"
  status-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
  sidebar-shell:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.foreground}"
  sidebar-active-item:
    backgroundColor: "{colors.sidebar-accent}"
    textColor: "{colors.foreground}"
  dialog:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.card}"
    padding: "{spacing.2xl}"
  modal-overlay:
    backgroundColor: "{colors.overlay-ink}"
  chart-series-1:
    backgroundColor: "{colors.chart-1}"
  chart-series-3:
    backgroundColor: "{colors.chart-3}"
  chart-series-4:
    backgroundColor: "{colors.chart-4}"
  chart-series-5:
    backgroundColor: "{colors.chart-5}"
---

# Bay Buddy Design System

> Inspired by Airtable's "sophisticated simplicity". Last updated to reflect the v2 UI patterns shipped across dashboard, customers, invoices, settings, and ticket capture.

---

## 1. Visual Theme & Atmosphere

Bay Buddy is an **internal command center** for a Vietnamese travel finance team. The visual direction is **"Command Center, Calm Edition"**: white canvas, deep navy text, Airtable Blue accents, restrained shadows, and dense-but-not-cramped layouts.

**Key Characteristics**

| Token | Value |
|---|---|
| Primary text | `#181d26` (deep navy) |
| Primary CTA / link | `#1b61c9` (Airtable Blue) |
| Primary surface | `#ffffff` |
| Secondary surface | `#f6f8fb` (sidebar, muted backgrounds) |
| Border | `#e0e2e6` |
| Muted text | `rgba(4,14,32,0.69)` |
| Panel shadow | `0 1px 3px rgba(0,0,0,0.06)` |

---

## 2. Color Palette & Roles

### Semantic status colors (StatusChip)

| Tone | Border | Background | Text |
|---|---|---|---|
| `neutral` | `border-border` | `bg-secondary` | `text-muted-foreground` |
| `info` | `border-blue-200` | `bg-blue-50` | `text-blue-700` |
| `warning` | `border-amber-200` | `bg-amber-50` | `text-amber-800` |
| `success` | `border-emerald-200` | `bg-emerald-50` | `text-emerald-700` |
| `danger` | `border-rose-200` | `bg-rose-50` | `text-rose-700` |

Always pair color with text for status — never color alone.

---

## 3. Typography

| Role | Size | Weight | Tracking |
|---|---|---|---|
| Section eyebrow label | `text-[11px]` | `font-semibold` | `uppercase tracking-[0.16em] text-primary` |
| Panel header count/meta | `text-xs` | normal | `text-muted-foreground` |
| Table header | `text-sm` | normal | shadcn default |
| Body / table cell | `text-sm` | `font-medium` or normal | — |
| Financial amount | `text-sm` or `text-2xl` | `font-semibold` | `tracking-[-0.02em]` |
| Metric value | `text-2xl` | `font-semibold` | `tracking-[-0.02em]` |
| Metric label | `text-[11px]` | `font-semibold` | `uppercase tracking-[0.14em] text-primary` |
| Muted sub-label | `text-xs` or `text-[11px]` | normal | `text-muted-foreground` |
| Invoice / doc numbers | `font-mono text-sm font-medium` | — | — |

Positive letter-spacing (`tracking-[0.08em]`–`tracking-[0.28em]`) is required on all uppercase labels.

---

## 4. Layout System

### Spacing base: 8px

| Usage | Value |
|---|---|
| Panel internal padding (sides) | `px-5` |
| Panel header vertical padding | `py-3.5` |
| Table cell padding | `px-5 py-3.5` |
| Metric card padding | `p-5` |
| Card/panel gap | `gap-4` or `gap-6` |
| Page section gap | `space-y-6` |
| Page bottom padding | `pb-12` |

### Radius

| Element | Radius |
|---|---|
| Panel / white card | `rounded-xl` (12px) |
| Icon badge / avatar | `rounded-lg` (8px) or `rounded-[10px]` |
| Large dialog card | `rounded-[24px]` |
| Status chip | `rounded-full` |
| Button (default) | `rounded-[12px]` (from shadcn token) |
| Input | `rounded-[14px]` (from shadcn token) |

---

## 5. Component Patterns (v2 Standard)

These are the **canonical patterns** for authenticated app screens. Do not use `CommandPanel` or `CommandPanelHeader` for new screens.

### 5.1 Panel

A white rounded card that wraps a section of content.

```tsx
<div className="overflow-hidden rounded-xl border border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
  {children}
</div>
```

### 5.2 Panel Header Row

Sits at the top of every Panel. Contains a section eyebrow label on the left and optional meta (count, action) on the right.

```tsx
<div className="flex items-center justify-between border-b border-border px-5 py-3.5">
  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
    {sectionLabel}
  </p>
  <span className="text-xs text-muted-foreground">{meta}</span>
</div>
```

### 5.3 Section Header (above a Panel, not inside it)

Used for page sections that have a label + optional quick-link action floating above the panel.

```tsx
<div className="flex items-center justify-between pb-3">
  <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
    {title}
  </h2>
  {action}
</div>
```

### 5.4 Metric Card

Used in a 3-column `sm:grid-cols-3` strip at the top of directory and settings pages.

```tsx
<div className="overflow-hidden rounded-xl border border-border bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary text-primary">
    <Icon className="h-4 w-4" aria-hidden="true" />
  </div>
  <p className="mt-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
    {label}
  </p>
  <p className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-foreground">
    {value}
  </p>
</div>
```

### 5.5 Table (inside a Panel)

- Header row: `bg-secondary/40 hover:bg-secondary/40`
- Cell padding: `px-5 py-3.5`
- Row hover: `hover:bg-accent/45`
- Money values: right-aligned, `font-semibold`
- Dates: right-aligned, `text-xs text-muted-foreground`
- Document/reference numbers: `font-mono`

### 5.6 Avatar / Initials Badge

For customer and user rows in tables.

```tsx
// Preferred compact size
<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-accent text-xs font-semibold text-primary">
  {initials}
</div>
```

Do **not** use `h-12 w-12` in table rows — that is landing-page scale.

### 5.7 Icon Badge (for metric cards and status icons)

```tsx
<div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary text-primary">
  <Icon className="h-4 w-4" aria-hidden="true" />
</div>
```

### 5.8 Page Action Bar

Sits above the metric strip. Contains search (left) and primary action button (right).

```tsx
<div className="flex flex-wrap items-center justify-between gap-3">
  <div className="relative w-full max-w-xs">
    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <Input className="h-9 pl-9 text-sm" placeholder={...} />
  </div>
  <Button size="sm">
    <Plus className="h-4 w-4" />
    {actionLabel}
  </Button>
</div>
```

### 5.9 Empty State (inside Panel)

```tsx
<div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-secondary text-muted-foreground">
    <Icon className="h-4 w-4" aria-hidden="true" />
  </div>
  <p className="text-sm text-muted-foreground">{emptyMessage}</p>
</div>
```

### 5.10 Card (interactive, for shortcuts and action links)

```tsx
<Link
  href={href}
  className="group flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3.5 transition-all duration-150 hover:border-primary/25 hover:bg-accent/45 hover:shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
>
  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-primary transition-colors group-hover:border-primary/20 group-hover:bg-white">
    <Icon className="h-4 w-4" aria-hidden="true" />
  </span>
  <span className="min-w-0 flex-1">
    <span className="block text-sm font-medium text-foreground">{label}</span>
    <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">{description}</span>
  </span>
  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
</Link>
```

### 5.11 Loading State (inside table)

```tsx
<TableRow>
  <TableCell className="py-16 text-center" colSpan={colCount}>
    <div className="flex flex-col items-center gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{loadingLabel}</span>
    </div>
  </TableCell>
</TableRow>
```

### 5.12 Restricted Access State

```tsx
<div className="overflow-hidden rounded-xl border border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
  <div className="flex items-start gap-4 px-5 py-8">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-amber-200 bg-amber-50 text-amber-800">
      <ShieldOff className="h-5 w-5" aria-hidden="true" />
    </div>
    <div>
      <h1 className="text-base font-semibold text-foreground">{title}</h1>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  </div>
</div>
```

---

## 6. Buttons

| Use | Variant | Notes |
|---|---|---|
| Primary action (create, save, confirm) | `default` (blue) | One per work area |
| Secondary navigation or cancel | `outline` | |
| Destructive (delete, deactivate) | `default` with `bg-red-600 hover:bg-red-700` class | Must be explicit red |
| In-row view/detail link | `ghost` size `sm` | Recedes until hovered |
| Icon-only action in table | `ghost` size `icon` | `h-8 w-8`, recedes until hovered |

**Always add a `Loader2` spinner in submit buttons when a mutation is pending.**

```tsx
<Button disabled={isPending} type="submit">
  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isPending ? pendingLabel : idleLabel}
</Button>
```

---

## 7. Cards vs. Panels (Hover Rule)

- **Static panels** (`Panel`, metric cards, table wrappers): **no hover transform**. They are containers, not actions.
- **Interactive cards** (shortcut links, action links, `Card` with `onClick`): apply `hover:-translate-y-0.5` and `hover:shadow-md`.
- The `Card` shadcn component auto-detects interactivity via `onClick` or `role="button"` — only those receive hover animation.

---

## 8. Ticket Capture — Two-Column Sticky Layout

- Left column: file upload card. **Sticky** (`lg:sticky lg:top-6`) so the document preview stays visible while reviewing form fields.
- Right column: form split into logical Card groups (transaction info, flight details, passengers, confirm action bar).
- AI-extracted fields: highlight with `border-primary/20 bg-primary/5`.
- Paste from clipboard (`Ctrl+V`) should be supported alongside drag-and-drop.
- Parsing overlay: absolute overlay on the dropzone with `backdrop-blur-sm` and `Loader2`.
- Confirm bar: sticky at the bottom of the form with a clear "Xác nhận tạo công nợ" label.

---

## 9. Dashboard Layout

- **Top row**: 3-column metric strip (`sm:grid-cols-3`). Revenue card includes the cutoff date control co-located inside it.
- **Main two-column**: left (`xl:col-span-~1.4`) = work queues + top debtors. Right (`xl:col-span-~0.6`) = shortcuts + snapshot metadata.
- **Full-width bottom**: recent activity table.
- Section labels float **above** their panels as `SectionHeader`, not inside `CommandPanelHeader`.
- Use `AlertTriangle` icon on high/medium severity queues.

---

## 10. Do's and Don'ts

### Do

- Use `Panel` + `Panel Header Row` for all data sections.
- Use `SectionHeader` (above panel) for named sections with optional quick-link.
- Use `MetricCard` with icon badge for summary stats.
- Use `font-mono` for invoice/PNR/reference numbers.
- Use `font-semibold` for financial amounts.
- Use `text-[11px] font-semibold uppercase tracking-[0.16em] text-primary` for all eyebrow/section labels.
- Add `pb-12` to every authenticated page root wrapper.
- Use `space-y-6` between major page sections.
- Show `Loader2` spinner in all pending button states.

### Don't

- Don't use `CommandPanel` or `CommandPanelHeader` for new screens. They are legacy.
- Don't use `h-12 w-12` avatar in table rows (use `h-9 w-9`).
- Don't hardcode user-facing strings — use `t()` from `next-international`.
- Don't use color-only status signals — always pair with text.
- Don't add hover transforms to static container panels.
- Don't put a large hero header section at the top of authenticated work pages.
- Don't use `py-5` for table row cells — use `py-3.5`.
