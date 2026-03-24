"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

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
    --danger: #f87171;
    --radius: 16px;
    --radius-sm: 10px;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; min-height: 100vh; }

  /* HEADER */
  .hdr {
    position: sticky; top: 0; z-index: 100;
    background: rgba(8,8,15,0.92);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 12px;
    padding: 12px 16px;
  }
  .back-btn {
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--surface2); border: 1px solid var(--border2);
    color: var(--text); font-size: 1rem; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s; flex-shrink: 0;
  }
  .back-btn:hover { border-color: var(--accent); color: var(--accent); }
  .hdr-title { font-size: 0.9rem; font-weight: 700; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hdr-actions { display: flex; gap: 8px; }
  .icon-btn {
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--surface2); border: 1px solid var(--border2);
    color: var(--text); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
  }
  .icon-btn:hover { border-color: var(--accent); }
  .icon-btn.saved { background: rgba(255,106,176,0.15); border-color: var(--accent3); color: var(--accent3); }

  /* CONTENT */
  .content { max-width: 680px; margin: 0 auto; padding: 0 0 100px; }

  /* IMAGE */
  .img-wrap {
    aspect-ratio: 4/3;
    background: var(--surface2);
    overflow: hidden;
    position: relative;
  }
  .img-wrap img {
    width: 100%; height: 100%; object-fit: contain;
    background: var(--surface2);
    display: block;
  }
  .img-placeholder {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    font-size: 4rem; color: var(--border2);
  }
  .img-badges {
    position: absolute; top: 12px; left: 12px;
    display: flex; flex-direction: column; gap: 6px;
  }
  .badge {
    font-size: 0.6rem; font-weight: 700; padding: 4px 10px; border-radius: 100px;
    backdrop-filter: blur(8px); letter-spacing: 0.06em; text-transform: uppercase;
  }
  .badge-condition {
    background: rgba(8,8,15,0.8); border: 1px solid var(--border2); color: var(--text2);
  }
  .badge-category {
    background: rgba(124,111,255,0.2); border: 1px solid rgba(124,111,255,0.3); color: var(--accent);
  }

  /* LISTING INFO */
  .info { padding: 20px 16px 0; }
  .price-row { display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px; }
  .price { font-size: 2rem; font-weight: 900; letter-spacing: -0.04em; }
  .price-range { font-size: 0.72rem; color: var(--muted); }
  .title { font-size: 1.1rem; font-weight: 700; line-height: 1.4; margin-bottom: 12px; letter-spacing: -0.02em; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; }
  .tag {
    font-size: 0.62rem; color: var(--text2); border: 1px solid var(--border);
    padding: 3px 10px; border-radius: 6px; font-weight: 500;
  }
  .desc-label { font-size: 0.68rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
  .desc { font-size: 0.88rem; color: var(--text2); line-height: 1.75; white-space: pre-wrap; margin-bottom: 24px; }

  /* DIVIDER */
  .divider { height: 1px; background: var(--border); margin: 0 16px; }

  /* SELLER */
  .seller { padding: 18px 16px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: background 0.2s; }
  .seller:hover { background: var(--surface2); }
  .seller-avatar {
    width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    display: flex; align-items: center; justify-content: center;
    font-size: 1rem; font-weight: 700; overflow: hidden;
  }
  .seller-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .seller-info { flex: 1; }
  .seller-name { font-size: 0.88rem; font-weight: 700; margin-bottom: 3px; }
  .seller-meta { font-size: 0.68rem; color: var(--muted); }
  .seller-arrow { color: var(--muted); font-size: 1.1rem; }

  /* DETAILS GRID */
  .details { padding: 16px 16px 0; }
  .details-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .detail-card { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px 14px; }
  .detail-label { font-size: 0.6rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 5px; }
  .detail-value { font-size: 0.82rem; font-weight: 600; }

  /* STICKY CTA */
  .cta-bar {
    position: fixed; bottom: 0; left: 0; right: 0;
    background: rgba(8,8,15,0.96);
    backdrop-filter: blur(20px);
    border-top: 1px solid var(--border);
    padding: 12px 16px max(14px, env(safe-area-inset-bottom));
    display: flex; gap: 10px; align-items: center;
  }
  .btn-message {
    flex: 1;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    border: none; border-radius: var(--radius-sm);
    color: #fff; font-family: 'Inter', sans-serif;
    font-size: 0.92rem; font-weight: 700; padding: 14px;
    cursor: pointer; transition: all 0.2s;
    box-shadow: 0 4px 18px var(--glow);
  }
  .btn-message:hover { transform: translateY(-2px); box-shadow: 0 8px 28px var(--glow); }
  .btn-message:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  .btn-offer {
    background: var(--surface2); border: 1.5px solid var(--border2);
    color: var(--text); font-family: 'Inter', sans-serif;
    font-size: 0.88rem; font-weight: 600; padding: 14px 18px;
    border-radius: var(--radius-sm); cursor: pointer; transition: all 0.2s;
  }
  .btn-offer:hover { border-color: var(--accent); color: var(--accent); }

  /* MESSAGE MODAL */
  .modal-backdrop {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.75); backdrop-filter: blur(8px);
    z-index: 200; animation: fadeIn 0.15s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal {
    position: fixed; bottom: 0; left: 0; right: 0;
    background: var(--surface);
    border-top: 1px solid var(--border2);
    border-radius: 24px 24px 0 0;
    padding: 20px 16px max(24px, env(safe-area-inset-bottom));
    z-index: 201;
    animation: slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .modal-handle { width: 40px; height: 4px; background: var(--border2); border-radius: 2px; margin: 0 auto 16px; }
  .modal-title { font-size: 0.88rem; font-weight: 700; margin-bottom: 4px; }
  .modal-sub { font-size: 0.72rem; color: var(--muted); margin-bottom: 16px; }
  .quick-msgs { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
  .quick-btn {
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--text); font-family: 'Inter', sans-serif;
    font-size: 0.78rem; font-weight: 500; padding: 11px 14px;
    border-radius: var(--radius-sm); cursor: pointer; text-align: left;
    transition: all 0.2s; display: flex; align-items: center; justify-content: space-between;
  }
  .quick-btn:hover { border-color: var(--accent); color: var(--accent); }
  .modal-input {
    width: 100%;
    background: var(--surface2); border: 1.5px solid var(--border2);
    border-radius: var(--radius-sm); color: var(--text);
    font-family: 'Inter', sans-serif; font-size: 0.88rem;
    padding: 12px 14px; outline: none; resize: none;
    margin-bottom: 10px; transition: border-color 0.2s;
  }
  .modal-input:focus { border-color: var(--accent); }
  .btn-send {
    width: 100%;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    border: none; border-radius: var(--radius-sm);
    color: #fff; font-family: 'Inter', sans-serif;
    font-size: 0.92rem; font-weight: 700; padding: 13px;
    cursor: pointer; transition: all 0.2s;
    box-shadow: 0 4px 18px var(--glow);
  }
  .btn-send:disabled { opacity: 0.6; cursor: not-allowed; }

  /* LOADING */
  .loading { display: flex; align-items: center; justify-content: center; min-height: 60vh; }
  .spinner { width: 40px; height: 40px; border: 3px solid var(--border2); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* NOT FOUND */
  .not-found { text-align: center; padding: 80px 24px; }
  .not-found-icon { font-size: 3rem; margin-bottom: 14px; }
  .not-found-h { font-size: 1.15rem; font-weight: 800; margin-bottom: 8px; }
  .not-found-sub { font-size: 0.78rem; color: var(--text2); }
`;

const QUICK_MESSAGES = [
  "Is this still available?",
  "What's the lowest you'd take?",
  "Can I see more photos?",
  "Would you accept an offer?",
];

export default function ListingPage({ params }) {
  const { id } = params;
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    fetchListing();
  }, [id]);

  async function fetchListing() {
    setLoading(true);
    const { data, error } = await supabase
      .from("listings")
      .select(`
        *,
        profiles (
          id, username, full_name, avatar_url, listing_count, sold_count, created_at
        )
      `)
      .eq("id", id)
      .single();

    if (!error && data) {
      setListing(data);
      // Track view (fire-and-forget)
      supabase.from("listing_events").insert({
        listing_id: data.id,
        event_type: "view",
      }).then(() => {
        // Increment view count
        supabase.from("listings")
          .update({ view_count: (data.view_count || 0) + 1 })
          .eq("id", data.id);
      });
    }
    setLoading(false);
  }

  // Check saved status
  useEffect(() => {
    if (!user || !listing) return;
    supabase
      .from("saved_listings")
      .select("id")
      .eq("user_id", user.id)
      .eq("listing_id", listing.id)
      .single()
      .then(({ data }) => setIsSaved(!!data));
  }, [user, listing]);

  async function handleSave() {
    if (!user) { window.location.href = "/auth"; return; }
    if (isSaved) {
      await supabase.from("saved_listings")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", listing.id);
      setIsSaved(false);
    } else {
      await supabase.from("saved_listings")
        .insert({ user_id: user.id, listing_id: listing.id });
      setIsSaved(true);
    }
  }

  async function handleSendMessage(text) {
    if (!user) { window.location.href = "/auth"; return; }
    if (!text.trim()) return;
    setSending(true);

    try {
      // Find or create conversation
      let { data: convo } = await supabase
        .from("conversations")
        .select("id")
        .eq("listing_id", listing.id)
        .eq("buyer_id", user.id)
        .single();

      if (!convo) {
        const { data: newConvo, error } = await supabase
          .from("conversations")
          .insert({
            listing_id: listing.id,
            buyer_id: user.id,
            seller_id: listing.user_id,
          })
          .select()
          .single();
        if (error) throw error;
        convo = newConvo;
      }

      // Send message
      const { error: msgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: convo.id,
          sender_id: user.id,
          content: text.trim(),
        });

      if (msgError) throw msgError;

      // Update conversation last_message_at
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", convo.id);

      // Track message event
      await supabase.from("listing_events").insert({
        listing_id: listing.id,
        event_type: "message",
        user_id: user.id,
      });

      setSent(true);
      setMessage("");
      setTimeout(() => {
        setShowMessageModal(false);
        setSent(false);
        window.location.href = "/messages";
      }, 1500);
    } catch (err) {
      console.error("[Message]", err);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <>
        <style>{STYLES}</style>
        <div className="loading"><div className="spinner" /></div>
      </>
    );
  }

  if (!listing) {
    return (
      <>
        <style>{STYLES}</style>
        <div className="not-found">
          <div className="not-found-icon">🔍</div>
          <div className="not-found-h">Listing not found</div>
          <div className="not-found-sub">This item may have been removed or sold.</div>
        </div>
      </>
    );
  }

  const seller = listing.profiles;
  const sellerName = seller?.full_name || seller?.username || "Seller";
  const sellerInitial = sellerName[0]?.toUpperCase() || "?";
  const isOwnListing = user?.id === listing.user_id;

  const memberSince = seller?.created_at
    ? new Date(seller.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : null;

  return (
    <>
      <style>{STYLES}</style>

      {/* HEADER */}
      <header className="hdr">
        <button className="back-btn" onClick={() => window.history.back()}>←</button>
        <div className="hdr-title">{listing.title}</div>
        <div className="hdr-actions">
          <button
            className={`icon-btn${isSaved ? " saved" : ""}`}
            onClick={handleSave}
            title={isSaved ? "Unsave" : "Save"}
          >
            {isSaved ? "♥" : "♡"}
          </button>
          <button
            className="icon-btn"
            onClick={() => {
              navigator.share?.({
                title: listing.title,
                text: `$${listing.price} — ${listing.title}`,
                url: window.location.href,
              }).catch(() => {
                navigator.clipboard?.writeText(window.location.href);
              });
            }}
          >
            ↑
          </button>
        </div>
      </header>

      <div className="content">
        {/* IMAGE */}
        <div className="img-wrap">
          {listing.primary_image_url ? (
            <img src={listing.primary_image_url} alt={listing.title} />
          ) : (
            <div className="img-placeholder">📦</div>
          )}
          <div className="img-badges">
            {listing.condition && (
              <span className="badge badge-condition">{listing.condition}</span>
            )}
            {listing.category && (
              <span className="badge badge-category">{listing.category}</span>
            )}
          </div>
        </div>

        {/* INFO */}
        <div className="info">
          <div className="price-row">
            <div className="price">${Number(listing.price || 0).toFixed(0)}</div>
            {listing.ai_price_min && listing.ai_price_max && (
              <div className="price-range">
                Est. ${listing.ai_price_min}–${listing.ai_price_max}
              </div>
            )}
          </div>
          <div className="title">{listing.title}</div>
          {listing.tags?.length > 0 && (
            <div className="tags">
              {listing.tags.map((t, i) => (
                <span key={i} className="tag">{t}</span>
              ))}
            </div>
          )}
          {listing.description && (
            <>
              <div className="desc-label">Description</div>
              <div className="desc">{listing.description}</div>
            </>
          )}
        </div>

        <div className="divider" />

        {/* SELLER */}
        {seller && (
          <div
            className="seller"
            onClick={() => window.location.href = `/profile/${seller.id}`}
          >
            <div className="seller-avatar">
              {seller.avatar_url ? (
                <img src={seller.avatar_url} alt={sellerName} />
              ) : sellerInitial}
            </div>
            <div className="seller-info">
              <div className="seller-name">{sellerName}</div>
              <div className="seller-meta">
                {seller.sold_count || 0} sold · {seller.listing_count || 0} listings
                {memberSince ? ` · Since ${memberSince}` : ""}
              </div>
            </div>
            <div className="seller-arrow">›</div>
          </div>
        )}

        <div className="divider" />

        {/* DETAILS */}
        <div className="details">
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
            Item Details
          </div>
          <div className="details-grid">
            <div className="detail-card">
              <div className="detail-label">Condition</div>
              <div className="detail-value">{listing.condition || "Not specified"}</div>
            </div>
            <div className="detail-card">
              <div className="detail-label">Category</div>
              <div className="detail-value">{listing.category || "Other"}</div>
            </div>
            <div className="detail-card">
              <div className="detail-label">Views</div>
              <div className="detail-value">{listing.view_count || 0}</div>
            </div>
            <div className="detail-card">
              <div className="detail-label">Listed</div>
              <div className="detail-value">
                {listing.published_at
                  ? new Date(listing.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : "Recently"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STICKY CTA */}
      {!isOwnListing && (
        <div className="cta-bar">
          <button
            className="btn-offer"
            onClick={() => {
              setMessage(`I'd like to offer $${Math.round((listing.price || 0) * 0.85)} for this item. Is that acceptable?`);
              setShowMessageModal(true);
            }}
          >
            Make Offer
          </button>
          <button
            className="btn-message"
            onClick={() => {
              setMessage("");
              setShowMessageModal(true);
            }}
          >
            💬 Message Seller
          </button>
        </div>
      )}

      {isOwnListing && (
        <div className="cta-bar">
          <button
            className="btn-message"
            onClick={() => window.location.href = "/messages"}
          >
            View Messages
          </button>
          <button
            className="btn-offer"
            onClick={() => window.location.href = `/listing/${id}/edit`}
          >
            Edit Listing
          </button>
        </div>
      )}

      {/* MESSAGE MODAL */}
      {showMessageModal && (
        <>
          <div className="modal-backdrop" onClick={() => setShowMessageModal(false)} />
          <div className="modal">
            <div className="modal-handle" />
            {sent ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: "2rem", marginBottom: "10px" }}>✅</div>
                <div style={{ fontWeight: 700, marginBottom: "4px" }}>Message sent!</div>
                <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                  Redirecting to your messages...
                </div>
              </div>
            ) : (
              <>
                <div className="modal-title">Message {sellerName}</div>
                <div className="modal-sub">Re: {listing.title} · ${listing.price}</div>
                <div className="quick-msgs">
                  {QUICK_MESSAGES.map((q) => (
                    <button
                      key={q}
                      className="quick-btn"
                      onClick={() => handleSendMessage(q)}
                    >
                      {q} <span>›</span>
                    </button>
                  ))}
                </div>
                <textarea
                  className="modal-input"
                  placeholder="Write a custom message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
                <button
                  className="btn-send"
                  onClick={() => handleSendMessage(message)}
                  disabled={!message.trim() || sending}
                >
                  {sending ? "Sending..." : "Send Message"}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
