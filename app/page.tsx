'use client';

// ─────────────────────────────────────────────────────────────────────────────
// MultiSnap — Main page
//
// Orchestrates the full scan flow:
//
//  upload   → user selects an image
//  preview  → image ready; shows preview + "Scan" CTA
//  detecting→ API call: mode="detect" → bboxes returned
//  review   → ScanPreview: image + bboxes + preliminary item cards
//  generating→ API calls: mode="list" per item, in parallel (per-item progress)
//  results  → ScanPreview: all listings generated and editable
//
// The landing page (hero + demo sections) is shown only in the upload phase.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useRef, useState } from 'react';
import UploadZone from '@/components/upload/UploadZone';
import ProgressSteps from '@/components/ui/ProgressSteps';
import ScanPreview from '@/components/scan/ScanPreview';
import type { CompressedImage, DetectedObject, ItemResult, ScanPhase } from '@/types';
import { BBOX_COLORS } from '@/types';
import { cropImageToCanvas, getHighResCrop } from '@/lib/imageUtils';

// ─── Detect step config ───────────────────────────────────────────────────────
const DETECT_STEPS = ['Uploading', 'Detecting items', 'Preparing crops'];

// ─── Landing-page content (shown only in upload phase) ───────────────────────
const USE_CASES = [
  { icon: '📦', title: 'Moving & Downsizing',  desc: 'Turn a full household into cash listings before the movers arrive.' },
  { icon: '🏚️', title: 'Garage Cleanouts',     desc: "Transform a day's cleanout into dozens of ready-to-post items." },
  { icon: '🏛️', title: 'Estate Sales',          desc: 'Professionally list inherited items fast, with accurate market pricing.' },
  { icon: '🗄️', title: 'Storage Units',         desc: "Photograph each shelf and get every item listed while you're still there." },
  { icon: '♻️', title: 'Resellers & Flippers',  desc: 'Scale your operation — scan, list, and move inventory 10× faster.' },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<ScanPhase>('upload');
  const [image, setImage] = useState<CompressedImage | null>(null);
  const [items, setItems] = useState<ItemResult[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detectStep, setDetectStep] = useState(0);

  /** Hidden <img> element used for canvas operations (cropping). */
  const imgRef = useRef<HTMLImageElement>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Image selection
  // ─────────────────────────────────────────────────────────────────────────
  const handleImageSelected = useCallback((img: CompressedImage) => {
    setImage(img);
    setPhase('preview');
    setError(null);
    setItems([]);
    setActiveId(null);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Step 1 — Detection
  // Calls /api/analyze?mode=detect → gets bounding boxes → builds initial
  // ItemResult[] with crops but no listing data yet.
  // ─────────────────────────────────────────────────────────────────────────
  const runDetection = async () => {
    if (!image) return;
    setPhase('detecting');
    setDetectStep(0);
    setError(null);

    try {
      // Extract base64 from data-URL
      const base64 = image.dataUrl.split(',')[1];
      const mediaType = image.dataUrl.split(';')[0].split(':')[1];

      setDetectStep(1);
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType, mode: 'detect' }),
      });

      if (!res.ok) throw new Error(`Detection API returned ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const detectedObjects: DetectedObject[] = data.objects ?? [];
      if (detectedObjects.length === 0) {
        setError('No sellable items detected in this image. Try a different photo with more visible objects.');
        setPhase('preview');
        return;
      }

      // Generate crops using the hidden <img> ref
      setDetectStep(2);
      const el = imgRef.current;
      if (!el) throw new Error('Image element not available for cropping.');

      const nw = el.naturalWidth;
      const nh = el.naturalHeight;

      const initialItems: ItemResult[] = detectedObjects.map(
        (obj: DetectedObject, i: number) => {
          const px = {
            x: obj.xFrac * nw,
            y: obj.yFrac * nh,
            w: obj.wFrac * nw,
            h: obj.hFrac * nh,
          };
          const cropDataUrl = cropImageToCanvas(el, px);
          return {
            id: `item-${i}`,
            detection: obj,
            cropDataUrl,
            // User-editable — pre-filled with detection label
            editedTitle: obj.label,
            editedPrice: '',
            editedCondition: 'Good',
            editedNotes: '',
            // Listing data (filled later)
            title: obj.label,
            listing: '',
            priceMin: 0,
            priceMax: 0,
            priceSuggested: 0,
            condition: 'Good',
            identifications: [],
            confidenceScore: 0,
            aiValidated: false,
            // Media
            extraPhotos: [],
            video: null,
            // State
            isGenerating: false,
            isGenerated: false,
            hasError: false,
          };
        },
      );

      setItems(initialItems);
      setPhase('review');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Detection failed. Please try again.';
      setError(msg);
      setPhase('preview');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Step 2 — Listing generation (per-item, parallel)
  // For each item calls /api/analyze?mode=list with the crop image.
  // Updates each ItemResult as it completes so the UI shows real-time progress.
  // ─────────────────────────────────────────────────────────────────────────
  const generateListings = async () => {
    if (items.length === 0) return;
    setPhase('generating');

    const el = imgRef.current;
    if (!el) return;
    const nw = el.naturalWidth;
    const nh = el.naturalHeight;

    // Run all items in parallel
    await Promise.all(
      items.map(async (item) => {
        // Mark this item as generating
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, isGenerating: true } : it)),
        );

        try {
          const px = {
            x: item.detection.xFrac * nw,
            y: item.detection.yFrac * nh,
            w: item.detection.wFrac * nw,
            h: item.detection.hFrac * nh,
          };
          const highResBase64 = getHighResCrop(el, px);

          const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: item.cropDataUrl.split(',')[1],
              mediaType: 'image/jpeg',
              mode: 'list',
              label: item.detection.label,
              highResBase64,
            }),
          });

          const data = await res.json();

          if (data.error) throw new Error(data.error);

          setItems((prev) =>
            prev.map((it) =>
              it.id === item.id
                ? {
                    ...it,
                    // Merge AI listing data
                    ...data,
                    // Keep user-edited title if already changed; otherwise use AI title
                    editedTitle:
                      it.editedTitle !== it.detection.label
                        ? it.editedTitle
                        : data.title || it.editedTitle,
                    editedPrice: String(data.priceSuggested || ''),
                    editedCondition: data.condition || 'Good',
                    aiValidated: Boolean(data.googleVerified),
                    isGenerating: false,
                    isGenerated: true,
                    hasError: false,
                  }
                : it,
            ),
          );
        } catch (err) {
          console.error(`Listing generation failed for item ${item.id}:`, err);
          setItems((prev) =>
            prev.map((it) =>
              it.id === item.id ? { ...it, isGenerating: false, hasError: true } : it,
            ),
          );
        }
      }),
    );

    setPhase('results');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Per-item retry
  // ─────────────────────────────────────────────────────────────────────────
  const retryItem = async (itemId: string) => {
    const item = items.find((it) => it.id === itemId);
    if (!item) return;

    const el = imgRef.current;
    if (!el) return;
    const nw = el.naturalWidth;
    const nh = el.naturalHeight;

    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId ? { ...it, isGenerating: true, hasError: false } : it,
      ),
    );

    try {
      const px = {
        x: item.detection.xFrac * nw,
        y: item.detection.yFrac * nh,
        w: item.detection.wFrac * nw,
        h: item.detection.hFrac * nh,
      };
      const highResBase64 = getHighResCrop(el, px);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: item.cropDataUrl.split(',')[1],
          mediaType: 'image/jpeg',
          mode: 'list',
          label: item.detection.label,
          highResBase64,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setItems((prev) =>
        prev.map((it) =>
          it.id === itemId
            ? {
                ...it,
                ...data,
                editedTitle:
                  it.editedTitle !== it.detection.label
                    ? it.editedTitle
                    : data.title || it.editedTitle,
                editedPrice: String(data.priceSuggested || ''),
                editedCondition: data.condition || 'Good',
                aiValidated: Boolean(data.googleVerified),
                isGenerating: false,
                isGenerated: true,
                hasError: false,
              }
            : it,
        ),
      );
    } catch {
      setItems((prev) =>
        prev.map((it) =>
          it.id === itemId ? { ...it, isGenerating: false, hasError: true } : it,
        ),
      );
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Item mutations
  // ─────────────────────────────────────────────────────────────────────────
  const updateItem = (id: string, updates: Partial<ItemResult>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...updates } : it)));
  };

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    if (activeId === id) setActiveId(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Reset
  // ─────────────────────────────────────────────────────────────────────────
  const reset = () => {
    setImage(null);
    setItems([]);
    setPhase('upload');
    setError(null);
    setActiveId(null);
    setDetectStep(0);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)', fontFamily: "'Inter', sans-serif" }}>
      {/* Hidden img for canvas operations — must be visible to the browser */}
      {image && (
        <img
          ref={imgRef}
          src={image.dataUrl}
          alt=""
          style={{ position: 'absolute', left: -9999, top: -9999, width: 1, height: 1 }}
        />
      )}

      {/* ── NAV ── */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 32px',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(10,10,15,0.85)',
          backdropFilter: 'blur(14px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <button
          onClick={reset}
          style={{
            fontSize: '1.3rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--text)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Multi
          <span
            style={{
              background: 'linear-gradient(135deg,var(--accent),var(--accent2))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Snap
          </span>
        </button>
        <div
          style={{
            fontSize: '0.68rem',
            fontWeight: 600,
            color: 'var(--muted)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            border: '1px solid var(--border)',
            padding: '4px 12px',
            borderRadius: 100,
          }}
        >
          Beta
        </div>
      </nav>

      {/* ════════════════════════════════════════════════════════════════════
          UPLOAD & PREVIEW PHASE — landing page + upload zone
          ════════════════════════════════════════════════════════════════════ */}
      {(phase === 'upload' || phase === 'preview') && (
        <>
          {/* Hero */}
          <div
            style={{
              textAlign: 'center',
              padding: '72px 24px 40px',
              maxWidth: 820,
              margin: '0 auto',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 100,
                padding: '5px 16px',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--accent)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  background: 'var(--accent)',
                  borderRadius: '50%',
                  animation: 'ms-pulse 2s ease-in-out infinite',
                }}
              />
              AI-Powered Room Scanner
            </div>

            <h1
              style={{
                fontSize: 'clamp(2.2rem,6vw,3.8rem)',
                fontWeight: 900,
                lineHeight: 1.08,
                letterSpacing: '-0.045em',
                marginBottom: 20,
              }}
            >
              Turn One Room Photo Into
              <br />
              <span
                style={{
                  background: 'linear-gradient(135deg,var(--accent),var(--accent2))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Ready-to-Post Listings
              </span>
            </h1>

            <p
              style={{
                fontSize: '1.05rem',
                color: 'var(--muted)',
                lineHeight: 1.75,
                maxWidth: 560,
                margin: '0 auto 36px',
              }}
            >
              AI detects, crops, identifies, prices, and writes listings for
              everything in your photo.
            </p>

            {/* CTA — triggers upload */}
            <button
              onClick={() => {
                // Simulate click on the UploadZone gallery input
                // (UploadZone handles its own refs; we trigger the scan if image exists)
                if (!image) {
                  document.getElementById('ms-gallery-trigger')?.click();
                } else {
                  runDetection();
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                background: 'linear-gradient(135deg,var(--accent),var(--accent2))',
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: '1rem',
                fontWeight: 700,
                padding: '16px 32px',
                borderRadius: 14,
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '-0.01em',
                boxShadow: '0 8px 32px rgba(108,99,255,0.38)',
                marginBottom: 12,
              }}
            >
              Try a Room Scan →
            </button>

            <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
              Powered by <strong style={{ color: 'rgba(240,240,255,0.7)' }}>Claude AI</strong> ·
              AI-powered identification with real market data validation
            </div>
          </div>

          {/* Upload zone */}
          <div id="upload-section">
            <UploadZone
              currentImage={image}
              onImageSelected={handleImageSelected}
              onScanClick={runDetection}
              isScanning={phase === 'detecting'}
            />
          </div>

          {/* Error state */}
          {error && (
            <div
              style={{
                maxWidth: 560,
                margin: '12px auto 0',
                padding: '12px 16px',
                background: 'rgba(248,113,113,0.08)',
                border: '1px solid rgba(248,113,113,0.3)',
                color: '#f87171',
                borderRadius: 10,
                fontSize: '0.78rem',
                lineHeight: 1.5,
              }}
            >
              ⚠ {error}
            </div>
          )}

          {/* Use-case section (only shown on initial upload phase, not after image selected) */}
          {phase === 'upload' && (
            <div
              style={{
                maxWidth: 1100,
                margin: '64px auto 0',
                padding: '0 24px 80px',
              }}
            >
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: 'var(--accent)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}
              >
                ✅ Perfect For
              </div>
              <h2
                style={{
                  fontSize: 'clamp(1.6rem,4vw,2.4rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.04em',
                  marginBottom: 10,
                }}
              >
                Made for people who have{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg,var(--accent),var(--accent2))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  stuff to sell
                </span>
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: 32 }}>
                Whether clearing one room or running a full resale operation, MultiSnap saves hours of listing work.
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))',
                  gap: 14,
                }}
              >
                {USE_CASES.map((uc) => (
                  <div
                    key={uc.title}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 14,
                      padding: '22px 18px',
                    }}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: 14 }}>{uc.icon}</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 7 }}>
                      {uc.title}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', lineHeight: 1.65 }}>
                      {uc.desc}
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: 48,
                  paddingTop: 20,
                  borderTop: '1px solid var(--border)',
                  fontSize: '0.68rem',
                  color: 'var(--muted)',
                  lineHeight: 1.65,
                }}
              >
                ⚠️{' '}
                <strong style={{ color: 'rgba(240,240,255,0.5)' }}>
                  Results may not be perfect, but they improve over time.
                </strong>{' '}
                AI identification accuracy depends on image quality and item visibility. Always review before posting.
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          DETECTING PHASE — full-screen spinner with step progress
          ════════════════════════════════════════════════════════════════════ */}
      {phase === 'detecting' && (
        <ProgressSteps
          title="Detecting items…"
          subtitle="AI is scanning your photo for every resaleable object. This usually takes 5–15 seconds."
          steps={DETECT_STEPS}
          currentStep={detectStep}
        />
      )}

      {/* ════════════════════════════════════════════════════════════════════
          REVIEW / GENERATING / RESULTS — ScanPreview
          ════════════════════════════════════════════════════════════════════ */}
      {(phase === 'review' || phase === 'generating' || phase === 'results') &&
        image && (
          <ScanPreview
            image={image}
            items={items}
            phase={phase}
            activeId={activeId}
            onSelectItem={setActiveId}
            onGenerateListings={generateListings}
            onUpdateItem={updateItem}
            onDeleteItem={deleteItem}
            onRetryItem={retryItem}
            onReset={reset}
          />
        )}

      {/* Global keyframe animations */}
      <style>{`
        @keyframes ms-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.75); }
        }
      `}</style>
    </main>
  );
}
