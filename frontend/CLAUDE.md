# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16.1.1 frontend application using:

-   **React 19.2.3** with TypeScript 5
-   **Tailwind CSS 4** for styling via PostCSS
-   **App Router** architecture (Next.js 16 pattern)
-   **Geist font family** (Sans and Mono variants)

## Development Commands

### Run Development Server

```bash
npm run dev
```

Starts the Next.js development server at http://localhost:3000 with hot reload enabled.

### Build for Production

```bash
npm run build
```

Creates an optimized production build in `.next/` directory.

### Start Production Server

```bash
npm start
```

Runs the production build. Must run `npm run build` first.

### Linting

```bash
npm run lint
```

Runs ESLint with Next.js configuration (core-web-vitals + TypeScript rules).

## Architecture

### App Router Structure

This project uses Next.js App Router (introduced in Next.js 13):

-   `app/layout.tsx` - Root layout component that wraps all pages with Geist fonts
-   `app/page.tsx` - Home page component (replaces pages/index.tsx pattern)
-   `app/globals.css` - Global Tailwind styles

### TypeScript Configuration

-   Path alias configured: `@/*` maps to project root
-   Strict mode enabled
-   Target: ES2017 with ESNext modules
-   JSX mode: `react-jsx` (uses automatic runtime)

### Styling

Tailwind CSS 4 configured via PostCSS plugin (`@tailwindcss/postcss`). The project uses Tailwind's utility classes with dark mode support.

### Font Strategy

Uses `next/font/google` to optimize loading of Geist font family:

-   Variables: `--font-geist-sans` and `--font-geist-mono`
-   Applied via className in root layout

## Important Patterns

### Component Creation

-   Place new page components in `app/` directory following App Router conventions
-   Use Server Components by default (no 'use client' directive needed)
-   Add 'use client' directive only for components requiring interactivity/hooks

### Image Optimization

Use Next.js `<Image>` component from `next/image` for automatic optimization, as seen in `app/page.tsx:1`.

### Metadata

Export `metadata` object from layout/page files for SEO (see `app/layout.tsx:15-18`).

### Dark Mode

The project has dark mode styling using Tailwind's `dark:` variant. Apply both light and dark styles when creating components.
