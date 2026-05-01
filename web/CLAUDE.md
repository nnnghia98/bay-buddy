# Bay Buddy - Frontend Specific Guidelines

Refer to root `CLAUDE.md` and `/docs` for global architecture. This file focuses on the Next.js/Yarn stack.

## 🎨 UI & Styling

- **Components**: Use Radix UI primitives via **Shadcn UI**. Keep components atomic and reusable.
- **Styling**: Tailwind CSS only. Follow a mobile-first responsive approach.
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
