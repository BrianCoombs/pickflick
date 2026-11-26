ALTER TABLE "movie_sessions" ADD COLUMN "media_type" varchar(10) DEFAULT 'movie' NOT NULL;--> statement-breakpoint
ALTER TABLE "movie_sessions" ADD COLUMN "match_mode" varchar(20) DEFAULT 'first' NOT NULL;--> statement-breakpoint
ALTER TABLE "movie_sessions" ADD COLUMN "pool_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "movie_sessions" ADD COLUMN "reset_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "match_history" ADD CONSTRAINT "match_history_session_id_movie_id_unique" UNIQUE("session_id","movie_id");