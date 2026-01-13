export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      artist_follows: {
        Row: {
          artist_id: string
          followed_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          artist_id: string
          followed_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          artist_id?: string
          followed_at?: string | null
          id?: string
          user_id?: string
        }
      }
      artists: {
        Row: {
          availability_notes: string | null
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          booking_price_max: number | null
          booking_price_min: number | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          featured_until: string | null
          genre: string[] | null
          id: string
          instagram_url: string | null
          is_premium: boolean | null
          latitude: number | null
          location: string | null
          longitude: number | null
          merch_url: string | null
          name: string
          spotify_url: string | null
          user_id: string
        }
        Insert: {
          availability_notes?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          booking_price_max?: number | null
          booking_price_min?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          featured_until?: string | null
          genre?: string[] | null
          id?: string
          instagram_url?: string | null
          is_premium?: boolean | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          merch_url?: string | null
          name: string
          spotify_url?: string | null
          user_id: string
        }
        Update: {
          availability_notes?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          booking_price_max?: number | null
          booking_price_min?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          featured_until?: string | null
          genre?: string[] | null
          id?: string
          instagram_url?: string | null
          is_premium?: boolean | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          merch_url?: string | null
          name?: string
          spotify_url?: string | null
          user_id?: string
        }
      }
      concert_checkins: {
        Row: {
          artist_id: string | null
          checked_in_at: string | null
          created_at: string | null
          event_id: string
          id: string
          rating: number | null
          review: string | null
          updated_at: string | null
          user_id: string
          venue_id: string | null
        }
        Insert: {
          artist_id?: string | null
          checked_in_at?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          rating?: number | null
          review?: string | null
          updated_at?: string | null
          user_id: string
          venue_id?: string | null
        }
        Update: {
          artist_id?: string | null
          checked_in_at?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          rating?: number | null
          review?: string | null
          updated_at?: string | null
          user_id?: string
          venue_id?: string | null
        }
      }
      discoveries: {
        Row: {
          artist_id: string | null
          discovered_at: string | null
          discovered_by_user_id: string | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          song_artist: string | null
          song_id: string | null
          song_metadata: Json | null
          song_title: string | null
        }
        Insert: {
          artist_id?: string | null
          discovered_at?: string | null
          discovered_by_user_id?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          song_artist?: string | null
          song_id?: string | null
          song_metadata?: Json | null
          song_title?: string | null
        }
        Update: {
          artist_id?: string | null
          discovered_at?: string | null
          discovered_by_user_id?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          song_artist?: string | null
          song_id?: string | null
          song_metadata?: Json | null
          song_title?: string | null
        }
      }
      events: {
        Row: {
          artist_id: string | null
          created_at: string | null
          description: string | null
          event_date: string
          id: string
          name: string
          setlist_id: string | null
          venue_id: string | null
        }
        Insert: {
          artist_id?: string | null
          created_at?: string | null
          description?: string | null
          event_date: string
          id?: string
          name: string
          setlist_id?: string | null
          venue_id?: string | null
        }
        Update: {
          artist_id?: string | null
          created_at?: string | null
          description?: string | null
          event_date?: string
          id?: string
          name?: string
          setlist_id?: string | null
          venue_id?: string | null
        }
      }
      favorites: {
        Row: {
          created_at: string | null
          favorite_id: string
          favorite_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          favorite_id: string
          favorite_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          favorite_id?: string
          favorite_type?: string
          id?: string
          user_id?: string
        }
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          username?: string | null
        }
      }
      saved_searches: {
        Row: {
          created_at: string | null
          filters: Json
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          filters: Json
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          filters?: Json
          id?: string
          name?: string
          user_id?: string
        }
      }
      songs: {
        Row: {
          artist_id: string
          audio_fingerprint: string | null
          audio_url: string | null
          duration: number | null
          id: string
          spotify_url: string | null
          title: string
          uploaded_at: string | null
        }
        Insert: {
          artist_id: string
          audio_fingerprint?: string | null
          audio_url?: string | null
          duration?: number | null
          id?: string
          spotify_url?: string | null
          title: string
          uploaded_at?: string | null
        }
        Update: {
          artist_id?: string
          audio_fingerprint?: string | null
          audio_url?: string | null
          duration?: number | null
          id?: string
          spotify_url?: string | null
          title?: string
          uploaded_at?: string | null
        }
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: SubscriptionStatus
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: SubscriptionTier
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: SubscriptionStatus
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: SubscriptionTier
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: SubscriptionStatus
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: SubscriptionTier
          updated_at?: string | null
          user_id?: string
        }
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: AppRole
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: AppRole
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: AppRole
          user_id?: string
        }
      }
      venues: {
        Row: {
          booking_requirements: string | null
          budget_range: string | null
          capacity: number | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          featured_until: string | null
          id: string
          is_premium: boolean | null
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string
          owner_id: string
          technical_specs: Json | null
          type: string | null
        }
        Insert: {
          booking_requirements?: string | null
          budget_range?: string | null
          capacity?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          featured_until?: string | null
          id?: string
          is_premium?: boolean | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name: string
          owner_id: string
          technical_specs?: Json | null
          type?: string | null
        }
        Update: {
          booking_requirements?: string | null
          budget_range?: string | null
          capacity?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          featured_until?: string | null
          id?: string
          is_premium?: boolean | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string
          owner_id?: string
          technical_specs?: Json | null
          type?: string | null
        }
      }
    }
    Views: {
      artists_public: {
        Row: {
          availability_notes: string | null
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          booking_price_max: number | null
          booking_price_min: number | null
          created_at: string | null
          featured_until: string | null
          genre: string[] | null
          id: string | null
          instagram_url: string | null
          is_premium: boolean | null
          latitude: number | null
          location: string | null
          longitude: number | null
          merch_url: string | null
          name: string | null
          spotify_url: string | null
          user_id: string | null
        }
      }
      venues_public: {
        Row: {
          capacity: number | null
          created_at: string | null
          description: string | null
          featured_until: string | null
          id: string | null
          is_premium: boolean | null
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string | null
          type: string | null
        }
      }
    }
    Functions: {
      calculate_distance: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      get_nearby_artists: {
        Args: {
          user_lat: number
          user_lng: number
          radius_km?: number
          genres?: string[]
          price_min?: number
          price_max?: number
          search_query?: string
        }
        Returns: {
          avatar_url: string
          bio: string
          distance_km: number
          genre: string[]
          id: string
          latitude: number
          location: string
          longitude: number
          name: string
        }[]
      }
      get_nearby_events: {
        Args: {
          user_lat: number
          user_lng: number
          radius_km?: number
          start_date?: string
          end_date?: string
        }
        Returns: {
          artist_id: string
          artist_name: string
          description: string
          distance_km: number
          event_date: string
          id: string
          name: string
          venue_id: string
          venue_latitude: number
          venue_location: string
          venue_longitude: number
          venue_name: string
        }[]
      }
      get_nearby_venues: {
        Args: { radius_km?: number; user_lat: number; user_lng: number }
        Returns: {
          capacity: number
          description: string
          distance_km: number
          id: string
          latitude: number
          location: string
          longitude: number
          name: string
          type: string
        }[]
      }
      has_role: {
        Args: {
          _role: AppRole
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "artist" | "fan" | "venue_owner"
      subscription_status: "active" | "canceled" | "past_due" | "trial"
      subscription_tier: "free" | "discovery" | "premium"
    }
  }
}

