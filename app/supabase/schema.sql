-- ═══════════════════════════════════════════════════════════════════════════
-- SNAPLIST — DATABASE SCHEMA
-- Run this in your Supabase project: Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable UUID extension (usually already enabled on Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES
-- Extends auth.users with public-facing user data
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT UNIQUE,
  full_name       TEXT,
  avatar_url      TEXT,
  bio             TEXT,
  location        TEXT,
  -- Seller stats (denormalized for fast reads)
  listing_count   INTEGER DEFAULT 0,
  sold_count      INTEGER DEFAULT 0,
  -- Timestamps
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- CATEGORIES
-- Predefined item categories
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  icon       TEXT,
  parent_id  UUID REFERENCES categories(id),
  sort_order INTEGER DEFAULT 0
);

-- Seed categories
INSERT INTO categories (name, slug, icon, sort_order) VALUES
  ('Electronics',        'electronics',   '📱', 1),
  ('Clothing',           'clothing',      '👕', 2),
  ('Shoes',              'shoes',         '👟', 3),
  ('Furniture',          'furniture',     '🛋️', 4),
  ('Books',              'books',         '📚', 5),
  ('Sports',             'sports',        '⚽', 6),
  ('Tools',              'tools',         '🔧', 7),
  ('Art & Collectibles', 'art',           '🎨', 8),
  ('Jewelry & Watches',  'jewelry',       '💍', 9),
  ('Bags & Accessories', 'bags',          '👜', 10),
  ('Home & Garden',      'home-garden',   '🏡', 11),
  ('Toys & Games',       'toys',          '🧸', 12),
  ('Musical Instruments','instruments',   '🎸', 13),
  ('Vehicles & Parts',   'vehicles',      '🚗', 14),
  ('Other',              'other',         '📦', 99)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- SCANS
-- Each photo upload that gets processed for item detection
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Storage
  original_image_url  TEXT NOT NULL,

  -- Detection output
  detected_objects    JSONB,         -- raw AI detection response
  item_count          INTEGER DEFAULT 0,

  -- Timing (for metrics)
  detection_duration_ms  INTEGER,    -- how long detection took
  listing_duration_ms    INTEGER,    -- how long generation took

  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SCAN DETECTIONS
-- Each individual object detected within a scan
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scan_detections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id         UUID REFERENCES scans(id) ON DELETE CASCADE NOT NULL,

  label           TEXT,
  confidence      TEXT,           -- "high" | "medium" | "low"

  -- Bounding box as fractions (0.0 – 1.0)
  bbox_x          NUMERIC,
  bbox_y          NUMERIC,
  bbox_w          NUMERIC,
  bbox_h          NUMERIC,

  crop_image_url  TEXT,           -- uploaded crop image URL

  -- Link to listing once created
  listing_id      UUID,           -- filled in after listing is created

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- LISTINGS
-- The core entity — a single item for sale
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scan_id         UUID REFERENCES scans(id) ON DELETE SET NULL,
  detection_id    UUID REFERENCES scan_detections(id) ON DELETE SET NULL,

  -- ── AI-generated values (stored separately from user edits) ──────────────
  ai_title        TEXT,
  ai_description  TEXT,
  ai_price_min    NUMERIC,
  ai_price_max    NUMERIC,
  ai_price        NUMERIC,
  ai_category     TEXT,
  ai_condition    TEXT,
  ai_tags         TEXT[],
  ai_confidence   INTEGER,        -- 0–100

  -- ── User-facing values (default to AI, overwritten on edit) ──────────────
  title           TEXT NOT NULL,
  description     TEXT,
  price           NUMERIC,
  category        TEXT,
  condition       TEXT,           -- "Excellent" | "Good" | "Fair" | "Poor"
  tags            TEXT[],

  -- ── Edit tracking (critical for metrics) ─────────────────────────────────
  title_edited        BOOLEAN DEFAULT FALSE,
  description_edited  BOOLEAN DEFAULT FALSE,
  price_edited        BOOLEAN DEFAULT FALSE,
  category_edited     BOOLEAN DEFAULT FALSE,

  -- ── Primary image ─────────────────────────────────────────────────────────
  primary_image_url   TEXT,

  -- ── Lifecycle ─────────────────────────────────────────────────────────────
  status          TEXT DEFAULT 'draft'
                  CHECK (status IN ('draft', 'published', 'sold', 'archived')),

  -- ── Engagement metrics (denormalized for speed) ───────────────────────────
  view_count      INTEGER DEFAULT 0,
  save_count      INTEGER DEFAULT 0,
  message_count   INTEGER DEFAULT 0,

  -- ── Location ─────────────────────────────────────────────────────────────
  location        TEXT,
  latitude        NUMERIC,
  longitude       NUMERIC,

  -- ── Timestamps ────────────────────────────────────────────────────────────
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  published_at    TIMESTAMPTZ,
  sold_at         TIMESTAMPTZ
);

