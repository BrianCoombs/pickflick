# PickFlick - Movie Swiping App

A collaborative movie selection app where friends can swipe through movies together and find matches, similar to Tinder but for movies.

## Features

- **Real-time Matching**: Swipe through movies with friends and get instant notifications when everyone matches
- **Multiple Data Sources**: Integrates with TMDb, Letterboxd, and Plex for comprehensive movie data
- **Smart Recommendations**: AI-powered movie suggestions based on group preferences
- **Social Sessions**: Create movie nights with friends and find the perfect film together

## Tech Stack

- **Frontend**: Next.js 15, React, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, PostgreSQL, Drizzle ORM
- **Real-time**: Supabase Realtime
- **Authentication**: Clerk
- **APIs**: TMDb, Letterboxd, Plex, OMDb

## Prerequisites

You will need accounts for the following services:

- [Supabase](https://supabase.com/) - Database and real-time features
- [Clerk](https://clerk.com/) - Authentication
- [TMDb](https://www.themoviedb.org/settings/api) - Movie data API
- [Letterboxd](https://letterboxd.com/api-beta/) - Movie lists and ratings
- [OMDb](http://www.omdbapi.com/apikey.aspx) - Additional movie ratings (optional)

## Environment Variables

```bash
# DB (Supabase)
DATABASE_URL=

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup

# Movie APIs
TMDB_API_KEY=
TMDB_API_READ_ACCESS_TOKEN=
LETTERBOXD_API_KEY=
LETTERBOXD_API_SECRET=
OMDB_API_KEY=

# Analytics (PostHog)
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

## Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in your API keys
3. Install dependencies: `npm install`
4. Push database schema: `npx drizzle-kit push`
5. Run development server: `npm run dev`

## Development

See [tasks/todo.md](tasks/todo.md) for the development plan and current progress.