// Convenience type aliases
export type AppRole = Database["public"]["Enums"]["app_role"]
export type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"]
export type SubscriptionTier = Database["public"]["Enums"]["subscription_tier"]

// Table row types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Artist = Database["public"]["Tables"]["artists"]["Row"]
export type Venue = Database["public"]["Tables"]["venues"]["Row"]
export type Event = Database["public"]["Tables"]["events"]["Row"]
export type Discovery = Database["public"]["Tables"]["discoveries"]["Row"]
export type Song = Database["public"]["Tables"]["songs"]["Row"]
export type UserRole = Database["public"]["Tables"]["user_roles"]["Row"]
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"]
export type Favorite = Database["public"]["Tables"]["favorites"]["Row"]
export type ArtistFollow = Database["public"]["Tables"]["artist_follows"]["Row"]

// Insert types
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"]
export type DiscoveryInsert = Database["public"]["Tables"]["discoveries"]["Insert"]
export type FavoriteInsert = Database["public"]["Tables"]["favorites"]["Insert"]

// App-specific types
export interface SongMetadata {
  album?: string
  releaseDate?: string
  label?: string
  spotifyUrl?: string
  matchType?: "exact" | "melody"
  score?: number
}

export interface RecognitionResult {
  type: "commercial" | "local" | "not_found"
  song?: {
    title: string
    artist: string
    album?: string
    releaseDate?: string
    spotifyUrl?: string
  }
  localArtist?: Artist
  confidence?: number
}
