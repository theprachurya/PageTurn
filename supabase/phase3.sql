-- =====================================================
-- Phase 3 Migration: Library Organization
-- Tags, Shelves, and Mapping Tables
-- =====================================================

-- 1. Tags Table
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#9333ea', -- Default purple
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- 2. Book Tags Mapping Table
CREATE TABLE book_tags (
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- Denormalized for easier RLS
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (book_id, tag_id)
);

-- 3. Shelves Table
CREATE TABLE shelves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- 4. Shelf Books Mapping Table
CREATE TABLE shelf_books (
    shelf_id UUID REFERENCES shelves(id) ON DELETE CASCADE,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- Denormalized for easier RLS
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (shelf_id, book_id)
);

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX idx_book_tags_book ON book_tags(book_id);
CREATE INDEX idx_book_tags_tag ON book_tags(tag_id);
CREATE INDEX idx_shelf_books_shelf ON shelf_books(shelf_id);
CREATE INDEX idx_shelf_books_book ON shelf_books(book_id);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE shelves ENABLE ROW LEVEL SECURITY;
ALTER TABLE shelf_books ENABLE ROW LEVEL SECURITY;

-- Tags Policies
CREATE POLICY "Users can view own tags" ON tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tags" ON tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tags" ON tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tags" ON tags FOR DELETE USING (auth.uid() = user_id);

-- Book Tags Policies
CREATE POLICY "Users can view own book_tags" ON book_tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own book_tags" ON book_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own book_tags" ON book_tags FOR DELETE USING (auth.uid() = user_id);

-- Shelves Policies
CREATE POLICY "Users can view own shelves" ON shelves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own shelves" ON shelves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own shelves" ON shelves FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own shelves" ON shelves FOR DELETE USING (auth.uid() = user_id);

-- Shelf Books Policies
CREATE POLICY "Users can view own shelf_books" ON shelf_books FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own shelf_books" ON shelf_books FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own shelf_books" ON shelf_books FOR DELETE USING (auth.uid() = user_id);
