-- Add moviePool column to movie_sessions table
ALTER TABLE movie_sessions 
ADD COLUMN IF NOT EXISTS movie_pool JSONB;