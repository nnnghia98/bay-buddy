# Bay Buddy - Frontend Specific Guidelines

Refer to root `CLAUDE.md` and `/docs` for global architecture. This file focuses on the Next.js/Yarn stack.

## 🎨 UI & Styling

- **Components**: Use **Astryx Design** with `@astryxdesign/theme-neutral`. Keep components atomic and reusable.
- **Styling**: Use component props first, then token-based CSS Modules for specialized layout. Follow a mobile-first responsive approach.
- **Icons**: Use `lucide-react`.

## ⚛️ React & Next.js Patterns

- **Server vs Client**: Use Server Components by default. Use `'use client'` only for interactivity.
- **Forms**: Use `react-hook-form` with `zod` for validation. Sync schemas with `../api/models`.
- **Data Fetching**: Use **TanStack Query (v5)** for mutations and client-side fetching. No `useEffect` for data.

## 🌐 i18n

- Use `next-international` for all strings.
- Example: `const t = useScopedI18n('ticket.form')`.

## 🚀 Commands

- `yarn web` (from project root) or `yarn dev --port 6769`: Start development server.
- `yarn build`: Build for production.

<!-- ASTRYX:START -->
Astryx v0.1.9 · 153 components
CLI: run every command as `yarn astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in your app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — discover, don't guess. Before writing UI:
1. `astryx build "<idea>"` — START HERE: returns a kit (closest [page] + [block]s + [component]s). No args = full playbook.
2. `astryx template <name> [--skeleton]` — scaffold the [page]/[block]s it named, or study their layout. Templates are reference code.
3. `astryx component <Name>` — props + examples for every component you use.

RULES:
- No <div> — components do all layout/spacing. Full page → AppShell; sidebar nav → SideNav.
- Frame first: pick the shell (AppShell / Layout+LayoutPanel) and budget regions in px BEFORE writing content (`astryx docs layout`).
- Dense data = rows (Table, List/Item) edge-to-edge — never Card-wrapped list items. Card = dashboard widgets, galleries, settings groups only.
- Status → StatusDot/Token; Badge only for counts and enumerated states, never decoration.
- Custom styling: component props first; else CSS Modules backed by Astryx semantic tokens. No local color palette.
- Tokens for every value (`astryx docs tokens`). Brand/accent via `astryx theme` — never override --color-* in :root.
- SELF-CHECK before you finish: re-read the file and replace avoidable inline styles, utility-class strings, and local palette values with an Astryx component, prop, or semantic token in a CSS Module. If unsure a component or prop exists, run `astryx component <Name>` / `astryx search "<thing>"`.

MORE CLI:
  search "<query>"   find any component / hook / doc / template / block
  component --list   153 components by category
  template --list    page + block recipes
  docs <topic>       color, elevation, icons, illustrations, internationalization, layout, migration, motion, principles, shape, spacing, styling, theme, tokens, typography
  swizzle <Name>     eject component source for deep customization
  upgrade --apply    run after any @astryxdesign/core bump
<!-- ASTRYX:END -->
