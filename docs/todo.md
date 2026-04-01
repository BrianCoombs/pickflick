# Clerk to Supabase Auth Migration

## Phase 0: Setup
- [x] Create branch `feat/supabase-auth`
- [x] Install `@supabase/supabase-js` and `@supabase/ssr`
- [x] Uninstall `@clerk/nextjs`, `@clerk/backend`, `@clerk/themes`
- [ ] User: Enable Email auth in Supabase Dashboard, add callback URL, get service role key

## Phase 1: Create Supabase Auth Utilities (new files)
- [x] `/lib/supabase/client.ts` — browser client
- [x] `/lib/supabase/server.ts` — server client + `getAuthenticatedUser()` helper
- [x] `/lib/supabase/middleware.ts` — session refresh utility
- [x] `/app/auth/callback/route.ts` — PKCE callback
- [x] `/app/(auth)/login/actions.ts` — server actions (login, signup, signout)
- [x] `/hooks/use-user.ts` — custom hook replacing Clerk's useUser()

## Phase 2: Core Swap
- [x] `/middleware.ts` — replace Clerk middleware with Supabase
- [x] `/app/layout.tsx` — remove ClerkProvider, use Supabase server client

## Phase 3: Replace Auth in All Pages
- [x] `/app/(auth)/login/page.tsx` — custom login form (shadcn/ui)
- [x] `/app/(auth)/signup/page.tsx` — custom signup form (shadcn/ui)
- [x] `/components/header.tsx` — replace Clerk components
- [x] `/components/sidebar/nav-user.tsx` — replace Clerk useUser + UserButton
- [x] `/components/utilities/posthog/posthog-user-identity.tsx` — swap useUser hook
- [x] `/actions/db/movies-actions.ts` — replace 11 auth() calls
- [x] `/app/api/sessions/[sessionId]/participants/route.ts` — replace auth()
- [x] `/app/sessions/page.tsx` — replace auth()
- [x] `/app/sessions/[sessionId]/page.tsx` — replace auth()
- [x] `/app/sessions/[sessionId]/match/page.tsx` — replace auth()
- [x] `/app/(marketing)/pricing/page.tsx` — replace auth()

## Phase 4: Cleanup
- [x] Remove Clerk env vars from `.env` and `.env.local`
- [x] Update `CLAUDE.md`
- [x] Update `.cursor/rules/auth.mdc`
- [x] Update `.cursor/rules/general.mdc`
- [x] Update `.cursorrules`

## Phase 5: Verification
- [x] `tsc --noEmit` passes (zero errors)
- [x] `npm run build` succeeds
- [ ] Manual test: signup, login, logout, protected routes (requires Supabase Dashboard setup)

## Review

### Summary of Changes

**Removed:** 3 Clerk packages (`@clerk/nextjs`, `@clerk/backend`, `@clerk/themes`) and all Clerk-specific code (ClerkProvider, SignIn/SignUp components, UserButton, SignedIn/SignedOut conditionals, clerkMiddleware).

**Added:** 2 Supabase packages (`@supabase/supabase-js`, `@supabase/ssr`) and 6 new files:
- `/lib/supabase/client.ts` — browser client (singleton, for client components)
- `/lib/supabase/server.ts` — server client + `getAuthenticatedUser()` helper (for server components/actions)
- `/lib/supabase/middleware.ts` — session refresh + route protection using `getClaims()` (local JWT validation)
- `/app/auth/callback/route.ts` — PKCE auth callback for email confirmation
- `/app/(auth)/login/actions.ts` — server actions for login, signup, sign-out
- `/hooks/use-user.ts` — custom hook replacing Clerk's `useUser()` with `onAuthStateChange` listener

**Modified 15 files:** Replaced Clerk auth patterns with Supabase equivalents across middleware, root layout, auth pages, header, sidebar, PostHog identity, 11 server actions, API route, and 4 page components.

**Custom auth UI:** Built login/signup forms using existing shadcn/ui Card, Input, Label, Button components with `useActionState` for form handling and error display.

**Key architecture concept — cookie-based auth:** Unlike Clerk which required a `<ClerkProvider>` React context wrapper around the entire app, Supabase Auth is stateless from React's perspective. Auth state lives in HTTP cookies managed by the middleware. The middleware intercepts every request, refreshes the JWT if needed, and passes updated cookies through. Server components read auth via `supabase.auth.getUser()`, client components use the `useUser()` hook which listens to `onAuthStateChange` events.

### Before You Test
You need to do these manual steps in the Supabase Dashboard:
1. Go to Authentication > Providers and enable "Email" 
2. Go to Authentication > URL Configuration and add `http://localhost:3000/auth/callback` to Redirect URLs
3. Get your `SUPABASE_SERVICE_ROLE_KEY` from Settings > API and add it to `.env.local`
