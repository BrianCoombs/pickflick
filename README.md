# PickFlick - Movie Swiping App

A collaborative movie selection app where friends can swipe through movies together and find matches, similar to Tinder but for movies.

## Features

- **Real-time Matching**: Swipe through movies with friends and get instant notifications when everyone matches
- **Multiple Data Sources**: Integrates with TMDb for comprehensive movie data
- **Smart Filtering**: Filter by genres, years, and ratings when creating sessions
- **Social Sessions**: Create movie nights with friends using shareable session codes
- **Beautiful UI**: Smooth animations and intuitive swipe interface

## Tech Stack

- **Frontend**: Next.js 15, React, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Next.js API Routes, PostgreSQL, Drizzle ORM
- **Authentication**: Clerk
- **APIs**: TMDb (The Movie Database), OMDb (optional)

## Quick Start

### Prerequisites

1. **Node.js** 18+ installed
2. **PostgreSQL** database (use [Supabase](https://supabase.com/) for free hosting)
3. **API Keys**:
   - [TMDb API](https://www.themoviedb.org/settings/api) - Movie data (required)
   - [Clerk](https://dashboard.clerk.com/) - Authentication (required)
   - [OMDb API](http://www.omdbapi.com/apikey.aspx) - Additional ratings (optional)

### Setup Instructions

1. **Clone and install**:
   ```bash
   git clone https://github.com/BrianCoombs/pickflick.git
   cd pickflick
   npm install
   ```

2. **Configure environment**:
   Create a `.env.local` file with your API keys:
   ```env
   # Database (Supabase, Neon, or any PostgreSQL)
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

   # Auth (Clerk) - Required
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup

   # Movie APIs
   TMDB_API_KEY=your_tmdb_api_key              # Required
   TMDB_API_READ_ACCESS_TOKEN=your_tmdb_token  # Required
   OMDB_API_KEY=your_omdb_key                  # Optional - for additional ratings

   # Optional Services
   NEXT_PUBLIC_POSTHOG_KEY=phc_...             # Analytics
   NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
   STRIPE_SECRET_KEY=sk_test_...               # Payments
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

3. **Setup database**:
   ```bash
   npx drizzle-kit push
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
npx drizzle-kit push     # Push schema changes to database
npx drizzle-kit generate # Generate migrations
npx drizzle-kit studio   # Open database studio
```

## Deployment

For detailed deployment instructions, see [DEPLOY.md](DEPLOY.md). Quick options:
- **Vercel + Supabase** (Recommended) - Best for Next.js apps
- **Railway** - All-in-one solution
- **Render** - Budget-friendly option

## Current Status

✅ **Working Features**:
- User authentication with Clerk
- Movie data from TMDb API with enriched ratings
- Session creation with genre/year filtering
- Beautiful swipe interface with animations
- Match detection and celebration screen
- Session joining with shareable codes
- Keyboard navigation support
- Mobile-responsive design

🚧 **In Development**:
- Real-time updates with Supabase
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