-- ─────────────────────────────────────────────────────────────────────────────
-- LISTING IMAGES
-- Additional images per listing (beyond the primary crop)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listing_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  url         TEXT NOT NULL,
  position    INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SAVED LISTINGS
-- User bookmarks / saves
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_listings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_id  UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- CONVERSATIONS
-- One conversation per (buyer, listing) pair
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      UUID REFERENCES listings(id) ON DELETE SET NULL,
  buyer_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  seller_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, buyer_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- MESSAGES
-- Individual messages within a conversation
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content           TEXT NOT NULL,
  read              BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- LISTING EVENTS
-- Fine-grained event log for analytics (views, saves, shares, etc.)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listing_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  event_type  TEXT NOT NULL
              CHECK (event_type IN ('view', 'save', 'unsave', 'message', 'share', 'sold')),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_listings_user_id       ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_status        ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_published_at  ON listings(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_category      ON listings(category);
CREATE INDEX IF NOT EXISTS idx_scans_user_id          ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_detections_scan   ON scan_detections(scan_id);
CREATE INDEX IF NOT EXISTS idx_messages_convo         ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_saved_listings_user    ON saved_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listing_events_listing ON listing_events(listing_id, event_type);
CREATE INDEX IF NOT EXISTS idx_conversations_buyer    ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller   ON conversations(seller_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- AUTO-UPDATE updated_at
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

-- Profiles: public read, self write
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read"    ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_self_insert"    ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_self_update"    ON profiles FOR UPDATE USING (auth.uid() = id);

-- Scans: owner only
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scans_owner_all"         ON scans USING (auth.uid() = user_id);

-- Scan detections: owner only
ALTER TABLE scan_detections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "detections_owner_all"    ON scan_detections
  USING (scan_id IN (SELECT id FROM scans WHERE user_id = auth.uid()));

-- Listings: public read published, owner write
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "listings_public_read"    ON listings FOR SELECT
  USING (status = 'published' OR auth.uid() = user_id);
CREATE POLICY "listings_owner_insert"   ON listings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "listings_owner_update"   ON listings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "listings_owner_delete"   ON listings FOR DELETE USING (auth.uid() = user_id);

-- Listing images: public read, owner write
ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "listing_images_public_read" ON listing_images FOR SELECT USING (true);
CREATE POLICY "listing_images_owner_write" ON listing_images FOR INSERT
  WITH CHECK (listing_id IN (SELECT id FROM listings WHERE user_id = auth.uid()));

-- Saved listings: self only
ALTER TABLE saved_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_self_all"          ON saved_listings USING (auth.uid() = user_id);

-- Conversations: participants only
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "convo_participants"      ON conversations
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Messages: conversation participants only
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_participants"   ON messages
  USING (conversation_id IN (
    SELECT id FROM conversations
    WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
  ));

-- Events: public insert (views), owner read
ALTER TABLE listing_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_public_insert"    ON listing_events FOR INSERT WITH CHECK (true);
CREATE POLICY "events_owner_read"       ON listing_events FOR SELECT
  USING (listing_id IN (SELECT id FROM listings WHERE user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- STORAGE BUCKETS
-- Run these separately in Supabase Dashboard → Storage
-- Or via the API. They cannot be created with SQL directly.
-- ─────────────────────────────────────────────────────────────────────────────
-- Bucket: "scans"    — original scan images (private)
-- Bucket: "crops"    — cropped item images (public)
-- Bucket: "avatars"  — user avatars (public)
--
-- Quick setup via Supabase Dashboard:
--   1. Storage → New Bucket → "scans"  (private)
--   2. Storage → New Bucket → "crops"  (public)
--   3. Storage → New Bucket → "avatars" (public)
