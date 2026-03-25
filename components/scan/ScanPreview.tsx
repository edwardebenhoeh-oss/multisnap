'use client';

// ─────────────────────────────────────────────────────────────────────────────
// ScanPreview — the core scan experience component.
//
// Layout
//   Desktop: left panel (image + bbox overlay) | right panel (scrollable item cards)
//   Mobile:  image on top, cards stacked below
//
// Bounding-box overlay (Google Lens style)
//   • Boxes are positioned with percentage values relative to the image.
//   • Since the image is `width: 100%; height: auto`, the containing div
//     matches the image's natural aspect ratio automatically — so percentage
//     top/height values are accurate without any JavaScript measurement.
//   • Each box gets the colour assigned to its index.
//   • Active box: bright border + filled label chip + subtle shadow glow.
//   • Inactive boxes: semi-transparent border + small label chip on hover.
//
// Tap-to-highlight
//   • Clicking a bbox → setActiveId(item.id) → ItemCard scrolls into view.
//   • Clicking a card (inside ItemCard) → setActiveId → bbox glows.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import type { CompressedImage, ItemResult, ScanPhase } from '@/types';
import { BBOX_COLORS } from '@/types';
import ItemCard from './ItemCard';
import CropEditor from './CropEditor';
import type { CropBox } from './CropEditor';

interface ScanPreviewProps {
  image: CompressedImage;
  items: ItemResult[];
  phase: ScanPhase;
  onSelectItem: (id: string | null) => void;
  activeId: string | null;
  onGenerateListings: () => void;
  onUpdateItem: (id: string, updates: Partial<ItemResult>) => void;
  onDeleteItem: (id: string) => void;
  onRetryItem?: (id: string) => void;
  onReset: () => void;
}

