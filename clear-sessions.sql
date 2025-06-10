-- Clear all existing sessions after deploying movie pool feature
-- This ensures all sessions use the new consistent movie ordering

-- Delete all match history first (due to foreign key constraint)
DELETE FROM match_history;

-- Delete all swipes
DELETE FROM swipes;

-- Delete all movie sessions
DELETE FROM movie_sessions;

-- Verify the deletion
SELECT 
    (SELECT COUNT(*) FROM movie_sessions) as sessions_count,
    (SELECT COUNT(*) FROM swipes) as swipes_count,
    (SELECT COUNT(*) FROM match_history) as match_history_count;