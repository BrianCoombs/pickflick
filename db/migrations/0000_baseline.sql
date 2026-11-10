CREATE TYPE "public"."membership" AS ENUM('free', 'pro');--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"membership" "membership" DEFAULT 'free' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cached_movies" (
	"tmdb_id" varchar(50) PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cached_movies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id_1" varchar(255) NOT NULL,
	"user_id_2" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp,
	CONSTRAINT "friendships_user_id_1_user_id_2_unique" UNIQUE("user_id_1","user_id_2")
);
--> statement-breakpoint
ALTER TABLE "friendships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "match_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"movie_id" varchar(50) NOT NULL,
	"matched_at" timestamp DEFAULT now() NOT NULL,
	"watched_at" timestamp,
	"user_ratings" jsonb
);
--> statement-breakpoint
ALTER TABLE "match_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "movie_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"matched_movie_id" varchar(50),
	"host_user_id" varchar(255) NOT NULL,
	"user_ids" text[] NOT NULL,
	"preferences" jsonb,
	"movie_pool" jsonb
);
--> statement-breakpoint
ALTER TABLE "movie_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "swipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"movie_id" varchar(50) NOT NULL,
	"direction" varchar(10) NOT NULL,
	"swiped_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "swipes_session_id_user_id_movie_id_unique" UNIQUE("session_id","user_id","movie_id")
);
--> statement-breakpoint
ALTER TABLE "swipes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_movie_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"favorite_genres" integer[],
	"disliked_genres" integer[],
	"min_rating" integer DEFAULT 6,
	"preferred_decades" integer[],
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_movie_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_movie_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"source_type" varchar(20) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_movie_sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "match_history" ADD CONSTRAINT "match_history_session_id_movie_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."movie_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipes" ADD CONSTRAINT "swipes_session_id_movie_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."movie_sessions"("id") ON DELETE no action ON UPDATE no action;