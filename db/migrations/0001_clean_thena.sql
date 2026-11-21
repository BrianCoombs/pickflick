CREATE TABLE "letterboxd_films" (
	"slug" varchar(255) PRIMARY KEY NOT NULL,
	"tmdb_id" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "letterboxd_films" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_movie_sources" ADD CONSTRAINT "user_movie_sources_user_id_source_type_unique" UNIQUE("user_id","source_type");