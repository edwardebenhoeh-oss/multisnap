'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PostingScreen — Multi-platform posting hub.
//
// Shows one card per platform (eBay, Facebook Marketplace, OfferUp).
// "Post All Listings" triggers a simulated async post per platform with
// realistic progress bars. Each card shows:
//   • Platform logo + name
//   • Number of items selected for that platform
//   • Toggle to include / exclude
//   • Real-time progress bar during posting
//   • Success URL chip or error retry on completion
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect } from 'react';
import type { ItemResult, Platform, PlatformPostStatus } from '@/types';
import { PLATFORM_META, ALL_PLATFORMS, defaultPostingState } from '@/types';

interface PostingScreenProps {
  items:      ItemResult[];
  onComplete: (items: ItemResult[]) => void;
  onBack:     () => void;
}

// ── Simulate posting one item to one platform ─────────────────────────────────
async function simulatePost(
  onProgress: (pct: number) => void,
): Promise<{ success: boolean; url?: string; error?: string }> {
  // Simulate 2–5s posting time
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await new Promise((r) => setTimeout(r, 150 + Math.random() * 200));
    onProgress(Math.round((i / steps) * 100));
  }
  const ok = Math.random() > 0.08; // 92% success rate
  if (ok) return { success: true, url: `https://listing.example.com/${Math.random().toString(36).slice(2, 8)}` };
  return { success: false, error: 'Connection timeout. Tap to retry.' };
}

