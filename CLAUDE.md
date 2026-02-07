# Live Groove Finder - Mobile App

## Project Overview

Live Groove Finder is a music discovery platform that lets users recognize live music at concerts/venues via audio fingerprinting, discover nearby artists, find events, and connect fans with artists and venues. This is the **React Native / Expo mobile app** — a companion to the web app at `../live-groove-finder/`.

Both apps share the same **Supabase backend** (database, auth, edge functions) and should maintain consistent behavior and data contracts.

## Tech Stack

- **Framework**: React Native 0.81.5 + Expo 54 (SDK 54)
- **Language**: TypeScript (strict mode)
- **Routing**: Expo Router 6 (file-based routing in `app/`)
- **State Management**: Zustand 5 (auth store) + TanStack React Query 5 (server state)
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Audio**: expo-av (recording + playback)
- **Location**: expo-location (foreground permissions)
- **Secure Storage**: expo-secure-store (tokens on native, localStorage on web)
- **Animations**: React Native Reanimated 4
- **Maps**: react-native-maps 1.20 (installed, not yet used)
- **Icons**: @expo/vector-icons (FontAwesome)

## Architecture

```
app/                          # Expo Router file-based routes
├── _layout.tsx              # Root layout: fonts, auth guard, QueryClient
├── (auth)/                  # Unauthenticated routes
│   ├── login.tsx
│   └── signup.tsx
└── (tabs)/                  # Authenticated tab navigation (4 tabs)
    ├── index.tsx            # Discover — music recognition
    ├── feed.tsx             # Community — public discovery feed
    ├── events.tsx           # Events — Ticketmaster integration
    └── profile.tsx          # Profile — user info & discovery history

src/
├── components/              # Reusable UI components
│   └── recognition/         # Music recognition button + result display
├── hooks/                   # Custom React hooks (data fetching, device APIs)
├── services/                # Supabase client, React Query config
├── stores/                  # Zustand stores (auth)
└── types/                   # TypeScript types (database schema)

components/                  # Expo template shared components (Themed, etc.)
constants/                   # Color definitions
supabase/functions/          # Edge function source (shared with web app)
```

## Supabase Backend (Shared)

**Project**: `uhfhpiqnltuuuofwxpxg.supabase.co`

### Key Tables
| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (id, username, avatar_url) |
| `discoveries` | Song discovery history (title, artist, metadata JSON, location, user_id) |
| `user_roles` | Role assignments (app_role enum: admin, artist, fan, venue_owner) |
| `artists` | Artist profiles (name, genres, booking price, location, social links) |
| `venues` | Venue details (type, capacity, contact, tech specs) |
| `events` | Event listings (name, date, artist/venue relationships) |
| `artist_follows` | Fan-to-artist follow relationships |
| `favorites` | Saved favorites (generic: artist, venue, etc.) |
| `saved_searches` | User search filter presets |
| `songs` | Song database (title, artist, fingerprint, Spotify URL) |
| `subscriptions` | Stripe subscription tiers (free, discovery, premium) |

### Database RPC Functions
- `calculate_distance(lat1, lat2, lon1, lon2)` — Haversine distance
- `get_nearby_artists(user_lat, user_lng, radius_km, genres, price_min, price_max, search_query)`
- `get_nearby_events(user_lat, user_lng, radius_km, start_date, end_date)`
- `get_nearby_venues(user_lat, user_lng, radius_km)`
- `has_role(_user_id, _role)` — Role check

### Edge Functions
1. **recognize-music** — Audio recognition via ACRCloud (fingerprint + humming/melody). Validates JWT, accepts base64 audio + location, saves discovery on match. Confidence threshold: 60%.
2. **ticketmaster-events** — Nearby event search. Accepts lat/lng/radius, returns transformed event data with venue info, pricing, images.
3. **admin-manage-role** — Admin-only role assignment. Validates caller is admin, prevents self-removal.

### Edge Function Contracts

**recognize-music POST:**
```typescript
// Request
{ audioBase64: string, userId?: string, location?: { name?: string, latitude?: number, longitude?: number } }

// Response
{ success: boolean, type: "commercial" | "humming" | "not_found",
  song?: { title, artist, album, releaseDate, spotifyUrl, confidence: number, matchType: "fingerprint" | "melody" },
  error?: string }
```

**ticketmaster-events POST:**
```typescript
// Request
{ latitude, longitude, radius, keyword?, classificationName?, startDateTime?, endDateTime?, size?, page? }

// Response
{ success: boolean, events: Event[], page: { size, totalElements, totalPages, number } }
```

## Current Implementation Status

### Fully Implemented
- Music recognition (audio recording, ACRCloud edge function, result display)
- Community discovery feed (public feed with FlatList, pull-to-refresh)
- Events tab (Ticketmaster integration, radius filter, location permissions)
- Authentication (email/password sign-up/in/out, Zustand auth store)
- User profile (avatar, username, roles, discovery history, sign-out)
- Recent discoveries list with delete
- Audio recording with metering visualization (10s max, M4A/WebM)
- Animated recognition button (Reanimated pulsing rings, glow effects)
- Protected routing (auth guard in root layout)
- Secure token storage (expo-secure-store)

