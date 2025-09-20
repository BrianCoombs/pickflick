# Implementation Plan – Row Level Security for All Supabase Tables

**Overview**
Implement Row Level Security (RLS) on all 8 unprotected tables in the PickFlick database using app-level authentication with Clerk. This approach keeps Clerk as the sole auth provider while securing database access through RLS policies that validate user IDs passed from the application layer.

## Checklist
- [ ] Step 1 – Create auth helper functions in PostgreSQL
- [ ] Step 2 – Configure database client to pass Clerk userId headers
- [ ] Step 3 – Enable RLS on all 8 tables
- [ ] Step 4 – Create RLS policies for `profiles` table
- [ ] Step 5 – Create RLS policies for `movie_sessions` table
- [ ] Step 6 – Create RLS policies for `swipes` table
- [ ] Step 7 – Create RLS policies for `friendships` table
- [ ] Step 8 – Create RLS policies for `user_movie_sources` table
- [ ] Step 9 – Create RLS policies for `cached_movies` table
- [ ] Step 10 – Create RLS policies for `user_movie_preferences` table
- [ ] Step 11 – Create RLS policies for `match_history` table
- [ ] Step 12 – Test all existing API routes
- [ ] Step 13 – Verify security advisor shows no RLS errors

## Existing Components / Functions to Use
| Component | Location | How It Helps |
|-----------|----------|--------------|
| `auth()` | `@clerk/nextjs/server` | Provides Clerk userId in API routes |
| `db` client | `db/db.ts` | Drizzle database client to modify |
| Migration system | `db/migrations/` | For applying SQL changes |
| API routes | `app/api/` | Test RLS policies with existing endpoints |

## New Components / Functions to Add

### 1. Auth Helper Functions (PostgreSQL)
```sql
-- Extract user ID from request header
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS text AS $$
  SELECT current_setting('request.jwt.claims', true)::json->>'sub'
$$ LANGUAGE SQL STABLE;

-- Get full JWT claims (for future extensibility)
CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS json AS $$
  SELECT current_setting('request.jwt.claims', true)::json
$$ LANGUAGE SQL STABLE;
```

### 2. Database Client Configuration
- Modify `db/db.ts` to pass Clerk userId as a header
- Use Supabase service role key for server-side access
- Set custom claims in each request context

### 3. RLS Policies by Table

#### profiles
- **SELECT**: Users can read their own profile
- **INSERT**: Users can create their own profile
- **UPDATE**: Users can update their own profile
- **DELETE**: Prevent deletion

#### movie_sessions
- **SELECT**: Host and participants can view
- **INSERT**: Any authenticated user can create
- **UPDATE**: Only host can update
- **DELETE**: Only host can delete

#### swipes
- **SELECT**: Users in the session can view all swipes
- **INSERT**: Users in the session can add their swipes
- **UPDATE**: Users can update their own swipes
- **DELETE**: Prevent deletion

#### friendships
- **SELECT**: Users can see friendships where they're involved
- **INSERT**: Any authenticated user can create
- **UPDATE**: Either party can update status
- **DELETE**: Either party can delete

#### user_movie_sources
- **SELECT**: Users can read their own sources
- **INSERT**: Users can add their own sources
- **UPDATE**: Users can update their own sources
- **DELETE**: Users can delete their own sources

#### cached_movies
- **SELECT**: Any authenticated user can read
- **INSERT**: Any authenticated user can insert
- **UPDATE**: Any authenticated user can update
- **DELETE**: Prevent deletion

#### user_movie_preferences
- **SELECT**: Users can read their own preferences
- **INSERT**: Users can create their own preferences
- **UPDATE**: Users can update their own preferences
- **DELETE**: Users can delete their own preferences

#### match_history
- **SELECT**: Users in the session can view
- **INSERT**: Users in the session can insert
- **UPDATE**: Users in the session can update
- **DELETE**: Prevent deletion

## Logging Enhancements
- Add logging in `db/db.ts` when setting auth context
- Log RLS policy violations in API error handlers
- Add debug logging for auth header propagation

## Tests / Validation
- Test each API route to ensure it still works with RLS enabled
- Verify that direct database access without auth headers fails
- Check Supabase security advisor shows all RLS errors resolved
- Test cross-user access attempts (should be blocked by RLS)
- Manual test scenarios:
  1. Create a session as user A
  2. Try to access session as user B (should fail)
  3. Join session as user B
  4. Verify both users can see swipes
  5. Verify only host can modify session settings

## Migration Strategy
1. Create a new migration file with all RLS changes
2. Test in development environment first
3. Apply using `npx supabase migration up`
4. Roll back plan: Disable RLS if issues arise

## Risk Mitigation
- Keep service role key secure (server-side only)
- Ensure all API routes pass correct auth context
- Monitor for any RLS policy violations in logs
- Have rollback migration ready if needed