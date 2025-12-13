# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Tech Stack

- **Next.js 16** with App Router (production-ready, v16.0.7 installed)
  - ✅ **Turbopack** (stable) - enabled via `--turbo` flag, provides 10x faster Fast Refresh, 2-5x faster builds
  - ✅ **React Compiler** (stable) - enabled in next.config.ts, automatic component memoization active
  - ⚠️ **Cache Components** - available but not yet implemented (use `use cache` directive for opt-in caching)
  - ℹ️ **proxy.ts** - not needed (Clerk handles authentication, no custom middleware requirements)
  - ⚠️ **React 19.2** integration - React 19.2.0 installed, but advanced hooks (useEffectEvent, View Transitions, Activity components) not yet utilized
- **React 19**
- **TypeScript** (strict mode)
- **Tailwind CSS 4** with shadcn/ui theming (sidebar-07 layout)
- **Clerk** for authentication (@clerk/nextjs)
- **Redux Toolkit** + **RTK Query** + React Redux for state management and data fetching
- **Lucide React** for icons

## Architecture

This is a Next.js App Router project:

- `src/app/` - App Router pages and layouts
- `src/lib/utils.ts` - Utility functions including `cn()` for class merging

## Path Aliases

Use `@/*` to import from `src/*`:
```typescript
import { cn } from "@/lib/utils";
```

## Styling

Uses shadcn/ui theming pattern with Tailwind CSS v4:

- **Dark mode**: Class-based via `.dark` class (not `prefers-color-scheme`)
- **CSS variables**: Defined in `globals.css` using OKLCH color space
- **`cn()` utility**: Use for conditional class merging with `clsx` + `tailwind-merge`
- **CVA**: Use `class-variance-authority` for component variants

Semantic color tokens: `primary`, `secondary`, `muted`, `accent`, `destructive`, `card`, `popover`, `sidebar`, `chart-1` through `chart-5`
