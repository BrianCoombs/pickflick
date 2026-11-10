# PickFlick - Movie Swiping App

A collaborative movie selection app where friends can swipe through movies together and find matches, similar to Tinder but for movies.

## Features

- **Real-time Matching**: Swipe through movies with friends and get instant notifications when everyone matches
- **Multiple Data Sources**: Integrates with TMDb for comprehensive movie data
- **Smart Filtering**: Filter by genres, years, and ratings when creating sessions
- **Social Sessions**: Create movie nights with friends using shareable session codes
- **Beautiful UI**: Smooth animations and intuitive swipe interface

## Tech Stack

- **Frontend**: Next.js 16, React, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Next.js API Routes, Neon Postgres, Drizzle ORM
- **Authentication**: Neon Auth (managed Better Auth): email/password and Google
- **APIs**: TMDb (The Movie Database), OMDb (optional)

## Quick Start

### Prerequisites

1. **Node.js** 20.9+ installed
2. **Neon** project with Postgres and Auth enabled ([console.neon.tech](https://console.neon.tech), free plan is enough)
3. **API Keys**:
   - [TMDb API](https://www.themoviedb.org/settings/api) - Movie data (required)
   - [OMDb API](http://www.omdbapi.com/apikey.aspx) - Additional ratings (optional)

### Setup Instructions

1. **Clone and install**:
   ```bash
   git clone https://github.com/BrianCoombs/pickflick.git
   cd pickflick
   npm install
   ```

2. **Configure environment**:
   Copy `.env.example` to `.env.local` and fill it in. The Neon CLI can write
   the database and auth values for you:
   ```bash
   npm i -g neon
   neon login
   neon env pull --project-id <project-id> --file .env.local \
     -e DATABASE_URL,DATABASE_URL_UNPOOLED,NEON_AUTH_BASE_URL
   echo "NEON_AUTH_COOKIE_SECRET=\"$(openssl rand -base64 32)\"" >> .env.local
   ```
   Then add `TMDB_API_KEY` and `TMDB_API_READ_ACCESS_TOKEN`.

3. **Setup database**:
   ```bash
   npm run db:migrate
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

   Visit [http://localhost:3000](http://localhost:3000)

## How to Use

### Creating a Session
1. Sign up or log in
2. Click "Create Session" 
3. Select your preferred genres and year range
4. Share the session code with friends

### Joining a Session
1. Get a session code from your friend
2. Click "Join Session"
3. Enter the code and start swiping

### Swiping
- **Right swipe / →** : Like the movie
- **Left swipe / ←** : Pass on the movie  
- **Up swipe / ↑** : Super like (saves for later)

When all participants swipe right on the same movie, it's a match! 🎉

## Development

### Project Structure
```
/app              # Next.js app router pages
/components       # React components
/lib/api         # API service classes
/db/schema       # Database schema definitions
/actions         # Server actions
/public          # Static assets
```

### Commands
```bash
npm run dev         # Start development server
npm run build       # Build for production
npm run start       # Start production server
npm run lint        # Run ESLint
npm run type-check  # Check TypeScript types
npm run clean       # Fix linting and format code

# Database commands
npm run db:generate      # Generate a migration from db/schema changes
npm run db:migrate       # Apply migrations (uses DATABASE_URL_UNPOOLED)
npx drizzle-kit studio   # Open database studio
```

## Deployment

Production runs on Vercel (`pickflick.vercel.app`) with Neon for the database
and auth. Set `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`
and the TMDb keys in Vercel. Any domain that serves the app must be added to
Neon Auth's trusted domains (`neon neon-auth domain add https://<domain>`).

Google sign-in uses Neon's shared development OAuth keys, which show Neon's
branding on the consent screen. For a real launch, add your own Google client
with `neon neon-auth oauth-provider`.

Neon's free plan scales the compute to zero after 5 minutes idle and wakes it
on the next query, so no keep-alive job is needed.

## Current Status

✅ **Working Features**:
- Email/password and Google sign-in with Neon Auth
- Movie data from TMDb API with enriched ratings
- Session creation with genre/year filtering
- Beautiful swipe interface with animations
- Match detection and celebration screen
- Session joining with shareable codes
- Keyboard navigation support
- Mobile-responsive design

🚧 **In Development**:
- Real-time updates
- Friend system and social features
- Movie streaming availability
- Session history and analytics

📋 **Recent Updates** (January 2025):
- Fixed Next.js 15 compatibility issues
- Updated to new async params API
- Improved type safety across the app
- Created comprehensive deployment guide

See [tasks/todo.md](tasks/todo.md) for detailed development progress and roadmap.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](license) file for details.

## Credits

This project was built using [McKay's App Template](https://github.com/mckaywrigley/mckays-app-template) as a foundation. Special thanks to McKay Wrigley for creating such a solid Next.js starter template!