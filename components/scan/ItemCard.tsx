'use client';

// ─────────────────────────────────────────────────────────────────────────────
// ItemCard — one detected + (optionally) AI-analysed item.
//
// States:
//  • Pending   — detection done; AI listing not yet requested
//  • Generating— AI call in flight (spinner)
//  • Generated — full listing data ready; expandable eBay-style edit form
//  • Error     — AI call failed; shows retry option
//
// Interactions:
//  • Clicking the card header selects it (highlights matching bbox)
//  • isActive prop highlights the card with an accent border
//  • When isActive becomes true the card scrolls into view
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import type { ItemResult } from '@/types';
import { BBOX_COLORS, CONDITION_OPTIONS } from '@/types';

interface ItemCardProps {
  item: ItemResult;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<ItemResult>) => void;
  onDelete: () => void;
  onRetry?: () => void;
}

/** Stringify a data-URL listing for clipboard copy. */
function buildClipboardText(item: ItemResult): string {
  return [
    `Title: ${item.editedTitle || item.title}`,
    `Price: $${item.editedPrice || item.priceSuggested}`,
    `Condition: ${item.editedCondition || item.condition}`,
    '',
    item.listing || '',
    item.editedNotes ? `\nNotes: ${item.editedNotes}` : '',
  ]
    .filter((l) => l !== undefined)
    .join('\n');
}

