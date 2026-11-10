# CLAUDE.md - PickFlick Movie Swiping App
This file provides guidance to Claude Code (claude.ai/code) when working with the PickFlick movie swiping application.

## Standard Workflow
1. First, think through the problem, read the codebase for relevant files, and write a plan to /docs/todo.md.
2. The plan should have a list of todo items that you can check off as you complete them.
3. Before you begin working, check in with me and I will verify the plan.
Then, begin working on the todo items, marking them as complete as you go.
4. Finally, add a review section to the todo.md file with a summary of the changes you made and any other relevant information.

Periodically make sure to commit when it makes sense to do so and don't sign the commits from Claude.

Explain to me the concept you're using as use them (e.g. context in react)

## Development Commands
npm run dev - Start development server with Turbopack
npm run build - Build for production
npm run start - Start production server
npm run lint - Run ESLint
npm run types - Type check with TypeScript
npm run clean - Fix linting and format code
npm run db:generate - Generate a migration from db/schema changes
npm run db:migrate - Apply migrations to Neon (uses DATABASE_URL_UNPOOLED)
npm run db:seed - Seed database with initial data
npm run test - Run all tests (unit + e2e)
npm run test:unit - Run Jest unit tests
npm run test:e2e - Run Playwright e2e tests

## Architecture
This is a Next.js 16 app template with the following key integrations:

Authentication: Neon Auth (managed Better Auth, `@neon/auth`). Server instance in lib/auth/server.ts, client in lib/auth/client.ts, API proxy at app/api/auth/[...path]
Styling: Tailwind CSS v4 with shadcn/ui components (New York style) and OKLCH color system
UI Components: shadcn/ui configured with Lucide icons and path aliases (@/components, @/lib, etc.)
Database: Neon Postgres with Drizzle ORM (migrations in db/migrations; Neon Auth owns the neon_auth schema)
Key Configuration
Path Aliases: @/* maps to project root, with specific aliases for components, utils, ui, lib, and hooks
Fonts: Uses Geist Sans and Geist Mono with CSS variables
Proxy: proxy.ts (Next 16's renamed middleware) uses Neon Auth to protect /sessions, /friends, /movies, /history, /settings; marketing and auth pages stay public
Code Style: Prettier configured with no semicolons, double quotes, 2-space indentation, and custom import ordering

## Project Structure
/app/(marketing) - Public marketing pages with dedicated components
/app/dashboard - Protected dashboard area with sidebar navigation
/components/ui - shadcn/ui components
/db/schema - Drizzle schema definitions (customers table with membership tiers)
/actions - Server actions for data operations
/hooks - Custom React hooks

## Environment Setup
Copy .env.example to .env.local and configure:

DATABASE_URL - Neon pooled connection string
DATABASE_URL_UNPOOLED - Neon direct connection string (drizzle-kit)
NEON_AUTH_BASE_URL - Neon Auth URL (Console > Auth > Configuration)
NEON_AUTH_COOKIE_SECRET - 32+ character secret for session cookies (server-only)