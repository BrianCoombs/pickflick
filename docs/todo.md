# PickFlick - Development Progress

## Current Tasks Plan

### Task 1: Remove Hero Image
- [x] Delete `/public/hero.png` file
- [x] Update `/components/landing/hero.tsx` to remove the image reference (lines 93-98)
- [x] Consider replacing with a movie-themed placeholder or removing the image section entirely

### Task 2: Simplify Navigation
- [x] Update `/components/header.tsx` to remove About, Pricing, and Contact links
- [x] Remove the `navLinks` array (lines 22-26)
- [x] Clean up navigation rendering in both desktop and mobile views
- [x] Keep only the Sessions link for signed-in users

### Task 3: Security Review
- [x] Confirm that `docs/` and `CLAUDE.md` are not exposed in production builds
- [x] These files are NOT in the public directory and are NOT served by Next.js
- [x] They remain private in your source code repository

## Security Confirmation

**Your docs and CLAUDE.md files are SAFE from bad actors because:**
1. They are NOT in the `/public` directory (only files in `/public` are served statically)
2. Next.js does NOT serve arbitrary files from your project root
3. These files only exist in your source code and are not included in the production build
4. Only files explicitly imported/required in your code or placed in `/public` are accessible

## Review of Completed Tasks

### What was done:
1. **Removed hero.png image**: Deleted the generic hero image file from `/public/hero.png`
2. **Updated hero component**: Replaced the static image with an interactive movie genre card display featuring:
   - Three animated cards representing different movie genres (Action, Romance, Comedy)
   - Hover effects with spring animations
   - Movie-themed icons and gradients
   - Better visual representation of the app's functionality
3. **Simplified navigation**: Removed About, Pricing, and Contact links from both desktop and mobile navigation
4. **Cleaned up header component**: 
   - Removed the `navLinks` array completely
   - Kept only the Sessions link for signed-in users
   - Maintained clean navigation structure

### Result:
The app now has a more focused, minimal navigation and a movie-themed hero section that better represents the app's purpose of swiping through movies with friends.

## Completed Features ✅

### Phase 1: Setup & Foundation
- [x] Project setup and repository creation
- [x] Converted template to PickFlick movie app
- [x] Updated branding and navigation
- [x] Set up environment variables structure

### Phase 2: API Integration
- [x] TMDb API service implementation
- [x] OMDb API service (optional ratings)
- [x] Unified MovieService for data aggregation
- [x] Movie data caching system

### Phase 3: Database
- [x] Designed complete database schema
- [x] Movie sessions table with preferences
- [x] Swipes tracking with unique constraints
- [x] Friendships and user relationships
- [x] Match history for analytics
- [x] Cached movies for performance

### Phase 4: Core Features
- [x] Session creation with genre/year filters
- [x] Movie pool generation from TMDb
- [x] Swipe interface with animations
- [x] Keyboard controls (arrow keys)
- [x] Basic match detection logic
- [x] Match celebration page
- [x] Session joining with codes

### Phase 5: UI/UX
- [x] Landing page with features
- [x] Responsive movie cards
- [x] Framer Motion animations
- [x] Toast notifications
- [x] Loading states
- [x] Error handling

## Future Features 📋

- [ ] **Real-time Updates**: Supabase subscriptions for live match notifications
- [ ] **Friend System**: Add/accept friends functionality
- [ ] **Session Sharing**: Better code sharing and invites

### Authentication & User Features
- [ ] User profiles with avatar and preferences
- [ ] Watch history tracking
- [ ] Personal watchlists
- [ ] Movie ratings after watching

### Advanced Matching
- [ ] Group sessions (3+ people)
- [ ] Majority/unanimous voting options
- [ ] Veto functionality
- [ ] Match statistics

### External Integrations
- [ ] Letterboxd OAuth and list import
- [ ] Plex server connection
- [ ] Streaming availability (JustWatch API)
- [ ] Social sharing

### Improvements
- [ ] Mobile app (React Native)
- [ ] Progressive Web App (PWA)
- [ ] Offline support
- [ ] Performance optimizations
- [ ] Advanced filtering (runtime, platforms)
- [ ] AI-powered recommendations

## Overview
A collaborative movie selection app where friends can swipe through movies together and find matches, similar to Tinder but for movies. The app integrates with multiple movie databases and personal libraries to create a shared movie pool.

## Phase 1: Project Setup & API Integration

### 1.1 Core Technologies
- **Frontend**: Next.js 15 (existing template)
- **Backend**: Next.js API routes with server actions
- **Database**: PostgreSQL with Drizzle ORM (existing setup)
- **Real-time**: Supabase Realtime for live matching
- **Auth**: Clerk (existing setup)

### 1.2 API Integrations

#### TMDb (The Movie Database) - Primary Data Source
- **Purpose**: Movie metadata, posters, ratings, recommendations
- **Endpoints needed**:
  - `/movie/{movie_id}` - Movie details
  - `/movie/{movie_id}/recommendations` - Similar movies
  - `/movie/popular`, `/movie/top_rated` - Discovery
  - `/search/movie` - Search functionality
- **Implementation**: Store API key in environment variables

#### Letterboxd API
- **Purpose**: User watchlists and custom lists
- **Auth**: OAuth 2.0 flow
- **Endpoints needed**:
  - `/member/{id}/watchlist` - User's watchlist
  - `/member/{id}/lists` - Custom lists

#### Plex API
- **Purpose**: Access user's personal movie libraries
- **Auth**: Plex token authentication
- **Note**: Users need to provide their server details

#### OMDb (Optional)
- **Purpose**: Additional ratings (Rotten Tomatoes, Metacritic)
- **Implementation**: Supplement TMDb data

