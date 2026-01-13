-- Live Groove Finder Mobile - Initial Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'artist', 'fan', 'venue_owner');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Discoveries table (music recognition results)
CREATE TABLE public.discoveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discovered_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  song_title TEXT,
  song_artist TEXT,
  song_metadata JSONB,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Favorites table
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  favorite_type TEXT NOT NULL, -- 'song', 'artist', 'event'
  favorite_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, favorite_type, favorite_id)
);

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');

  -- Default role is 'fan'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'fan');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Discoveries policies
CREATE POLICY "Discoveries are viewable by everyone"
  ON public.discoveries FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create discoveries"
  ON public.discoveries FOR INSERT
  WITH CHECK (auth.uid() = discovered_by_user_id);

CREATE POLICY "Users can update own discoveries"
  ON public.discoveries FOR UPDATE
  USING (auth.uid() = discovered_by_user_id);

CREATE POLICY "Users can delete own discoveries"
  ON public.discoveries FOR DELETE
  USING (auth.uid() = discovered_by_user_id);

-- Favorites policies
CREATE POLICY "Users can view own favorites"
  ON public.favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own favorites"
  ON public.favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON public.favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_discoveries_user ON public.discoveries(discovered_by_user_id);
CREATE INDEX idx_discoveries_date ON public.discoveries(discovered_at DESC);
CREATE INDEX idx_favorites_user ON public.favorites(user_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
