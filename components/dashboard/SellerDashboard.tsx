'use client';

// ─────────────────────────────────────────────────────────────────────────────
// SellerDashboard — Seller analytics and AI insights.
//
// Sections:
//   • Earnings header with weekly sparkline (pure CSS/div bars)
//   • Stats row: active listings / sold / pending
//   • AI insight cards with actionable tips
//   • Recent sales list
//   • "New Scan" CTA
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import type { ItemResult, AIInsight } from '@/types';
import { PLATFORM_META } from '@/types';

interface SellerDashboardProps {
  items:      ItemResult[];   // all items ever scanned (for stats)
  onNewScan:  () => void;
}

// ── Mock enrichment — in production this would come from a real DB ─────────────
function buildStats(items: ItemResult[]) {
  const generated = items.filter((it) => it.isGenerated);
  const totalEarnings = generated.reduce((sum, it) => sum + Number(it.editedPrice || it.priceSuggested || 0), 0);

  // Weekly sparkline: last 7 days (mock progression)
  const weeklyEarnings = [14, 38, 22, 56, 41, 73, Math.round(totalEarnings * 0.4)].map((v) =>
    Math.max(v, 0),
  );

  const insights: AIInsight[] = [
    {
      id:      'ins-1',
      icon:    '💡',
      message: generated.length > 0
        ? `Lower the price on "${generated[0]?.editedTitle || generated[0]?.title}" by 10% to sell 3× faster.`
        : 'Scan your first room to get AI pricing insights.',
      action: 'Adjust price',
    },
    {
      id:      'ins-2',
      icon:    '🔁',
      message: 'Items listed on 3 platforms sell 2.4× faster than single-platform listings.',
      action:  'Post everywhere',
    },
    {
      id:      'ins-3',
      icon:    '📸',
      message: 'Listings with 3+ photos get 60% more clicks. Add extra angles to your top items.',
      action:  'Add photos',
    },
    {
      id:      'ins-4',
      icon:    '🏷',
      message: 'Enable SEO optimization on your descriptions to rank higher in search results.',
      action:  'Turn on SEO',
    },
  ].slice(0, generated.length > 0 ? 4 : 2);

  return { totalEarnings, weeklyEarnings, insights, generated };
}