export default function ItemCard({
  item,
  index,
  isActive,
  onSelect,
  onUpdate,
  onDelete,
  onRetry,
}: ItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Colour assigned to this item based on index
  const color = BBOX_COLORS[index % BBOX_COLORS.length];

  // Scroll into view whenever this card becomes active
  useEffect(() => {
    if (isActive && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isActive]);

  const copyListing = () => {
    navigator.clipboard.writeText(buildClipboardText(item)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  // ── Shared input style ──────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.88rem',
    fontWeight: 600,
    padding: '9px 12px',
    borderRadius: 9,
    outline: 'none',
    letterSpacing: '-0.01em',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.6rem',
    fontWeight: 700,
    color: 'var(--muted)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: 5,
    marginTop: 14,
    display: 'block',
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      ref={cardRef}
      style={{
        background: 'var(--card-bg)',
        border: `1.5px solid ${isActive ? color : 'var(--border)'}`,
        borderRadius: 14,
        overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: isActive ? `0 0 0 3px ${color}22` : 'none',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ── Card header: colour dot + crop thumb + basic fields ── */}
      <div
        className="flex gap-3 p-3 cursor-pointer"
        onClick={() => {
          onSelect();
          if (item.isGenerated) setExpanded((v) => !v);
        }}
        style={{ alignItems: 'flex-start' }}
      >
        {/* Colour dot (matches bbox) */}
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
            marginTop: 6,
          }}
        />

        {/* Crop thumbnail */}
        <img
          src={item.cropDataUrl}
          alt={item.editedTitle}
          style={{
            width: 68,
            height: 68,
            objectFit: 'cover',
            borderRadius: 10,
            border: '1px solid var(--border)',
            flexShrink: 0,
            background: '#0a0a12',
          }}
        />

        {/* Info column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Editable title */}
          <input
            value={item.editedTitle}
            onChange={(e) => onUpdate({ editedTitle: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            placeholder="Item name"
            style={{
              ...inputStyle,
              fontSize: '0.82rem',
              fontWeight: 700,
              marginBottom: 5,
              padding: '6px 10px',
            }}
          />

          {/* Price / state badge row */}
          <div className="flex items-center gap-2 flex-wrap">
            {item.isGenerating ? (
              <span style={{ fontSize: '0.7rem', color: 'var(--accent)' }}>
                ✦ Analyzing with AI…
              </span>
            ) : item.isGenerated ? (
              <>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>$</span>
                <input
                  value={item.editedPrice}
                  onChange={(e) => onUpdate({ editedPrice: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  placeholder={String(item.priceSuggested || '—')}
                  style={{
                    width: 80,
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: 7,
                    outline: 'none',
                  }}
                />
                {item.priceMin > 0 && (
                  <span style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>
                    range ${item.priceMin}–${item.priceMax}
                  </span>
                )}
              </>
            ) : item.hasError ? (
              <span style={{ fontSize: '0.7rem', color: '#f87171' }}>⚠ Analysis failed</span>
            ) : (
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                Ready to analyse
              </span>
            )}
          </div>
        </div>

        {/* Right: confidence + expand chevron */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {item.confidenceScore > 0 && (
            <span
              style={{
                fontSize: '0.6rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 100,
                background:
                  item.confidenceScore >= 80
                    ? 'rgba(74,222,128,0.15)'
                    : item.confidenceScore >= 60
                    ? 'rgba(251,191,36,0.15)'
                    : 'rgba(248,113,113,0.15)',
                color:
                  item.confidenceScore >= 80
                    ? '#4ade80'
                    : item.confidenceScore >= 60
                    ? '#fbbf24'
                    : '#f87171',
              }}
            >
              {item.confidenceScore}%
            </span>
          )}
          {item.isGenerated && (
            <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>
              {expanded ? '▲' : '▼'}
            </span>
          )}
          {item.hasError && onRetry && (
            <button
              onClick={(e) => { e.stopPropagation(); onRetry(); }}
              style={{
                fontSize: '0.62rem',
                color: 'var(--accent)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Retry
            </button>
          )}
        </div>
      </div>

      {/* ── Expanded: eBay-style editing panel ── */}
      {expanded && item.isGenerated && (
        <div
          style={{
            padding: '0 14px 14px',
            borderTop: '1px solid var(--border)',
          }}
        >
          {/* Condition */}
          <label style={labelStyle}>Condition</label>
          <select
            value={item.editedCondition || 'Good'}
            onChange={(e) => onUpdate({ editedCondition: e.target.value })}
            style={{
              ...inputStyle,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            {CONDITION_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Listing description */}
          <label style={labelStyle}>Listing Description</label>
          <textarea
            value={item.listing}
            onChange={(e) => onUpdate({ listing: e.target.value })}
            rows={5}
            style={{
              ...inputStyle,
              fontFamily: "'DM Mono', 'Courier New', monospace",
              fontSize: '0.68rem',
              fontWeight: 400,
              lineHeight: 1.7,
              resize: 'vertical',
              minHeight: 110,
            }}
          />

          {/* Notes */}
          <label style={labelStyle}>Your Notes</label>
          <textarea
            value={item.editedNotes}
            onChange={(e) => onUpdate({ editedNotes: e.target.value })}
            placeholder="Anything else to mention…"
            rows={2}
            style={{
              ...inputStyle,
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.78rem',
              fontWeight: 400,
              lineHeight: 1.6,
              resize: 'vertical',
            }}
          />

          {/* AI identifications */}
          {item.identifications?.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ ...labelStyle, display: 'block', marginTop: 0 }}>AI Identifications</div>
              {item.identifications.slice(0, 3).map((id, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 8,
                    padding: '6px 0',
                    borderBottom: i < item.identifications.length - 1 && i < 2 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <span style={{ fontSize: '0.6rem', color: 'var(--muted)', width: 16, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: '0.72rem', color: 'var(--text)', fontWeight: 500 }}>{id.name}</span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>{id.confidence}</span>
                </div>
              ))}
              {item.aiValidated && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: '0.62rem', color: '#4ade80', fontWeight: 600 }}>
                  ✦ AI-powered identification · Market data validated
                </div>
              )}
            </div>
          )}

          {/* Metadata */}
          {(item.condition || item.materials || item.estimatedDimensions) && (
            <div style={{ marginTop: 10, fontSize: '0.68rem', color: 'var(--muted)', lineHeight: 1.6 }}>
              {item.condition && <div>{item.condition}</div>}
              {item.materials && <div>Materials: {item.materials}</div>}
              {item.estimatedDimensions && <div>Est. size: {item.estimatedDimensions}</div>}
            </div>
          )}

          {/* Action row */}
          <div style={{ display: 'flex', gap: 7, marginTop: 14, flexWrap: 'wrap' }}>
            <button
              onClick={copyListing}
              style={{
                flex: 1,
                minWidth: 80,
                background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                color: '#fff',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '10px 14px',
                borderRadius: 9,
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '-0.01em',
              }}
            >
              {copied ? '✓ Copied!' : 'Copy Listing'}
            </button>
            <button
              onClick={() => setExpanded(false)}
              style={{
                background: 'transparent',
                color: 'var(--muted)',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.76rem',
                fontWeight: 500,
                padding: '10px 14px',
                borderRadius: 9,
                border: '1px solid var(--border)',
                cursor: 'pointer',
              }}
            >
              Collapse
            </button>
            <button
              onClick={onDelete}
              style={{
                background: 'transparent',
                color: 'rgba(248,113,113,0.8)',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.76rem',
                fontWeight: 500,
                padding: '10px 14px',
                borderRadius: 9,
                border: '1px solid rgba(248,113,113,0.2)',
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
          </div>

          {/* Disclaimer */}
          <div style={{ fontSize: '0.6rem', color: 'var(--muted)', marginTop: 10, lineHeight: 1.6 }}>
            ⚠ Results may not be perfect — always review before posting.
          </div>
        </div>
      )}
    </div>
  );
}
