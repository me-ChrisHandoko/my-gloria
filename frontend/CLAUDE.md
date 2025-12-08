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

- **Next.js 16** with App Router (production-ready, requires v16.0.7+ for security patches)
  - **Turbopack** (stable) - default bundler with 10x faster Fast Refresh, 2-5x faster builds
  - **Cache Components** - explicit opt-in caching with `use cache` directive
  - **React Compiler** (stable) - automatic component memoization, no manual useMemo/useCallback needed
  - **proxy.ts** - use for network boundary (Node.js runtime), replaces middleware.ts
  - **React 19.2** integration - View Transitions, useEffectEvent, Activity components
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
