# Exploration Report – Row Level Security Implementation for Supabase Tables

**Overview**
This exploration identifies all Supabase tables in the PickFlick movie swiping application that currently lack Row Level Security (RLS) and documents the authentication setup, data relationships, and access patterns necessary to implement proper RLS policies for each table.

## Relevant Files
| File | Why It Matters |
|------|----------------|
| db/schema/movies-schema.ts | Defines 7 tables: movieSessions, swipes, friendships, userMovieSources, cachedMovies, userMoviePreferences, matchHistory |
| db/schema/profiles-schema.ts | Defines the profiles table with membership tiers |
| app/api/sessions/[sessionId]/participants/route.ts | Shows current auth pattern using Clerk's auth() for user verification |
| db/migrations/0000_nostalgic_mauler.sql | Initial migration creating profiles and todos tables |

## Relevant Functions / Components
- `auth()` from `@clerk/nextjs/server`: Provides userId for authentication in API routes
- Database tables use Clerk user IDs (varchar(255)) as foreign keys for user identification
- All tables currently exposed via PostgREST without RLS protection

## How the Code Works
The current implementation uses a hybrid authentication approach:
1. **Clerk Authentication**: Handles user authentication and provides user IDs
2. **Database Access**: Uses Drizzle ORM to interact with Supabase PostgreSQL
3. **API Routes**: Manually check user permissions using Clerk's auth() before database operations
4. **Security Gap**: Tables are publicly accessible through Supabase's PostgREST API without RLS

Current table access patterns:
- **profiles**: One-to-one mapping with Clerk users
- **movieSessions**: Host-owned sessions with participant user arrays
- **swipes**: User swipes linked to sessions
- **friendships**: Bidirectional relationships between users
- **userMovieSources**: Private user credentials for external services
- **cachedMovies**: Shared movie data cache
- **userMoviePreferences**: Private user preferences
- **matchHistory**: Session-based match results

## Manual Testing Requirements
During the planning phase, we should ask the user to:
1. **Authentication Flow**: How does Clerk authentication integrate with Supabase? Should we use Supabase Auth or continue with Clerk?
2. **JWT Integration**: Do you want to sync Clerk JWTs with Supabase for RLS policies?
3. **Access Patterns**: Should friends be able to see each other's preferences or swipe history?
4. **Session Permissions**: Can participants modify session data or only the host?
5. **Cache Access**: Should cachedMovies be publicly readable or require authentication?

## Missing Pieces
- [ ] No RLS enabled on any of the 8 affected tables (excluding heartbeat which has RLS)
- [ ] No Supabase Auth integration with Clerk
- [ ] No RLS policies defined for any table
- [ ] No auth.users table or JWT configuration for RLS context
- [ ] No service role key usage pattern established

## Logging Notes
- Existing: Console.error in API routes for error handling
- Suggested: Add logging for RLS policy violations once implemented
- Suggested: Log authentication context mismatches between Clerk and Supabase

## Security Advisor Findings
The Supabase security advisor reports 8 ERROR-level security issues:
- **movie_sessions**: RLS disabled (hosts and participants need different access levels)
- **user_movie_sources**: RLS disabled (contains sensitive OAuth tokens)
- **swipes**: RLS disabled (user-specific voting data)
- **match_history**: RLS disabled (session-specific results)
- **profiles**: RLS disabled (user profile data)
- **cached_movies**: RLS disabled (could be public read, authenticated write)
- **friendships**: RLS disabled (bidirectional relationship access)
- **user_movie_preferences**: RLS disabled (private user preferences)

## Recommended Implementation Approach
Based on analysis, **Option C: Database functions with app-level authentication** is the most straightforward approach:

### Why This Approach
- Keeps Clerk as the single auth provider (no sync complexity)
- Uses Supabase service role from Next.js API routes
- Simple RLS policies using a custom `auth.uid()` function
- No JWT configuration or token syncing required
- Minimal changes to existing codebase

### How It Will Work
1. API routes continue using Clerk's `auth()` for userId
2. Create a PostgreSQL function to extract user ID from request headers
3. Pass Clerk userId to Supabase via custom header in database client
4. RLS policies use the function to check user permissions
5. All database access remains server-side through API routes

### Implementation Steps
1. Create `auth.uid()` and `auth.jwt()` functions in PostgreSQL
2. Configure Drizzle/Supabase client to pass auth headers
3. Enable RLS on each table
4. Create policies for each table based on access patterns
5. Test with existing API routes

This approach maintains security while requiring minimal refactoring of existing code.