### Not Yet Implemented (Roadmap)
- **Artist discovery** — Browse/search nearby artists (web app has this via `get_nearby_artists` RPC)
- **Artist profiles** — View artist details, genres, booking info
- **Venue discovery** — Browse nearby venues (web app has `get_nearby_venues` RPC)
- **Venue profiles** — View venue details, upcoming events
- **Following system** — Follow/unfollow artists (profile shows hardcoded zeros)
- **Favorites** — Save/unsave discoveries, artists, venues (table exists)
- **Saved searches** — Persist search filters
- **Maps view** — Show artists/venues/events on map (react-native-maps installed)
- **Artist dashboard** — Artist role: manage profile, view stats
- **Venue dashboard** — Venue role: manage listings, bookings
- **Settings screen** — User preferences, distance units, notifications
- **Push notifications** — expo-notifications installed but unused
- **Search** — Global search across artists, venues, events
- **Offline support** — Cache discoveries for offline viewing
- **Social sharing** — Share discoveries externally
- **Distance unit toggle** — Imperial/metric (web app has this)

## Code Conventions

### Naming
- **Components**: PascalCase files and exports (`RecognitionButton.tsx`)
- **Hooks**: `use` prefix, camelCase (`useMusicRecognition.ts`)
- **Stores**: camelCase (`authStore.ts`)
- **Types**: PascalCase, descriptive suffixes (`RecognitionStatus`, `UseEventsReturn`)
- **Directories**: kebab-case (`recognition/`)

### Component Patterns
- Functional components only (no class components)
- `StyleSheet.create()` at bottom of file for styles
- Hooks for data fetching / device APIs — components stay presentational
- `Alert.alert()` for user-facing errors on native
- `console.error()` for debugging (avoid in production paths)

### State Management
- **Zustand** for global client state (auth). Use selector hooks pattern:
  ```typescript
  export const useUser = () => useAuthStore(state => state.user);
  export const useIsAuthenticated = () => useAuthStore(state => !!state.session);
  ```
- **React Query** for all server/API state. Config: 5min staleTime, 30min gcTime, 3 retries, no refetch on window focus.
- **useState** for local component state (form inputs, UI toggles)
- **useRef** for recording instances and mount tracking

### React Query Keys
Use the `queryKeys` factory in `src/services/queryClient.ts`:
```typescript
export const queryKeys = {
  discoveries: (userId: string) => ['discoveries', userId],
  publicDiscoveries: ['publicDiscoveries'],
  events: (lat: number, lng: number, radius: number) => ['events', lat, lng, radius],
};
```

### Supabase Client
Import from `src/services/supabase.ts`. Uses `ExpoSecureStoreAdapter` for token storage on native, localStorage fallback on web. Helper functions: `getCurrentUser()`, `getUserProfile()`, `getUserRoles()`.

### Error Handling
```typescript
try {
  // operation
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  Alert.alert('Error', message);
  console.error('Context:', message);
}
```

### Colors
| Purpose | Hex | Usage |
|---------|-----|-------|
| Primary | `#6366f1` | Buttons, active states (Indigo) |
| Success | `#22c55e` | Confirmations, Spotify green |
| Warning | `#f59e0b` | Alerts (Amber) |
| Error | `#ef4444` | Errors, recording state (Red) |
| Processing | `#8b5cf6` | Loading states (Purple) |
| Background | `#000` / `#1a1a1a` | Dark mode surfaces |
| Text | `#fff` / `#aaa` | Primary / secondary text |

### Audio Recording
- Format: M4A (native) / WebM (web)
- Sample rate: 44.1kHz, Mono, 192kbps
- Max duration: 10 seconds with auto-stop
- Metering enabled for visualization
- Output: base64-encoded for edge function

## Git Conventions

- **Commit format**: Imperative mood, capitalized — `"Fix memory leak in auth context"`
- **Branch strategy**: Work on feature branches, merge to main
- **Sensitive files**: `.env` is gitignored; use `.env.example` for documentation

## Environment Variables

```bash
# Required
EXPO_PUBLIC_SUPABASE_URL=https://uhfhpiqnltuuuofwxpxg.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>

# Edge function env vars (set in Supabase dashboard, not in mobile app)
# ACRCLOUD_ACCESS_KEY, ACRCLOUD_ACCESS_SECRET, ACRCLOUD_HOST
# TICKETMASTER_API_KEY
# SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
```

## Development

```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start

# iOS simulator
npx expo run:ios

# Android emulator
npx expo run:android
```

- **Expo Go** works for basic development
- **Development build** required for: expo-secure-store, audio recording, location
- Portrait orientation only (`app.json`)
- New Architecture enabled

## Relationship to Web App

The web app (`../live-groove-finder/`) is the more mature sibling (91 commits). When building mobile features:

1. **Check the web app first** for existing patterns, hooks, and component logic
2. **Use the same Supabase RPC functions** — they already exist and are tested
3. **Match the edge function contracts** — same request/response shapes
4. **Maintain feature parity** where it makes sense, but optimize for mobile UX
5. **Web app hooks to reference**: `useGeolocation`, `useFavorites`, `useNearbyArtists`, `useNearbyEvents`, `useArtistFollow`, `useDistanceUnit`, `useDebounce`
