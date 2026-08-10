-- =====================================================
-- PageTurn E-Reader: Complete Supabase Migration
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- =====================================================

-- 1. Custom Types
CREATE TYPE book_status AS ENUM ('plan_to_read', 'reading', 'completed');

-- 2. Profiles (Extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    daily_goal_minutes INT DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Books
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    author TEXT,
    description TEXT,
    cover_url TEXT,
    epub_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Books (The "Shelf" State)
CREATE TABLE user_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    status book_status DEFAULT 'reading',
    current_cfi TEXT,
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(user_id, book_id) 
);

-- 5. Reading Sessions
CREATE TABLE reading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE, 
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_minutes INT NOT NULL,
    chapter_name TEXT 
);

-- 6. Indexes for Performance
CREATE INDEX idx_sessions_user_date ON reading_sessions(user_id, session_date);
CREATE INDEX idx_user_books_last_read ON user_books(user_id, last_read_at DESC);
CREATE INDEX idx_books_user ON books(user_id);

-- =====================================================
-- 7. Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Books: Users can only CRUD their own books
CREATE POLICY "Users can view own books" ON books
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own books" ON books
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own books" ON books
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own books" ON books
  FOR DELETE USING (auth.uid() = user_id);

-- User Books: Users can only CRUD their own progress
CREATE POLICY "Users can view own user_books" ON user_books
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own user_books" ON user_books
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own user_books" ON user_books
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own user_books" ON user_books
  FOR DELETE USING (auth.uid() = user_id);

-- Reading Sessions: Users can only INSERT and SELECT their own sessions
CREATE POLICY "Users can view own sessions" ON reading_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON reading_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 8. Auto-create profile on new user signup
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 9. Storage Buckets & Policies
-- =====================================================

-- Auto-create the buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('epubs', 'epubs', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true) ON CONFLICT (id) DO NOTHING;

-- EPUBs bucket policies (Private)
CREATE POLICY "Users can upload own epubs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'epubs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read own epubs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'epubs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Covers bucket policies (Public read, authenticated write)
CREATE POLICY "Users can upload own covers"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'covers' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'covers');
