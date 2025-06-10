import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  jsonb,
  unique
} from "drizzle-orm/pg-core"

// Movie sessions for groups swiping together
export const movieSessions = pgTable("movie_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(), // Sessions expire after inactivity
  status: varchar("status", { length: 20 }).default("active").notNull(), // active, completed, expired
  matchedMovieId: varchar("matched_movie_id", { length: 50 }), // TMDb ID when matched
  hostUserId: varchar("host_user_id", { length: 255 }).notNull(), // Clerk user ID
  userIds: text("user_ids").array().notNull(), // Array of participant user IDs
  preferences: jsonb("preferences") // Session preferences (genres, year range, etc.)
})

// Individual swipes on movies
export const swipes = pgTable(
  "swipes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .references(() => movieSessions.id)
      .notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    movieId: varchar("movie_id", { length: 50 }).notNull(), // TMDb ID
    direction: varchar("direction", { length: 10 }).notNull(), // 'left', 'right', 'super'
    swipedAt: timestamp("swiped_at").defaultNow().notNull()
  },
  table => ({
    uniqueSwipe: unique().on(table.sessionId, table.userId, table.movieId)
  })
)

// Friend relationships between users
export const friendships = pgTable(
  "friendships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId1: varchar("user_id_1", { length: 255 }).notNull(),
    userId2: varchar("user_id_2", { length: 255 }).notNull(),
    status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, accepted, blocked
    createdAt: timestamp("created_at").defaultNow().notNull(),
    acceptedAt: timestamp("accepted_at")
  },
  table => ({
    uniqueFriendship: unique().on(table.userId1, table.userId2)
  })
)

// User connections to external movie sources
export const userMovieSources = pgTable("user_movie_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  sourceType: varchar("source_type", { length: 20 }).notNull(), // 'letterboxd', 'plex'
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  metadata: jsonb("metadata"), // Store additional config like Plex server URL
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
})

// Cached movie data to reduce API calls
export const cachedMovies = pgTable("cached_movies", {
  tmdbId: varchar("tmdb_id", { length: 50 }).primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
})

// User movie preferences and history
export const userMoviePreferences = pgTable("user_movie_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  favoriteGenres: integer("favorite_genres").array(),
  dislikedGenres: integer("disliked_genres").array(),
  minRating: integer("min_rating").default(6),
  preferredDecades: integer("preferred_decades").array(), // e.g., [1990, 2000, 2010]
  updatedAt: timestamp("updated_at").defaultNow().notNull()
})

// Match history for analytics
export const matchHistory = pgTable("match_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .references(() => movieSessions.id)
    .notNull(),
  movieId: varchar("movie_id", { length: 50 }).notNull(),
  matchedAt: timestamp("matched_at").defaultNow().notNull(),
  watchedAt: timestamp("watched_at"),
  userRatings: jsonb("user_ratings") // Store individual user ratings after watching
})