export default function ScanPreview({
  image,
  items,
  phase,
  activeId,
  onSelectItem,
  onGenerateListings,
  onUpdateItem,
  onDeleteItem,
  onRetryItem,
  onReset,
}: ScanPreviewProps) {
  // Local crop-box overrides (user can drag-adjust before generating)
  const [cropBoxes, setCropBoxes] = useState<Record<string, CropBox>>({});
  const [showCropEditor, setShowCropEditor] = useState<string | null>(null);

  // Derive whether the generate button should be available
  const canGenerate = phase === 'review' && items.length > 0;
  const isGenerating = phase === 'generating';
  const isResults = phase === 'results';

  const generatedCount = items.filter((i) => i.isGenerated).length;
  const allDone = generatedCount === items.length && items.length > 0;

  /** Return the crop box for an item — falls back to the AI detection box. */
  const getCropBox = (item: ItemResult): CropBox =>
    cropBoxes[item.id] ?? {
      x: item.detection.xFrac,
      y: item.detection.yFrac,
      w: item.detection.wFrac,
      h: item.detection.hFrac,
    };

  const updateCropBox = (id: string, box: CropBox) =>
    setCropBoxes((prev) => ({ ...prev, [id]: box }));

  // ─────────────────────────────────────────────────────────────────────────────
  // Phase label
  // ─────────────────────────────────────────────────────────────────────────────
  const phaseLabel = (() => {
    if (isResults && allDone) return `${items.length} listings ready`;
    if (isGenerating) return `Generating… ${generatedCount}/${items.length}`;
    return `${items.length} item${items.length !== 1 ? 's' : ''} detected`;
  })();

  return (
    <div
      style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 16px', fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <button
          onClick={onReset}
          style={{
            background: 'transparent',
            color: 'var(--muted)',
            border: '1px solid var(--border)',
            fontFamily: 'inherit',
            fontSize: '0.8rem',
            fontWeight: 500,
            padding: '8px 16px',
            borderRadius: 9,
            cursor: 'pointer',
          }}
        >
          ← New Scan
        </button>

        <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
          <span style={{ color: 'var(--text)', fontWeight: 700 }}>{phaseLabel}</span>
          {isGenerating && (
            <span style={{ marginLeft: 8, color: 'var(--accent)' }}>●</span>
          )}
        </div>

        {canGenerate && (
          <button
            onClick={onGenerateListings}
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              color: '#fff',
              fontFamily: 'inherit',
              fontSize: '0.88rem',
              fontWeight: 700,
              padding: '10px 24px',
              borderRadius: 11,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(108,99,255,0.35)',
              letterSpacing: '-0.01em',
            }}
          >
            Generate {items.length} Listing{items.length !== 1 ? 's' : ''} →
          </button>
        )}

        {isResults && allDone && (
          <div style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600 }}>
            ✓ All listings generated
          </div>
        )}
      </div>

      {/* ── Main two-column layout ── */}
      <div
        className="grid gap-5"
        style={{
          // Desktop: image 60% | cards 40%
          gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,0.8fr)',
        }}
        // Collapse to single column on narrow viewports via a style tag below
      >
        {/* ════════════════════════════════════════
            LEFT — Image with bounding-box overlay
            ════════════════════════════════════════ */}
        <div>
          {/* Image container — position:relative lets us place bbox divs on top */}
          <div
            style={{
              position: 'relative',
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid var(--border)',
              lineHeight: 0, // collapse whitespace under img
              background: '#0a0a12',
            }}
          >
            <img
              src={image.dataUrl}
              alt="Scanned room"
              style={{ width: '100%', display: 'block' }}
              draggable={false}
            />

            {/* ── Bounding boxes (Google Lens style) ── */}
            {items.map((item, i) => {
              const box = getCropBox(item);
              const color = BBOX_COLORS[i % BBOX_COLORS.length];
              const isActive = item.id === activeId;

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(isActive ? null : item.id)}
                  style={{
                    position: 'absolute',
                    left: `${box.x * 100}%`,
                    top: `${box.y * 100}%`,
                    width: `${box.w * 100}%`,
                    height: `${box.h * 100}%`,
                    border: `2px solid ${isActive ? color : color + '88'}`,
                    borderRadius: 4,
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    boxShadow: isActive ? `0 0 0 1px ${color}44, inset 0 0 0 1px ${color}22` : 'none',
                    background: isActive ? `${color}10` : 'transparent',
                    // Ensure boxes are above the image
                    zIndex: isActive ? 20 : 10,
                  }}
                >
                  {/* Label chip — shown inside box at top-left */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                      background: isActive ? color : `${color}cc`,
                      color: '#fff',
                      fontSize: '0.55rem',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 4,
                      letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      maxWidth: '90%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {i + 1}. {item.editedTitle || item.detection.label}
                  </div>

                  {/* Generating pulse indicator */}
                  {item.isGenerating && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 4,
                        right: 4,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: color,
                        animation: 'ms-pulse 1.4s ease-in-out infinite',
                      }}
                    />
                  )}
                </div>
              );
            })}

            {/* Scan line animation while detecting */}
            {phase === 'review' && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 10,
                  left: 10,
                  right: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    background: 'rgba(8,8,18,0.9)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(108,99,255,0.45)',
                    color: 'var(--accent)',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    padding: '5px 12px',
                    borderRadius: 100,
                    letterSpacing: '0.05em',
                  }}
                >
                  {items.length} item{items.length !== 1 ? 's' : ''} detected
                </div>
                <div
                  style={{
                    background: 'rgba(8,8,18,0.9)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid var(--border)',
                    color: 'var(--muted)',
                    fontSize: '0.62rem',
                    fontWeight: 600,
                    padding: '5px 12px',
                    borderRadius: 100,
                  }}
                >
                  Click a box to select · Adjust crop below
                </div>
              </div>
            )}
          </div>

          {/* ── Crop editor for the active item (shown below image) ── */}
          {activeId && phase === 'review' && (() => {
            const activeItem = items.find((it) => it.id === activeId);
            if (!activeItem) return null;
            const color = BBOX_COLORS[items.indexOf(activeItem) % BBOX_COLORS.length];
            return (
              <div
                style={{
                  marginTop: 12,
                  background: 'var(--card-bg)',
                  border: `1px solid ${color}44`,
                  borderRadius: 14,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Adjust crop — {activeItem.editedTitle || activeItem.detection.label}
                  </div>
                  <button
                    onClick={() => onSelectItem(null)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    Done
                  </button>
                </div>
                <CropEditor
                  imgSrc={image.dataUrl}
                  cropBox={getCropBox(activeItem)}
                  onChange={(box) => updateCropBox(activeItem.id, box)}
                />
                <div style={{ padding: '8px 14px 10px', fontSize: '0.62rem', color: 'var(--muted)' }}>
                  Drag box or handles to refine the crop before generating.
                </div>
              </div>
            );
          })()}
        </div>

        {/* ════════════════════════════════════════
            RIGHT — Scrollable item cards
            ════════════════════════════════════════ */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            maxHeight: '85vh',
            overflowY: 'auto',
            paddingRight: 4, // room for scrollbar
          }}
        >
          {items.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                color: 'var(--muted)',
                fontSize: '0.82rem',
                padding: '40px 16px',
              }}
            >
              No items to display.
            </div>
          )}

          {items.map((item, i) => (
            <ItemCard
              key={item.id}
              item={item}
              index={i}
              isActive={item.id === activeId}
              onSelect={() => onSelectItem(item.id)}
              onUpdate={(updates) => onUpdateItem(item.id, updates)}
              onDelete={() => onDeleteItem(item.id)}
              onRetry={onRetryItem ? () => onRetryItem(item.id) : undefined}
            />
          ))}

          {/* Generate button at bottom of card list (mobile fallback) */}
          {canGenerate && (
            <button
              onClick={onGenerateListings}
              style={{
                background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                color: '#fff',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.88rem',
                fontWeight: 700,
                padding: '14px 24px',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(108,99,255,0.35)',
                marginTop: 4,
              }}
            >
              Generate {items.length} Listing{items.length !== 1 ? 's' : ''} →
            </button>
          )}

          {/* Progress bar during generation */}
          {isGenerating && (
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '12px 16px',
                fontSize: '0.72rem',
                color: 'var(--muted)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Generating listings…</span>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
                  {generatedCount}/{items.length}
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  background: 'var(--border)',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${items.length > 0 ? (generatedCount / items.length) * 100 : 0}%`,
                    background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
                    borderRadius: 4,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Responsive: collapse to single column on mobile */}
      <style>{`
        @media (max-width: 768px) {
          .scan-grid { grid-template-columns: 1fr !important; }
        }
        @keyframes ms-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}
