# PickFlick Setup Guide

## Quick Start

### 1. Get API Keys

1. **TMDb API** (Required)
   - Go to [TMDb](https://www.themoviedb.org/)
   - Create an account and go to Settings > API
   - Request an API key (choose "Developer" for personal use)
   - You'll get both an API Key and Read Access Token

2. **Clerk Auth** (Required)
   - Go to [Clerk Dashboard](https://dashboard.clerk.com/)
   - Create a new application
   - Copy your Publishable Key and Secret Key

3. **Supabase Database** (Required)
   - Go to [Supabase](https://supabase.com/)
   - Create a new project
   - Go to Settings > Database
   - Copy your connection string

### 2. Environment Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your API keys in `.env.local`:
   ```
   # Database
   DATABASE_URL=your_supabase_connection_string

   # Auth
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key
   CLERK_SECRET_KEY=sk_test_your_key

   # Movie APIs
   TMDB_API_KEY=your_tmdb_api_key
   TMDB_API_READ_ACCESS_TOKEN=your_tmdb_read_token
   ```

### 3. Install & Run

```bash
# Install dependencies
npm install

# Push database schema
npx drizzle-kit push

# Run development server
npm run dev
```

Visit http://localhost:3000

## Testing the App

### Solo Testing (Single Browser)

1. Sign up for an account
2. Click "Start Swiping" or go to `/sessions`
3. Create a new session with your movie preferences
4. Start swiping through movies
5. Since you're alone, every right swipe will be a match!

### Multi-User Testing (Recommended)

To properly test the matching feature with multiple users:

1. **Use Multiple Browsers**:
   - Open Chrome and sign up as User 1
   - Open Firefox/Safari and sign up as User 2
   - Or use Chrome + Chrome Incognito mode

2. **Create a Session**:
   - As User 1: Create a new session
   - Copy the session ID from the URL

3. **Join the Session**:
   - As User 2: Go to the session URL directly
   - Both users will now see the same movies

4. **Test Matching**:
   - Both users swipe left/right on movies
   - When BOTH swipe right on the same movie, you'll get a match!

### Test Data

The app will automatically load popular movies from TMDb. You can:
- Filter by genres when creating a session
- Set year ranges (e.g., 2020-2024 for recent movies)
- The app loads 50 movies per session

## Troubleshooting

### "No movies available"
- Check your TMDb API key is correct
- Check the browser console for API errors
- Ensure your internet connection is working

### Can't see match after both swiping right
- Make sure both users are in the same session
- Check that both users swiped RIGHT (not left)
- The match detection is currently instant (no real-time updates yet)

### Database errors
- Ensure your DATABASE_URL is correct
- Run `npx drizzle-kit push` to sync the schema
- Check Supabase dashboard for connection issues

## Next Steps

Once basic testing works, you can:
1. Invite real friends to test together
2. Try different genre combinations
3. Test on mobile devices
4. Share feedback for improvements!