## Phase 2: Database Schema

### 2.1 Core Tables

```sql
-- Movie Sessions
CREATE TABLE movie_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active', -- active, completed, expired
  matched_movie_id VARCHAR(50), -- TMDb ID when matched
  user_ids TEXT[] -- Array of participant user IDs
);

-- Swipes
CREATE TABLE swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES movie_sessions(id),
  user_id VARCHAR(255) NOT NULL,
  movie_id VARCHAR(50) NOT NULL, -- TMDb ID
  direction VARCHAR(10) NOT NULL, -- 'left' or 'right'
  swiped_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id, user_id, movie_id)
);

-- Friend Relationships
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1 VARCHAR(255) NOT NULL,
  user_id_2 VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, blocked
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id_1, user_id_2)
);

-- User Movie Sources
CREATE TABLE user_movie_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  source_type VARCHAR(20) NOT NULL, -- 'letterboxd', 'plex'
  access_token TEXT,
  refresh_token TEXT,
  metadata JSONB, -- Store additional config like Plex server URL
  created_at TIMESTAMP DEFAULT NOW()
);

-- Cached Movies (to reduce API calls)
CREATE TABLE cached_movies (
  tmdb_id VARCHAR(50) PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Phase 3: Core Features Implementation

### 3.1 Movie Pool Generation Algorithm

```typescript
interface MoviePoolConfig {
  sessionId: string;
  userIds: string[];
  poolSize: number;
}

async function generateMoviePool(config: MoviePoolConfig) {
  const pool = [];
  
  // 1. Shared watchlist/library movies (40% of pool)
  const sharedMovies = await getSharedMovies(config.userIds);
  pool.push(...sharedMovies.slice(0, config.poolSize * 0.4));
  
  // 2. Recommendations based on liked movies (30% of pool)
  const recommendations = await getRecommendations(config.userIds);
  pool.push(...recommendations.slice(0, config.poolSize * 0.3));
  
  // 3. Popular/trending movies (30% of pool)
  const trendingMovies = await getTrendingMovies();
  pool.push(...trendingMovies.slice(0, config.poolSize * 0.3));
  
  // Deduplicate and shuffle
  return shuffle(deduplicateMovies(pool));
}
```

### 3.2 Real-time Matching System

```typescript
// Supabase real-time subscription
const matchingService = {
  subscribeToSession(sessionId: string, onMatch: Function) {
    return supabase
      .channel(`session:${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'swipes',
        filter: `session_id=eq.${sessionId}`
      }, async (payload) => {
        // Check for matches
        const match = await checkForMatch(payload.new);
        if (match) {
          onMatch(match);
        }
      })
      .subscribe();
  }
};

async function checkForMatch(newSwipe: Swipe) {
  if (newSwipe.direction !== 'right') return null;
  
  // Check if other user(s) also swiped right on this movie
  const otherSwipes = await db
    .select()
    .from(swipes)
    .where(
      and(
        eq(swipes.sessionId, newSwipe.sessionId),
        eq(swipes.movieId, newSwipe.movieId),
        eq(swipes.direction, 'right'),
        not(eq(swipes.userId, newSwipe.userId))
      )
    );
  
  // If all users in session swiped right, it's a match!
  const session = await getSession(newSwipe.sessionId);
  if (otherSwipes.length === session.userIds.length - 1) {
    return { movieId: newSwipe.movieId, sessionId: newSwipe.sessionId };
  }
  
  return null;
}
```

## Phase 4: UI Components

### 4.1 Swipe Interface
- **Card Stack**: Use framer-motion for smooth swipe animations
- **Movie Card**: Display poster, title, year, rating, genre
- **Swipe Controls**: Left (pass), Right (like), Up (super like/save for later)

### 4.2 Session Management
- **Create Session**: Invite friends, set preferences (genres, year range)
- **Join Session**: Accept invites, see who's participating
- **Session Status**: Real-time updates on who's swiping

### 4.3 Match Screen
- **Celebration Animation**: Confetti or similar when match occurs
- **Movie Details**: Full information, trailer link, where to watch
- **Action Buttons**: Save to list, start new session, share

## Phase 5: Advanced Features

### 5.1 Filtering & Preferences
- Genre preferences per session
- Release year range
- Minimum rating threshold
- Runtime limits
- Available on specific platforms

### 5.2 Group Sessions (3+ people)
- Require majority or unanimous agreement
- Show voting progress in real-time
- "Veto" option for strong dislikes

### 5.3 Smart Recommendations
- Learn from swipe patterns
- Weight recommendations based on match history
- Collaborative filtering between friends

## Phase 6: Implementation Timeline

### Week 1-2: Foundation
- Set up API integrations
- Design and implement database schema
- Create basic authentication flow

### Week 3-4: Core Features
- Movie pool generation
- Swipe interface
- Real-time matching logic

### Week 5-6: Social Features
- Friend system
- Session creation/joining
- Match celebrations

### Week 7-8: Polish & Testing
- UI/UX refinements
- Performance optimization
- Beta testing with friends

## Technical Considerations

### Performance
- Cache movie data to reduce API calls
- Implement pagination for large movie pools
- Use optimistic updates for swipes

### Security
- Encrypt stored API tokens
- Validate session participants
- Rate limit API calls

### Scalability
- Design for horizontal scaling
- Use connection pooling for database
- Implement proper caching strategy

## Next Steps
1. Create environment variables for API keys
2. Set up Drizzle schema files
3. Build API service classes
4. Create swipe UI components
5. Implement real-time subscriptions
6. Test with small group of users