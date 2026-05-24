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
elevation:
  flat: "none"
  subtle: "{shadows.sm}"
  raised: "{shadows.md}"
  floating: "{shadows.xl}"
motion:
  duration-fast: 150ms
  duration-base: 200ms
  duration-slow: 300ms
  easing-standard: cubic-bezier(0.2, 0, 0, 1)
  hover-lift-distance: 0.125rem
shadows:
  sm: "0 1px 2px rgba(15,23,42,0.04), 0 0 0 1px rgba(255,255,255,0.72) inset"
  md: "0 1px 2px rgba(0,0,0,0.08), 0 1px 3px rgba(45,127,249,0.28), 0 10px 30px -24px rgba(15,48,106,0.35)"
  lg: "0 1px 2px rgba(0,0,0,0.08), 0 1px 3px rgba(45,127,249,0.28), 0 20px 40px -28px rgba(15,48,106,0.28)"
  xl: "0 1px 2px rgba(0,0,0,0.08), 0 1px 3px rgba(45,127,249,0.28), 0 28px 50px -32px rgba(15,48,106,0.24)"
components:
  page-background:
    backgroundColor: "{colors.canvas}"
  panel:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "{spacing.panel-x}"
  panel-header:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    typography: "{typography.label-xs}"
    padding: "{spacing.panel-y}"
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
  metric-card:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "{spacing.metric-card-padding}"
  dialog:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.card}"
    padding: "{spacing.2xl}"
---

## Overview

Bay Buddy uses a calm operations aesthetic: light canvas, deep navy text, and disciplined blue accents. The UI is optimized for long daily sessions in ticketing and finance workflows, so contrast, scanability, and status clarity are prioritized over decorative expression.

The product should feel trustworthy and procedural. Dense data is expected, but spacing and hierarchy prevent visual fatigue. The visual tone is Vietnamese-first internal tooling: practical, steady, and transparent about financial state.

## Colors

The palette is neutral-first with one interaction accent family.

- Primary blue anchors actionable controls, links, and section eyebrows.
- White and cool gray surfaces separate content layers without heavy contrast jumps.
- Borders are soft but always present to preserve table and panel structure.
- Semantic colors are explicit for success and danger financial outcomes.
- Chart tones are monochromatic blue steps to avoid visual noise in reporting.

Color usage intent:
- Reserve saturated blue for priority actions and active emphasis.
- Keep most large surfaces white or soft gray.
- Use red only for destructive or debt-risk signaling, never as a decorative accent.

## Typography

Typography is straightforward and operational.

- `Inter` is the default interface face for readability and predictable spacing.
- Headings use mild negative tracking for compact confidence.
- Body text remains at 14-16px equivalents with generous line height for table-heavy screens.
- Uppercase micro-labels (11-12px) establish section scaffolding and metadata rhythm.
- `JetBrains Mono` is reserved for references like invoice numbers, PNR, and ticket identifiers.

## Layout

Layout follows a practical grid with consistent rhythm:

- Page flow commonly uses action bar -> metric strip -> panelized data table.
- Vertical section rhythm centers around `1.5rem` spacing.
- Panels use `px-5` / `py-3.5` equivalents for dense but breathable data surfaces.
- Data tables are the default for ledger and finance views, with right-aligned monetary columns.
- Mobile behavior preserves structure first, then compresses controls and wraps actions.

## Elevation & Depth

Depth is subtle and functional.

- Most containers use low-elevation shadows to separate white layers on cool canvases.
- Hover states rely on tiny lift and shadow increase (`~2px`) rather than dramatic movement.
- Dialogs and sheets combine stronger blur/backdrop with larger elevation to clearly detach from transactional tables.

## Shapes

Shape language is rounded and precise, not soft/playful.

- Primary control radius is around 10-14px.
- Panels and metric cards use 12px corners.
- Dialog surfaces use larger 24px corners for modal prominence.
- Chips and compact statuses use full-radius pills.

## Components

Core component behavior:

- Buttons: primary buttons are blue with subtle lift on hover; outline buttons keep white surfaces with border emphasis.
- Inputs: white background, visible border, soft shadow, and ring-based focus clarity.
- Panels: white cards with stable borders and restrained elevation, typically with an uppercase eyebrow header.
- Tables: uppercase compact headers, muted metadata text, and clear row hover surfaces.
- Metric cards: icon badge + uppercase label + high-emphasis value.
- Dialogs: centered, rounded, high-elevation cards with dimmed blurred backdrop.

State treatment:

- Pending states must be explicit with spinner and disabled controls.
- Error states should remain legible and specific, with danger color only where meaningfully required.
- Optimistic rows may appear immediately in ledgers but must reconcile cleanly with confirmed results.

## Do's and Don'ts

- Do keep dense finance information easy to scan with strict alignment and consistent spacing.
- Do keep one primary action emphasis per region.
- Do use monospace tokens for identifiers and right alignment for currency.
- Do preserve explicit status semantics for debt, payment, and lock states.
- Do use subtle motion and honor reduced-motion preferences.
- Don't introduce decorative gradients, loud color accents, or marketing-style hero treatments.
- Don't remove borders from data-heavy panels and tables.
- Don't rely on color alone to encode status.
- Don't mix multiple corner-radius philosophies on the same screen.
