-- Run as postgres against the explicitly selected Pickflick database.
-- All test writes are rolled back. An assertion failure aborts the transaction.
BEGIN;
SET LOCAL statement_timeout = '30s';

DO $$
DECLARE
  table_name text;
  role_name text;
  privilege_name text;
  table_oid regclass;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'cached_movies', 'friendships', 'match_history', 'movie_sessions',
    'profiles', 'swipes', 'user_movie_preferences', 'user_movie_sources'
  ] LOOP
    table_oid := format('public.%I', table_name)::regclass;
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = table_oid) THEN
      RAISE EXCEPTION 'RLS disabled: %', table_name;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = table_oid) THEN
      RAISE EXCEPTION 'Unexpected client policy on server-only table: %', table_name;
    END IF;
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      FOREACH privilege_name IN ARRAY ARRAY[
        'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'
      ] LOOP
        IF has_table_privilege(role_name, table_oid, privilege_name) THEN
          RAISE EXCEPTION 'Unexpected % privilege for % on %',
            privilege_name, role_name, table_name;
        END IF;
      END LOOP;
      IF has_any_column_privilege(role_name, table_oid, 'SELECT,INSERT,UPDATE,REFERENCES') THEN
        RAISE EXCEPTION 'Unexpected column privilege for % on %', role_name, table_name;
      END IF;
    END LOOP;
    FOREACH role_name IN ARRAY ARRAY['postgres', 'service_role'] LOOP
      FOREACH privilege_name IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'] LOOP
        IF NOT has_table_privilege(role_name, table_oid, privilege_name) THEN
          RAISE EXCEPTION 'Missing % privilege for % on %',
            privilege_name, role_name, table_name;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
  IF EXISTS (
    SELECT 1
    FROM pg_default_acl d
    CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE d.defaclrole = 'postgres'::regrole
      AND d.defaclnamespace IN (0, 'public'::regnamespace)
      AND d.defaclobjtype = 'r'
      AND a.grantee IN (0, 'anon'::regrole, 'authenticated'::regrole)
  ) THEN
    RAISE EXCEPTION 'Future postgres tables would grant client privileges';
  END IF;
END $$;

-- Execute actual queries under each API role; require permission-denied errors.
DO $$
DECLARE
  table_name text;
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    EXECUTE format('SET LOCAL ROLE %I', role_name);
    FOREACH table_name IN ARRAY ARRAY[
      'cached_movies', 'friendships', 'match_history', 'movie_sessions',
      'profiles', 'swipes', 'user_movie_preferences', 'user_movie_sources'
    ] LOOP
      IF NOT row_security_active(format('public.%I', table_name)::regclass) THEN
        RAISE EXCEPTION 'RLS not active for % on %', role_name, table_name;
      END IF;
      BEGIN
        EXECUTE format('SELECT 1 FROM public.%I LIMIT 0', table_name);
        RAISE EXCEPTION 'Unexpected read access for % on %', role_name, table_name;
      EXCEPTION WHEN insufficient_privilege THEN
        NULL; -- Expected: SQLSTATE 42501.
      END;
    END LOOP;
    RESET ROLE;
  END LOOP;
END $$;

-- Exercise the application's server role and session/swipe/match relationships.
SET LOCAL ROLE postgres;
DO $$
DECLARE
  test_user text := 'security-check-' || gen_random_uuid()::text;
  test_session uuid;
  test_movie text := 'check-' || gen_random_uuid()::text;
  affected integer;
BEGIN
  INSERT INTO public.profiles (user_id) VALUES (test_user);
  INSERT INTO public.cached_movies (tmdb_id, data) VALUES (test_movie, '{"security_test": true}');
  INSERT INTO public.movie_sessions (expires_at, host_user_id, user_ids)
    VALUES (now() + interval '1 minute', test_user, ARRAY[test_user])
    RETURNING id INTO test_session;
  INSERT INTO public.swipes (session_id, user_id, movie_id, direction)
    VALUES (test_session, test_user, test_movie, 'right');
  INSERT INTO public.match_history (session_id, movie_id) VALUES (test_session, test_movie);
  INSERT INTO public.friendships (user_id_1, user_id_2) VALUES (test_user, test_user || '-friend');
  INSERT INTO public.user_movie_preferences (user_id) VALUES (test_user);
  INSERT INTO public.user_movie_sources (user_id, source_type) VALUES (test_user, 'plex');
  IF NOT EXISTS (
    SELECT 1 FROM public.movie_sessions s
    JOIN public.swipes w ON w.session_id = s.id
    JOIN public.match_history m ON m.session_id = s.id
    WHERE s.id = test_session AND w.user_id = test_user
  ) THEN
    RAISE EXCEPTION 'Server session/swipe/match read failed';
  END IF;
  UPDATE public.movie_sessions SET status = 'completed' WHERE id = test_session;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Server update failed'; END IF;
  DELETE FROM public.cached_movies WHERE tmdb_id = test_movie;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Server delete failed'; END IF;
END $$;

ROLLBACK;
SELECT 'PASS: eight tables protected; client reads denied; server writes rolled back' AS result;