// ─────────────────────────────────────────────────────────────────────────────
export default function SellerDashboard({ items, onNewScan }: SellerDashboardProps) {
  const { totalEarnings, weeklyEarnings, insights, generated } = useMemo(() => buildStats(items), [items]);

  const active  = generated.filter((it) => !it.postingState || Object.values(it.postingState).every((ps) => ps.status !== 'success')).length;
  const sold    = generated.filter((it) => it.postingState && Object.values(it.postingState).some((ps) => ps.status === 'success')).length;
  const pending = items.filter((it) => !it.isGenerated && !it.hasError).length;

  const barMax  = Math.max(...weeklyEarnings, 1);

  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div
      style={{
        minHeight:  '100dvh',
        background: 'var(--bg)',
        color:      'var(--text)',
        fontFamily: "'Inter', sans-serif",
        paddingBottom: 48,
      }}
    >
      {/* ── Earnings header ── */}
      <div
        style={{
          background: 'linear-gradient(160deg, #1a1528 0%, var(--bg) 100%)',
          padding:    '36px 22px 28px',
          position:   'relative',
          overflow:   'hidden',
        }}
      >
        {/* Glow */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(108,99,255,0.12)', filter: 'blur(60px)', pointerEvents: 'none' }} />

        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          Total Earnings
        </div>
        <div style={{ fontSize: '2.8rem', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1 }}>
          ${totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 6 }}>
          From {generated.length} listed item{generated.length !== 1 ? 's' : ''}
        </div>

        {/* Weekly sparkline */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginBottom: 8 }}>Last 7 days</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 48 }}>
            {weeklyEarnings.map((v, i) => {
              const pct = v / barMax;
              const isToday = i === 6;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div
                    style={{
                      width:        '100%',
                      height:       Math.max(4, pct * 36),
                      borderRadius: '4px 4px 2px 2px',
                      background:   isToday
                        ? 'linear-gradient(180deg, var(--accent), var(--accent2))'
                        : 'rgba(108,99,255,0.3)',
                      boxShadow:    isToday ? '0 2px 8px rgba(108,99,255,0.5)' : 'none',
                      transition:   'height 0.5s ease',
                    }}
                  />
                  <div style={{ fontSize: '0.55rem', color: isToday ? 'var(--accent)' : 'var(--muted)', fontWeight: isToday ? 700 : 400 }}>
                    {days[i]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>

        {/* ── Stats row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24, marginTop: 20 }}>
          {[
            { label: 'Active',  value: active,  icon: '🟢', color: '#4ade80' },
            { label: 'Sold',    value: sold,    icon: '✅', color: '#6c63ff' },
            { label: 'Pending', value: pending, icon: '⏳', color: '#fbbf24' },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background:   'var(--surface)',
                border:       '1px solid var(--border)',
                borderRadius: 16,
                padding:      '16px 12px',
                textAlign:    'center',
              }}
            >
              <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.04em', color: s.color }}>
                {s.value}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── AI Insights ── */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          8,
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              AI Insights
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {insights.map((ins) => (
              <div
                key={ins.id}
                style={{
                  display:      'flex',
                  gap:          14,
                  background:   'var(--surface)',
                  border:       '1px solid var(--border)',
                  borderRadius: 14,
                  padding:      '14px 16px',
                  alignItems:   'flex-start',
                }}
              >
                <span style={{ fontSize: '1.3rem', flexShrink: 0, marginTop: 1 }}>{ins.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.5, marginBottom: ins.action ? 8 : 0 }}>
                    {ins.message}
                  </div>
                  {ins.action && (
                    <button
                      style={{
                        background:   'rgba(108,99,255,0.12)',
                        border:       '1px solid rgba(108,99,255,0.28)',
                        borderRadius: 8,
                        color:        'var(--accent)',
                        padding:      '4px 12px',
                        fontSize:     '0.68rem',
                        fontWeight:   700,
                        cursor:       'pointer',
                        fontFamily:   'inherit',
                      }}
                    >
                      {ins.action}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Recent listings ── */}
        {generated.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Recent Listings
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {generated.slice(0, 6).map((item, i) => {
                const postedTo = item.postingState
                  ? (Object.entries(item.postingState) as [string, { status: string }][])
                      .filter(([, v]) => v.status === 'success')
                      .map(([k]) => k)
                  : [];

                return (
                  <div
                    key={item.id}
                    style={{
                      display:      'flex',
                      gap:          12,
                      background:   'var(--surface)',
                      border:       '1px solid var(--border)',
                      borderRadius: 14,
                      padding:      '12px',
                      alignItems:   'center',
                    }}
                  >
                    <img
                      src={item.cropDataUrl}
                      alt={item.editedTitle}
                      style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.editedTitle || item.title}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 2 }}>
                        {item.editedCondition} · ${item.editedPrice || item.priceSuggested}
                      </div>
                      {postedTo.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                          {postedTo.map((p) => (
                            <span
                              key={p}
                              style={{
                                fontSize:   '0.6rem',
                                fontWeight: 700,
                                color:      PLATFORM_META[p as keyof typeof PLATFORM_META]?.color || 'var(--accent)',
                                background: `${PLATFORM_META[p as keyof typeof PLATFORM_META]?.color || 'var(--accent)'}18`,
                                padding:    '2px 7px',
                                borderRadius: 100,
                              }}
                            >
                              {PLATFORM_META[p as keyof typeof PLATFORM_META]?.label.split(' ')[0] || p}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)', flexShrink: 0 }}>
                      ${item.editedPrice || item.priceSuggested || '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── New scan CTA ── */}
        <button
          onClick={onNewScan}
          style={{
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            gap:          10,
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
            letterSpacing: '-0.01em',
            boxShadow:    '0 6px 28px rgba(108,99,255,0.4)',
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>📡</span>
          Start a New Scan
        </button>
      </div>
    </div>
  );
}