// ─────────────────────────────────────────────────────────────────────────────
export default function PostingScreen({ items, onComplete, onBack }: PostingScreenProps) {
  type PlatformState = { status: PlatformPostStatus; progress: number; url?: string; error?: string; enabled: boolean };
  type AllPlatformState = Record<Platform, PlatformState>;

  const [platforms, setPlatforms] = useState<AllPlatformState>(() =>
    Object.fromEntries(
      ALL_PLATFORMS.map((p) => [p, { status: 'idle' as PlatformPostStatus, progress: 0, enabled: true }]),
    ) as AllPlatformState,
  );

  const [isPosting,    setIsPosting]    = useState(false);
  const [allDone,      setAllDone]      = useState(false);
  const [totalPosted,  setTotalPosted]  = useState(0);

  // Which items are going to each platform
  const itemsForPlatform = useCallback(
    (p: Platform) => items.filter((it) => (it.selectedPlatforms ?? ALL_PLATFORMS).includes(p) && it.isGenerated),
    [items],
  );

  // ── Post all ─────────────────────────────────────────────────────────────
  const postAll = useCallback(async () => {
    if (isPosting) return;
    setIsPosting(true);

    const enabledPlatforms = ALL_PLATFORMS.filter((p) => platforms[p].enabled);

    // Mark all enabled as queued
    setPlatforms((prev) => {
      const next = { ...prev };
      enabledPlatforms.forEach((p) => { next[p] = { ...next[p], status: 'queued', progress: 0 }; });
      return next;
    });

    // Post each platform concurrently
    let posted = 0;
    await Promise.all(
      enabledPlatforms.map(async (p) => {
        // Small stagger for visual polish
        await new Promise((r) => setTimeout(r, ALL_PLATFORMS.indexOf(p) * 350));

        setPlatforms((prev) => ({ ...prev, [p]: { ...prev[p], status: 'posting' } }));

        const result = await simulatePost((pct) => {
          setPlatforms((prev) => ({ ...prev, [p]: { ...prev[p], progress: pct } }));
        });

        setPlatforms((prev) => ({
          ...prev,
          [p]: {
            ...prev[p],
            status:   result.success ? 'success' : 'error',
            url:      result.url,
            error:    result.error,
            progress: result.success ? 100 : prev[p].progress,
          },
        }));

        if (result.success) posted++;
      }),
    );

    setTotalPosted(posted);
    setAllDone(true);
    setIsPosting(false);
  }, [isPosting, platforms]);

  // ── Retry one platform ────────────────────────────────────────────────────
  const retryPlatform = useCallback(async (p: Platform) => {
    setPlatforms((prev) => ({ ...prev, [p]: { ...prev[p], status: 'posting', progress: 0, error: undefined } }));

    const result = await simulatePost((pct) => {
      setPlatforms((prev) => ({ ...prev, [p]: { ...prev[p], progress: pct } }));
    });

    setPlatforms((prev) => ({
      ...prev,
      [p]: { ...prev[p], status: result.success ? 'success' : 'error', url: result.url, error: result.error, progress: result.success ? 100 : prev[p].progress },
    }));
  }, []);

  const togglePlatform = (p: Platform) => {
    if (isPosting) return;
    setPlatforms((prev) => ({ ...prev, [p]: { ...prev[p], enabled: !prev[p].enabled } }));
  };

  const totalItems   = items.filter((it) => it.isGenerated).length;
  const enabledCount = ALL_PLATFORMS.filter((p) => platforms[p].enabled).length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight:   '100dvh',
        background:  'var(--bg)',
        color:       'var(--text)',
        fontFamily:  "'Inter', sans-serif",
        paddingBottom: 40,
      }}
    >
      {/* Header */}
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          gap:            12,
          padding:        '20px 20px 0',
          marginBottom:   24,
        }}
      >
        <button
          onClick={onBack}
          disabled={isPosting}
          style={{
            background:   'var(--surface2)',
            border:       '1px solid var(--border)',
            borderRadius: 10,
            color:        'var(--muted)',
            padding:      '8px 14px',
            fontSize:     '0.82rem',
            cursor:       isPosting ? 'default' : 'pointer',
            fontFamily:   'inherit',
          }}
        >
          ← Back
        </button>
        <div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Post Listings
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>
            {totalItems} item{totalItems !== 1 ? 's' : ''} ready · {enabledCount} platform{enabledCount !== 1 ? 's' : ''} selected
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>

        {/* ── Platform cards ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {ALL_PLATFORMS.map((p) => {
            const meta  = PLATFORM_META[p];
            const ps    = platforms[p];
            const count = itemsForPlatform(p).length;

            return (
              <div
                key={p}
                style={{
                  background:   'var(--surface)',
                  border:       `1px solid ${ps.enabled ? `${meta.color}55` : 'var(--border)'}`,
                  borderRadius: 18,
                  padding:      '18px 18px 16px',
                  opacity:      ps.enabled ? 1 : 0.5,
                  transition:   'all 0.2s',
                }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: ps.status === 'idle' || ps.status === 'queued' ? 0 : 14 }}>
                  {/* Platform icon */}
                  <div
                    style={{
                      width:        48,
                      height:       48,
                      borderRadius: 14,
                      background:   `${meta.color}18`,
                      border:       `1px solid ${meta.color}44`,
                      display:      'flex',
                      alignItems:   'center',
                      justifyContent: 'center',
                      fontSize:     '1.6rem',
                      flexShrink:   0,
                    }}
                  >
                    {meta.icon}
                  </div>

                  {/* Name + count */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{meta.label}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>
                      {count} item{count !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Status / toggle */}
                  {ps.status === 'idle' || ps.status === 'queued' ? (
                    <button
                      onClick={() => togglePlatform(p)}
                      style={{
                        width:        42,
                        height:       24,
                        borderRadius: 100,
                        background:   ps.enabled ? meta.color : 'var(--border)',
                        border:       'none',
                        cursor:       isPosting ? 'default' : 'pointer',
                        position:     'relative',
                        transition:   'background 0.2s',
                        flexShrink:   0,
                      }}
                    >
                      <div
                        style={{
                          position:   'absolute',
                          top:        3,
                          left:       ps.enabled ? 21 : 3,
                          width:      18,
                          height:     18,
                          borderRadius: '50%',
                          background: '#fff',
                          transition: 'left 0.2s',
                        }}
                      />
                    </button>
                  ) : ps.status === 'success' ? (
                    <div
                      style={{
                        display:    'flex',
                        alignItems: 'center',
                        gap:        5,
                        background: 'rgba(74,222,128,0.12)',
                        border:     '1px solid rgba(74,222,128,0.35)',
                        borderRadius: 100,
                        padding:    '5px 12px',
                        fontSize:   '0.7rem',
                        fontWeight: 700,
                        color:      '#4ade80',
                      }}
                    >
                      ✓ Posted
                    </div>
                  ) : ps.status === 'error' ? (
                    <button
                      onClick={() => retryPlatform(p)}
                      style={{
                        background:   'rgba(248,113,113,0.12)',
                        border:       '1px solid rgba(248,113,113,0.35)',
                        borderRadius: 100,
                        padding:      '5px 12px',
                        fontSize:     '0.7rem',
                        fontWeight:   700,
                        color:        '#f87171',
                        cursor:       'pointer',
                        fontFamily:   'inherit',
                      }}
                    >
                      ↺ Retry
                    </button>
                  ) : (
                    /* posting spinner */
                    <div
                      style={{
                        width:        22,
                        height:       22,
                        border:       '2.5px solid rgba(255,255,255,0.15)',
                        borderTop:    `2.5px solid ${meta.color}`,
                        borderRadius: '50%',
                        animation:    'ms-spin 0.8s linear infinite',
                        flexShrink:   0,
                      }}
                    />
                  )}
                </div>

                {/* Progress bar (posting or success) */}
                {(ps.status === 'posting' || ps.status === 'success') && (
                  <div>
                    <div
                      style={{
                        height:       5,
                        borderRadius: 100,
                        background:   'var(--surface2)',
                        overflow:     'hidden',
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          height:     '100%',
                          width:      `${ps.progress}%`,
                          background: `linear-gradient(90deg, ${meta.color}, ${meta.color}cc)`,
                          borderRadius: 100,
                          transition: 'width 0.2s ease',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>
                        {ps.status === 'success' ? 'Complete' : `Posting… ${ps.progress}%`}
                      </span>
                      {ps.url && (
                        <a
                          href={ps.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '0.65rem', color: meta.color, textDecoration: 'none', fontWeight: 700 }}
                        >
                          View listing ↗
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Queued indicator */}
                {ps.status === 'queued' && (
                  <div style={{ marginTop: 10, fontSize: '0.68rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color, animation: 'rs-pulse 1.4s ease-in-out infinite' }} />
                    Waiting in queue…
                  </div>
                )}

                {/* Error */}
                {ps.status === 'error' && ps.error && (
                  <div style={{ marginTop: 10, fontSize: '0.68rem', color: '#f87171' }}>{ps.error}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Summary row ── */}
        {allDone && (
          <div
            style={{
              background:   totalPosted > 0 ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
              border:       `1px solid ${totalPosted > 0 ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
              borderRadius: 14,
              padding:      '16px 20px',
              marginBottom: 16,
              textAlign:    'center',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: 6 }}>
              {totalPosted === enabledCount ? '🎉' : '⚠️'}
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
              {totalPosted} of {enabledCount} platform{enabledCount !== 1 ? 's' : ''} posted successfully
            </div>
          </div>
        )}

        {/* ── CTA ── */}
        {!allDone ? (
          <button
            onClick={postAll}
            disabled={isPosting || totalItems === 0}
            style={{
              display:      'block',
              width:        '100%',
              background:   isPosting || totalItems === 0
                ? 'var(--surface2)'
                : 'linear-gradient(135deg, var(--accent), var(--accent2))',
              border:       'none',
              borderRadius: 16,
              color:        isPosting || totalItems === 0 ? 'var(--muted)' : '#fff',
              fontSize:     '1rem',
              fontWeight:   700,
              padding:      '18px',
              cursor:       isPosting || totalItems === 0 ? 'default' : 'pointer',
              fontFamily:   'inherit',
              letterSpacing: '-0.01em',
              boxShadow:    isPosting || totalItems === 0 ? 'none' : '0 6px 28px rgba(108,99,255,0.4)',
              transition:   'all 0.2s',
            }}
          >
            {isPosting ? '📡 Posting…' : `🚀 Post All Listings (${totalItems} items)`}
          </button>
        ) : (
          <button
            onClick={() => onComplete(items)}
            style={{
              display:      'block',
              width:        '100%',
              background:   'linear-gradient(135deg, var(--accent), var(--accent2))',
              border:       'none',
              borderRadius: 16,
              color:        '#fff',
              fontSize:     '1rem',
              fontWeight:   700,
              padding:      '18px',
              cursor:       'pointer',
              fontFamily:   'inherit',
              boxShadow:    '0 6px 28px rgba(108,99,255,0.4)',
            }}
          >
            View Dashboard →
          </button>
        )}
      </div>

      <style>{`
        @keyframes ms-spin { to { transform: rotate(360deg); } }
        @keyframes rs-pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.4; transform:scale(.65); } }
      `}</style>
    </div>
  );
}
