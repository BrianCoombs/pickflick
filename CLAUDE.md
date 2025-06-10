# CLAUDE.md - PickFlick Movie Swiping App
This file provides guidance to Claude Code (claude.ai/code) when working with the PickFlick movie swiping application.

## Standard Workflow
1. First, think through the problem, read the codebase for relevant files, and write a plan to /docs/todo.md.
2. The plan should have a list of todo items that you can check off as you complete them.
3. Before you begin working, check in with me and I will verify the plan.
Then, begin working on the todo items, marking them as complete as you go.
4. Finally, add a review section to the todo.md file with a summary of the changes you made and any other relevant information.

Periodically make sure to commit when it makes sense to do so.

Explain to me the concept you're using as use them (e.g. context in react)

## Development Commands
npm run dev - Start development server with Turbopack
npm run build - Build for production
npm run start - Start production server
npm run lint - Run ESLint
npm run types - Type check with TypeScript
npm run clean - Fix linting and format code
npm run db:local - Start local Supabase database
npx drizzle-kit push - Push schema changes to database
npm run db:seed - Seed database with initial data
npm run test - Run all tests (unit + e2e)
npm run test:unit - Run Jest unit tests
npm run test:e2e - Run Playwright e2e tests

## Architecture
This is a Next.js 15 app template with the following key integrations:

Authentication: Clerk is integrated at the root layout level with middleware protecting /dashboard routes
Styling: Tailwind CSS v4 with shadcn/ui components (New York style) and OKLCH color system
UI Components: shadcn/ui configured with Lucide icons and path aliases (@/components, @/lib, etc.)
Database: PostgreSQL with Drizzle ORM (uses npx drizzle-kit push for schema changes)
Key Configuration
Path Aliases: @/* maps to project root, with specific aliases for components, utils, ui, lib, and hooks
Fonts: Uses Geist Sans and Geist Mono with CSS variables
Middleware: Clerk middleware protects all /dashboard routes while allowing public access to marketing and auth pages
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

DATABASE_URL - PostgreSQL connection string
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY - Clerk public key
CLERK_SECRET_KEY - Clerk secret key
Authentication URLs are pre-configured in .env.example