'use client';

// ─────────────────────────────────────────────────────────────────────────────
// ListingEditor — Full-screen slide-up modal for editing one item listing.
//
// Features:
//   • AI-filled title, description, price — all editable
//   • "Rewrite Description" → re-calls AI with current title + condition
//   • "Optimize for SEO" toggle  → reformats title/description
//   • "Sell Fast ↔ Max Profit" slider → adjusts price within min/max range
//   • Platform selectors (eBay, Facebook Marketplace, OfferUp)
//   • Condition picker
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import type { ItemResult, Platform } from '@/types';
import { PLATFORM_META, ALL_PLATFORMS, CONDITION_OPTIONS } from '@/types';

interface ListingEditorProps {
  item:     ItemResult;
  onSave:   (updates: Partial<ItemResult>) => void;
  onClose:  () => void;
}

// ── helpers ───────────────────────────────────────────────────────────────────

/** Interpolate price between priceMin (fast) and priceMax (profit) by slider. */
function calcPrice(item: ItemResult, slider: number): number {
  const lo = item.priceMin  || 0;
  const hi = item.priceMax  || lo;
  return Math.round(lo + (hi - lo) * (slider / 100));
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ListingEditor({ item, onSave, onClose }: ListingEditorProps) {
  const [title,       setTitle]       = useState(item.editedTitle   || item.title);
  const [price,       setPrice]       = useState(item.editedPrice   || String(item.priceSuggested || ''));
  const [condition,   setCondition]   = useState(item.editedCondition || item.condition || 'Good');
  const [notes,       setNotes]       = useState(item.editedNotes   || '');
  const [listing,     setListing]     = useState(item.listing       || '');
  const [seo,         setSeo]         = useState(item.seoOptimized  || false);
  const [slider,      setSlider]      = useState(item.pricingMode   ?? 50);
  const [platforms,   setPlatforms]   = useState<Platform[]>(
    item.selectedPlatforms?.length ? item.selectedPlatforms : ALL_PLATFORMS,
  );
  const [isRewriting, setIsRewriting] = useState(false);
  const [isSeoLoading,setIsSeoLoading]= useState(false);

  // ── Rewrite description ───────────────────────────────────────────────────
  const rewriteDescription = useCallback(async () => {
    if (isRewriting) return;
    setIsRewriting(true);
    try {
      const res  = await fetch('/api/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode:          'rewrite',
          title,
          condition,
          currentListing: listing,
          seoOptimize:   seo,
          imageBase64:   item.cropDataUrl.split(',')[1],
          mediaType:     'image/jpeg',
        }),
      });
      const data = await res.json() as { listing?: string; title?: string };
      if (data.listing) setListing(data.listing);
      if (data.title && seo) setTitle(data.title);
    } catch {
      /* keep existing listing */
    } finally {
      setIsRewriting(false);
    }
  }, [isRewriting, title, condition, listing, seo, item.cropDataUrl]);

  // ── SEO toggle ────────────────────────────────────────────────────────────
  const toggleSeo = async (val: boolean) => {
    setSeo(val);
    if (val && listing && !isRewriting) {
      setIsSeoLoading(true);
      try {
        const res  = await fetch('/api/analyze', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode:          'rewrite',
            title,
            condition,
            currentListing: listing,
            seoOptimize:   true,
            imageBase64:   item.cropDataUrl.split(',')[1],
            mediaType:     'image/jpeg',
          }),
        });
        const data = await res.json() as { listing?: string; title?: string };
        if (data.listing) setListing(data.listing);
        if (data.title)   setTitle(data.title);
      } catch { /* keep */ }
      setIsSeoLoading(false);
    }
  };

  // ── Price slider sync ─────────────────────────────────────────────────────
  const handleSlider = (val: number) => {
    setSlider(val);
    const computed = calcPrice(item, val);
    if (computed > 0) setPrice(String(computed));
  };

  // ── Platform toggle ───────────────────────────────────────────────────────
  const togglePlatform = (p: Platform) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = () => {
    onSave({
      editedTitle:       title,
      editedPrice:       price,
      editedCondition:   condition,
      editedNotes:       notes,
      listing,
      seoOptimized:      seo,
      pricingMode:       slider,
      selectedPlatforms: platforms,
    });
    onClose();
  };

  // ─────────────────────────────────────────────────────────────────────────
  const S = {
    label:   { fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.07em', textTransform: 'uppercase' as const, marginBottom: 6 },
    input:   { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', padding: '11px 14px', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none' },
    section: { marginBottom: 22 },
  };

  return (
    /* Backdrop */
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} onClick={onClose} />

      {/* Sheet */}
      <div
        style={{
          position:       'relative',
          zIndex:         1,
          background:     'var(--surface)',
          borderRadius:   '24px 24px 0 0',
          maxHeight:      '92dvh',
          overflowY:      'auto',
          fontFamily:     "'Inter', sans-serif",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 100, background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              Edit Listing
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>
              {item.detection.label}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--muted)', width: 32, height: 32, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '0 20px 32px' }}>

          {/* Item preview */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 24, padding: '14px', background: 'var(--surface2)', borderRadius: 16, border: '1px solid var(--border)' }}>
            <img
              src={item.cropDataUrl}
              alt={item.editedTitle}
              style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 12, flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Confidence badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                {item.confidenceScore > 0 && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: item.confidenceScore >= 80 ? 'rgba(74,222,128,0.12)' : item.confidenceScore >= 60 ? 'rgba(251,191,36,0.12)' : 'rgba(248,113,113,0.12)',
                    border: `1px solid ${item.confidenceScore >= 80 ? 'rgba(74,222,128,0.35)' : item.confidenceScore >= 60 ? 'rgba(251,191,36,0.35)' : 'rgba(248,113,113,0.35)'}`,
                    borderRadius: 100, padding: '3px 9px',
                    fontSize: '0.65rem', fontWeight: 700,
                    color: item.confidenceScore >= 80 ? '#4ade80' : item.confidenceScore >= 60 ? '#fbbf24' : '#f87171',
                  }}>
                    {item.confidenceScore}% confidence
                  </div>
                )}
                {item.aiValidated && (
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent)', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.25)', borderRadius: 100, padding: '3px 9px' }}>
                    AI Validated
                  </div>
                )}
              </div>
              {item.materials && (
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.5 }}>{item.materials}</div>
              )}
              {item.estimatedDimensions && (
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 3 }}>{item.estimatedDimensions}</div>
              )}
            </div>
          </div>

          {/* Title */}
          <div style={S.section}>
            <div style={S.label}>Title</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              style={S.input}
              placeholder="Item title (max 80 chars)"
            />
            <div style={{ textAlign: 'right', fontSize: '0.65rem', color: 'var(--muted)', marginTop: 4 }}>{title.length}/80</div>
          </div>

          {/* Price + Slider */}
          <div style={S.section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={S.label}>Price</div>
              {item.priceMin > 0 && (
                <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>
                  Range: ${item.priceMin} – ${item.priceMax}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
              <span style={{ color: 'var(--muted)', fontSize: '1rem', flexShrink: 0 }}>$</span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                style={{ ...S.input, width: 120, flexShrink: 0 }}
                min={0}
              />
              {item.priceMin > 0 && (
                <div style={{ flex: 1, fontSize: '0.68rem', color: 'var(--muted)', textAlign: 'right', lineHeight: 1.4 }}>
                  Suggested: <strong style={{ color: 'var(--text)' }}>${item.priceSuggested}</strong>
                </div>
              )}
            </div>

            {/* Sell Fast ↔ Max Profit slider */}
            {item.priceMin > 0 && item.priceMax > item.priceMin && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.68rem', color: '#4ade80', fontWeight: 700 }}>⚡ Sell Fast</span>
                  <span style={{ fontSize: '0.68rem', color: '#fbbf24', fontWeight: 700 }}>Max Profit 💰</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={slider}
                  onChange={(e) => handleSlider(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
                />
              </div>
            )}
          </div>

          {/* Condition */}
          <div style={S.section}>
            <div style={S.label}>Condition</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CONDITION_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCondition(c)}
                  style={{
                    background:   condition === c ? 'var(--accent)' : 'var(--surface2)',
                    border:       `1px solid ${condition === c ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 8,
                    color:        condition === c ? '#fff' : 'var(--muted)',
                    padding:      '7px 14px',
                    fontSize:     '0.78rem',
                    fontWeight:   600,
                    cursor:       'pointer',
                    fontFamily:   'inherit',
                    transition:   'all 0.15s',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Description + actions */}
          <div style={S.section}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={S.label}>Description</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {/* SEO toggle */}
                <button
                  onClick={() => toggleSeo(!seo)}
                  disabled={isSeoLoading}
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          6,
                    background:   seo ? 'rgba(108,99,255,0.15)' : 'var(--surface2)',
                    border:       `1px solid ${seo ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 8,
                    color:        seo ? 'var(--accent)' : 'var(--muted)',
                    padding:      '5px 10px',
                    fontSize:     '0.68rem',
                    fontWeight:   700,
                    cursor:       'pointer',
                    fontFamily:   'inherit',
                  }}
                >
                  {isSeoLoading ? '…' : `SEO ${seo ? 'ON' : 'OFF'}`}
                </button>

                {/* Rewrite */}
                <button
                  onClick={rewriteDescription}
                  disabled={isRewriting}
                  style={{
                    background:   'rgba(108,99,255,0.12)',
                    border:       '1px solid rgba(108,99,255,0.3)',
                    borderRadius: 8,
                    color:        isRewriting ? 'var(--muted)' : 'var(--accent)',
                    padding:      '5px 10px',
                    fontSize:     '0.68rem',
                    fontWeight:   700,
                    cursor:       isRewriting ? 'default' : 'pointer',
                    fontFamily:   'inherit',
                  }}
                >
                  {isRewriting ? '✨ Rewriting…' : '✨ Rewrite'}
                </button>
              </div>
            </div>

            <textarea
              value={listing}
              onChange={(e) => setListing(e.target.value)}
              rows={6}
              style={{ ...S.input, resize: 'vertical', lineHeight: 1.6 }}
              placeholder="Listing description will appear here after generation…"
            />
          </div>

          {/* Notes */}
          <div style={S.section}>
            <div style={S.label}>Private Notes (not posted)</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              style={{ ...S.input, resize: 'none', lineHeight: 1.6 }}
              placeholder="Storage location, purchase price, reminders…"
            />
          </div>

          {/* Platform selector */}
          <div style={S.section}>
            <div style={S.label}>Post to Platforms</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {ALL_PLATFORMS.map((p) => {
                const meta    = PLATFORM_META[p];
                const active  = platforms.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    style={{
                      flex:         1,
                      display:      'flex',
                      flexDirection: 'column',
                      alignItems:   'center',
                      gap:          5,
                      padding:      '12px 8px',
                      borderRadius: 12,
                      border:       `2px solid ${active ? meta.color : 'var(--border)'}`,
                      background:   active ? `${meta.color}18` : 'var(--surface2)',
                      cursor:       'pointer',
                      transition:   'all 0.15s',
                      fontFamily:   'inherit',
                    }}
                  >
                    <span style={{ fontSize: '1.4rem' }}>{meta.icon}</span>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: active ? meta.color : 'var(--muted)' }}>
                      {meta.label.split(' ')[0]}
                    </span>
                    {active && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            style={{
              display:      'block',
              width:        '100%',
              background:   'linear-gradient(135deg, var(--accent), var(--accent2))',
              border:       'none',
              borderRadius: 14,
              color:        '#fff',
              fontSize:     '1rem',
              fontWeight:   700,
              padding:      '16px',
              cursor:       'pointer',
              fontFamily:   'inherit',
              letterSpacing: '-0.01em',
              boxShadow:    '0 6px 24px rgba(108,99,255,0.38)',
            }}
          >
            Save Listing
          </button>
        </div>
      </div>
    </div>
  );
}
