"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  :root {
    --bg: #08080f;
    --surface: #10101a;
    --surface2: #18182a;
    --border: #2a2a45;
    --border2: #35355a;
    --accent: #7c6fff;
    --accent2: #b06aff;
    --accent3: #ff6ab0;
    --glow: rgba(124,111,255,0.25);
    --text: #f0f0ff;
    --text2: #a0a0c0;
    --muted: #5a5a80;
    --success: #4ade80;
    --radius: 16px;
    --radius-sm: 10px;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; }

  /* ── NAV ── */
  .nav {
    position: sticky; top: 0; z-index: 100;
    background: rgba(8,8,15,0.92);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px;
    gap: 12px;
  }
  .nav-logo { font-size: 1.15rem; font-weight: 900; letter-spacing: -0.04em; cursor: pointer; }
  .nav-logo span { background: linear-gradient(135deg, var(--accent), var(--accent2), var(--accent3)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .nav-search {
    flex: 1; max-width: 340px;
    background: var(--surface2);
    border: 1.5px solid var(--border2);
    border-radius: 100px;
    color: var(--text);
    font-family: 'Inter', sans-serif;
    font-size: 0.82rem;
    padding: 8px 16px 8px 36px;
    outline: none;
    transition: border-color 0.2s;
  }
  .nav-search:focus { border-color: var(--accent); }
  .nav-search::placeholder { color: var(--muted); }
  .search-wrap { position: relative; flex: 1; max-width: 340px; }
  .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 0.75rem; pointer-events: none; }
  .nav-right { display: flex; align-items: center; gap: 8px; }
  .btn-scan {
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    border: none; border-radius: 100px;
    color: #fff; font-family: 'Inter', sans-serif; font-size: 0.78rem; font-weight: 700;
    padding: 8px 16px; cursor: pointer;
    box-shadow: 0 4px 14px var(--glow);
    white-space: nowrap;
  }
  .btn-scan:hover { transform: scale(1.04); }
  .nav-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    display: flex; align-items: center; justify-content: center;
    font-size: 0.7rem; font-weight: 700; cursor: pointer;
    overflow: hidden; flex-shrink: 0;
  }
  .nav-avatar img { width: 100%; height: 100%; object-fit: cover; }

  /* ── CATEGORIES ── */
  .cats {
    display: flex; gap: 8px; padding: 12px 16px;
    overflow-x: auto; border-bottom: 1px solid var(--border);
    scrollbar-width: none;
  }
  .cats::-webkit-scrollbar { display: none; }
  .cat-pill {
    flex-shrink: 0;
    background: var(--surface2); border: 1px solid var(--border2);
    border-radius: 100px; color: var(--text2);
    font-family: 'Inter', sans-serif; font-size: 0.72rem; font-weight: 600;
    padding: 6px 14px; cursor: pointer; transition: all 0.2s; white-space: nowrap;
  }
  .cat-pill.active { background: var(--accent); border-color: var(--accent); color: #fff; }
  .cat-pill:hover:not(.active) { border-color: var(--accent); color: var(--accent); }

  /* ── FEED GRID ── */
  .feed { padding: 14px 12px 80px; }
  .feed-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  @media (min-width: 640px) { .feed-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (min-width: 900px) { .feed-grid { grid-template-columns: repeat(4, 1fr); } }
  @media (min-width: 1200px) { .feed-grid { grid-template-columns: repeat(5, 1fr); } }

  /* ── LISTING CARD ── */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }
  .card:hover { border-color: rgba(124,111,255,0.4); transform: translateY(-3px); box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
  .card-img {
    aspect-ratio: 3/4;
    background: var(--surface2);
    overflow: hidden;
    position: relative;
  }
  .card-img img {
    width: 100%; height: 100%; object-fit: cover; display: block;
    transition: transform 0.35s;
  }
  .card:hover .card-img img { transform: scale(1.07); }
  .card-img-placeholder {
    width: 100%; height: 100%;
    background: linear-gradient(135deg, var(--surface2), var(--surface));
    display: flex; align-items: center; justify-content: center;
    font-size: 2.5rem; color: var(--border2);
  }
  .card-save {
    position: absolute; top: 8px; right: 8px;
    width: 30px; height: 30px;
    background: rgba(8,8,15,0.75);
    backdrop-filter: blur(6px);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.2s;
    font-size: 0.85rem;
    z-index: 2;
  }
  .card-save:hover, .card-save.saved { background: var(--accent3); border-color: var(--accent3); }
  .card-body { padding: 10px 12px 12px; }
  .card-price {
    font-size: 1.05rem; font-weight: 800; letter-spacing: -0.03em;
    margin-bottom: 3px;
  }
  .card-title {
    font-size: 0.72rem; color: var(--text2);
    overflow: hidden; text-overflow: ellipsis;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    line-height: 1.4; margin-bottom: 7px;
  }
  .card-footer {
    display: flex; align-items: center; gap: 6px;
  }
  .seller-avatar {
    width: 18px; height: 18px; border-radius: 50%;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    display: flex; align-items: center; justify-content: center;
    font-size: 0.5rem; font-weight: 700; flex-shrink: 0; overflow: hidden;
  }
  .seller-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .seller-name { font-size: 0.62rem; color: var(--muted); }
  .card-condition {
    font-size: 0.58rem; font-weight: 600;
    padding: 2px 7px; border-radius: 5px;
    margin-left: auto; flex-shrink: 0;
    background: rgba(124,111,255,0.12);
    color: var(--accent);
    border: 1px solid rgba(124,111,255,0.2);
  }

  /* ── EMPTY STATE ── */
  .empty { text-align: center; padding: 80px 24px; }
  .empty-icon { font-size: 3rem; margin-bottom: 16px; }
  .empty-h { font-size: 1.15rem; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.03em; }
  .empty-sub { font-size: 0.78rem; color: var(--text2); margin-bottom: 24px; }

  /* ── LOAD MORE ── */
  .load-more-wrap { text-align: center; padding: 20px; }
  .btn-load {
    background: var(--surface2); border: 1.5px solid var(--border2);
    color: var(--text2); font-family: 'Inter', sans-serif; font-size: 0.82rem; font-weight: 600;
    padding: 10px 28px; border-radius: 100px; cursor: pointer;
    transition: all 0.2s;
  }
  .btn-load:hover { border-color: var(--accent); color: var(--accent); }

  /* ── SKELETON ── */
  .skeleton-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .skeleton-img { aspect-ratio: 3/4; background: var(--surface2); position: relative; overflow: hidden; }
  .skeleton-body { padding: 10px 12px 12px; }
  .skeleton-line { height: 12px; border-radius: 6px; background: var(--surface2); margin-bottom: 8px; position: relative; overflow: hidden; }
  .skeleton-line:last-child { width: 60%; margin-bottom: 0; }
  .skeleton-img::after, .skeleton-line::after {
    content: '';
    position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent);
    animation: shimmer 1.5s infinite;
  }
  @keyframes shimmer { to { left: 100%; } }

  /* ── BOTTOM NAV (mobile) ── */
  .bottom-nav {
    position: fixed; bottom: 0; left: 0; right: 0;
    background: rgba(8,8,15,0.95);
    backdrop-filter: blur(20px);
    border-top: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-around;
    padding: 10px 0 max(10px, env(safe-area-inset-bottom));
    z-index: 100;
  }
  .bnav-btn {
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    background: none; border: none; color: var(--muted);
    font-family: 'Inter', sans-serif; font-size: 0.55rem; font-weight: 600;
    cursor: pointer; padding: 4px 16px; transition: color 0.2s;
    letter-spacing: 0.04em; text-transform: uppercase;
  }
  .bnav-btn.active { color: var(--accent); }
  .bnav-btn svg, .bnav-icon { font-size: 1.15rem; }
  .bnav-scan {
    width: 48px; height: 48px; border-radius: 50%;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    display: flex; align-items: center; justify-content: center;
    font-size: 1.3rem;
    box-shadow: 0 4px 18px var(--glow);
    cursor: pointer; transition: transform 0.2s;
    border: none; flex-shrink: 0;
  }
  .bnav-scan:hover { transform: scale(1.08); }
`;

const CATEGORIES = [
  { label: "All", value: null, icon: "✨" },
  { label: "Electronics", value: "electronics", icon: "📱" },
  { label: "Clothing", value: "clothing", icon: "👕" },
  { label: "Shoes", value: "shoes", icon: "👟" },
  { label: "Furniture", value: "furniture", icon: "🛋️" },
  { label: "Books", value: "books", icon: "📚" },
  { label: "Sports", value: "sports", icon: "⚽" },
  { label: "Art", value: "art", icon: "🎨" },
  { label: "Jewelry", value: "jewelry", icon: "💍" },
  { label: "Other", value: "other", icon: "📦" },
];

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-img" />
      <div className="skeleton-body">
        <div className="skeleton-line" style={{ width: "50%", height: "16px", marginBottom: "10px" }} />
        <div className="skeleton-line" />
        <div className="skeleton-line" />
      </div>
    </div>
  );
}

function ListingCard({ listing, onSave, savedIds }) {
  const seller = listing.profiles;
  const isSaved = savedIds?.has(listing.id);
  const sellerName = seller?.full_name || seller?.username || "Seller";
  const initial = sellerName[0]?.toUpperCase() || "?";

  function handleSave(e) {
    e.stopPropagation();
    onSave?.(listing.id);
  }

  function goToListing() {
    window.location.href = `/listing/${listing.id}`;
  }

  return (
    <div className="card" onClick={goToListing}>
      <div className="card-img">
        {listing.primary_image_url ? (
          <img src={listing.primary_image_url} alt={listing.title} loading="lazy" />
        ) : (
          <div className="card-img-placeholder">📦</div>
        )}
        <button
          className={`card-save${isSaved ? " saved" : ""}`}
          onClick={handleSave}
          title={isSaved ? "Unsave" : "Save"}
        >
          {isSaved ? "♥" : "♡"}
        </button>
      </div>
      <div className="card-body">
        <div className="card-price">${Number(listing.price || 0).toFixed(0)}</div>
        <div className="card-title">{listing.title}</div>
        <div className="card-footer">
          <div className="seller-avatar">
            {seller?.avatar_url ? (
              <img src={seller.avatar_url} alt={sellerName} />
            ) : initial}
          </div>
          <div className="seller-name">{sellerName}</div>
          {listing.condition && (
            <div className="card-condition">{listing.condition}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FeedPage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [category, setCategory] = useState(null);
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [user, setUser] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());
  const searchTimer = useRef(null);

  // Check auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  // Load saved listings
  useEffect(() => {
    if (!user) return;
    supabase
      .from("saved_listings")
      .select("listing_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setSavedIds(new Set(data.map((r) => r.listing_id)));
      });
  }, [user]);

  // Fetch feed
  const fetchListings = useCallback(async (reset = true) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({ limit: "20" });
      if (category) params.set("category", category);
      if (query) params.set("q", query);
      if (!reset && cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/feed?${params}`);
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      if (reset) {
        setListings(data.listings || []);
      } else {
        setListings((prev) => [...prev, ...(data.listings || [])]);
      }
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error("[Feed]", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [category, query, cursor]);

  useEffect(() => { fetchListings(true); }, [category, query]);

  // Debounced search
  function handleSearchChange(e) {
    const val = e.target.value;
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setQuery(val), 400);
  }

  async function handleSave(listingId) {
    if (!user) {
      window.location.href = "/auth";
      return;
    }
    const isSaved = savedIds.has(listingId);
    if (isSaved) {
      await supabase
        .from("saved_listings")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", listingId);
      setSavedIds((prev) => { const s = new Set(prev); s.delete(listingId); return s; });
    } else {
      await supabase
        .from("saved_listings")
        .insert({ user_id: user.id, listing_id: listingId });
      setSavedIds((prev) => new Set([...prev, listingId]));
    }
  }

  const initial = user?.email?.[0]?.toUpperCase() || "?";

  return (
    <>
      <style>{STYLES}</style>

      {/* ── NAV ── */}
      <nav className="nav">
        <div className="nav-logo" onClick={() => window.location.href = "/"}>
          FLIP<span>R</span>
        </div>

        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="nav-search"
            type="search"
            placeholder="Search listings..."
            value={searchInput}
            onChange={handleSearchChange}
          />
        </div>

        <div className="nav-right">
          <button className="btn-scan" onClick={() => window.location.href = "/"}>
            ⚡ Flip
          </button>
          {user ? (
            <div
              className="nav-avatar"
              title={user.email}
              onClick={() => window.location.href = "/profile"}
            >
              {user.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="" />
              ) : initial}
            </div>
          ) : (
            <button
              className="btn-scan"
              style={{ background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text)", boxShadow: "none" }}
              onClick={() => window.location.href = "/auth"}
            >
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* ── CATEGORIES ── */}
      <div className="cats">
        {CATEGORIES.map((c) => (
          <button
            key={c.label}
            className={`cat-pill${category === c.value ? " active" : ""}`}
            onClick={() => setCategory(c.value)}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* ── FEED ── */}
      <div className="feed">
        {loading ? (
          <div className="feed-grid">
            {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : listings.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📦</div>
            <div className="empty-h">No listings yet</div>
            <div className="empty-sub">
              {query ? `No results for "${query}"` : "Be the first to post something!"}
            </div>
            <button className="btn-scan" onClick={() => window.location.href = "/"}>
              ⚡ Start Flipping
            </button>
          </div>
        ) : (
          <>
            <div className="feed-grid">
              {listings.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  onSave={handleSave}
                  savedIds={savedIds}
                />
              ))}
            </div>
            {hasMore && (
              <div className="load-more-wrap">
                <button
                  className="btn-load"
                  onClick={() => fetchListings(false)}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── BOTTOM NAV (mobile) ── */}
      <nav className="bottom-nav">
        <button className="bnav-btn active" onClick={() => window.location.href = "/feed"}>
          <span className="bnav-icon">🏠</span>
          Feed
        </button>
        <button className="bnav-btn" onClick={() => window.location.href = "/feed?category=nearby"}>
          <span className="bnav-icon">📍</span>
          Nearby
        </button>
        <button className="bnav-scan" onClick={() => window.location.href = "/"}>
          📷
        </button>
        <button className="bnav-btn" onClick={() => user ? (window.location.href = "/messages") : (window.location.href = "/auth")}>
          <span className="bnav-icon">💬</span>
          Messages
        </button>
        <button className="bnav-btn" onClick={() => user ? (window.location.href = "/profile") : (window.location.href = "/auth")}>
          <span className="bnav-icon">👤</span>
          Profile
        </button>
      </nav>
    </>
  );
}
