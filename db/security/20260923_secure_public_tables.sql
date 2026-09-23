-- Pickflick uses server-side Drizzle connections as postgres for application data.
-- Supabase browser clients use Auth only. No client table policies are needed.
-- Apply explicitly to the intended database, not through the old Drizzle journal.
-- This script is idempotent and does not change application rows.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE public.cached_movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_movie_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_movie_sources ENABLE ROW LEVEL SECURITY;

-- Revoke every client privilege, including TRUNCATE (which RLS does not cover).
-- Keep postgres ownership and service_role privileges unchanged.
REVOKE ALL PRIVILEGES ON TABLE
  public.cached_movies,
  public.friendships,
  public.match_history,
  public.movie_sessions,
  public.profiles,
  public.swipes,
  public.user_movie_preferences,
  public.user_movie_sources
FROM PUBLIC, anon, authenticated;

-- Tables created by the application's migration role must be private by default.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC, anon, authenticated;

COMMIT;
