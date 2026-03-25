'use client';

// ─────────────────────────────────────────────────────────────────────────────
// RoomScanner — Continuous live-camera room scanner.
//
// UX flow:
//   1. Open rear camera viewfinder
//   2. RAF loop computes a pixel-diff motion score every frame
//   3. When camera is still for STILL_THRESHOLD_MS → auto-capture + detect
//   4. Detected items accumulate in a bottom sheet (dupes skipped)
//   5. User pans to a new area → loop repeats
//   6. "Done" → pass accumulated items + last captured image to parent
//
// The parent (page.tsx) receives { items: DetectedObject[], baseImage }
// and skips straight to the review phase — no extra taps required.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CompressedImage, DetectedObject } from '@/types';
import { compressImage } from '@/lib/imageUtils';

// ── Constants ─────────────────────────────────────────────────────────────────
/** Camera must be still for this long before auto-capture fires. */
const STILL_THRESHOLD_MS = 1800;

/** Motion diff score below this is considered "still". */
const MOTION_STILL_THRESHOLD = 6;

/** Size of the hidden diff canvas — smaller = faster, less accurate. */
const DIFF_W = 160;
const DIFF_H = 90;

/** Cooldown after a capture before the next one can fire (ms). */
const CAPTURE_COOLDOWN_MS = 3000;

// ── Props ─────────────────────────────────────────────────────────────────────
interface RoomScannerProps {
  /**
   * Called when the user taps "Done".
   * Receives all accumulated DetectedObjects + the last captured image.
   */
  onScanComplete: (items: DetectedObject[], baseImage: CompressedImage) => void;
  onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Compute an average per-channel pixel diff between two ImageData buffers.
 * Samples every 4th pixel for performance.
 */
function motionScore(a: ImageData, b: ImageData): number {
  const d1 = a.data, d2 = b.data;
  const step = 16; // skip 4 pixels at a time (4 channels × 4 pixels)
  let total = 0;
  let count = 0;
  for (let i = 0; i < d1.length; i += step) {
    total += Math.abs(d1[i] - d2[i]) + Math.abs(d1[i + 1] - d2[i + 1]) + Math.abs(d1[i + 2] - d2[i + 2]);
    count += 3;
  }
  return total / count;
}

/**
 * Returns true if newItem is already covered by an existing detection.
 * Matches on shared keywords in the label (case-insensitive).
 */
function isDuplicate(newItem: DetectedObject, existing: DetectedObject[]): boolean {
  const newWords = newItem.label.toLowerCase().split(/\s+/);
  return existing.some((e) => {
    const existWords = e.label.toLowerCase().split(/\s+/);
    // If any meaningful word (>3 chars) overlaps → treat as duplicate
    return newWords.some(
      (w) => w.length > 3 && existWords.some((ew) => ew.includes(w) || w.includes(ew)),
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function RoomScanner({ onScanComplete, onClose }: RoomScannerProps) {
  const videoRef     = useRef<HTMLVideoElement>(null);
  const diffCanvas   = useRef<HTMLCanvasElement>(null); // hidden, motion detection
  const streamRef    = useRef<MediaStream | null>(null);
  const rafRef       = useRef<number>(0);
  const prevFrame    = useRef<ImageData | null>(null);
  const stillMs      = useRef<number>(0);             // consecutive still milliseconds
  const lastRafTime  = useRef<number>(0);
  const lastCapTime  = useRef<number>(0);             // last capture timestamp
  const isCapturing  = useRef(false);                 // prevents concurrent captures

  const [isReady,      setIsReady]      = useState(false);
  const [isAnalyzing,  setIsAnalyzing]  = useState(false);
  const [stillPct,     setStillPct]     = useState(0);  // 0-1 progress ring fill
  const [items,        setItems]        = useState<DetectedObject[]>([]);
  const [lastCapture,  setLastCapture]  = useState<CompressedImage | null>(null);
  const [scanCount,    setScanCount]    = useState(0);
  const [newFound,     setNewFound]     = useState(0); // for the "found X" toast
  const [showToast,    setShowToast]    = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  // ── Camera startup ─────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width:  { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => { if (active) setIsReady(true); };
        }
      } catch {
        if (active) setError('Camera access was denied. Please allow camera permission and try again.');
      }
    }

    start();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Motion-detection RAF loop ──────────────────────────────────────────────
  const captureAndDetect = useCallback(async () => {
    const video = videoRef.current;
    if (!video || isCapturing.current) return;
    isCapturing.current = true;
    setIsAnalyzing(true);

    try {
      // Draw full-res frame to an off-screen canvas for compression
      const cap = document.createElement('canvas');
      cap.width  = video.videoWidth;
      cap.height = video.videoHeight;
      const ctx  = cap.getContext('2d')!;
      ctx.drawImage(video, 0, 0);

      const blob = await new Promise<Blob | null>((res) => cap.toBlob(res, 'image/jpeg', 0.92));
      if (!blob) throw new Error('Canvas toBlob failed');

      const file       = new File([blob], 'scan-frame.jpg', { type: 'image/jpeg' });
      const compressed = await compressImage(file);
      setLastCapture(compressed);
      lastCapTime.current = performance.now();

      // Run detection
      const base64    = compressed.dataUrl.split(',')[1];
      const mediaType = compressed.dataUrl.split(';')[0].split(':')[1];

      const res  = await fetch('/api/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ imageBase64: base64, mediaType, mode: 'detect' }),
      });
      const data = await res.json() as { objects?: DetectedObject[]; error?: string };
      if (data.error) throw new Error(data.error);

      const detected = data.objects ?? [];

      setItems((prev) => {
        const added = detected.filter((d) => !isDuplicate(d, prev));
        if (added.length > 0) {
          setNewFound(added.length);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2200);
        }
        return [...prev, ...added];
      });
      setScanCount((n) => n + 1);
    } catch (err) {
      console.error('[RoomScanner] capture error:', err);
    } finally {
      isCapturing.current = false;
      setIsAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;

    function loop(ts: number) {
      rafRef.current = requestAnimationFrame(loop);

      const dc  = diffCanvas.current;
      const vid = videoRef.current;
      if (!dc || !vid || vid.readyState < 2) return;

      const ctx = dc.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(vid, 0, 0, DIFF_W, DIFF_H);
      const frame = ctx.getImageData(0, 0, DIFF_W, DIFF_H);

      const dt   = lastRafTime.current ? ts - lastRafTime.current : 16;
      lastRafTime.current = ts;

      const score = prevFrame.current ? motionScore(prevFrame.current, frame) : 999;
      prevFrame.current   = frame;

      const cooldownOk = (performance.now() - lastCapTime.current) > CAPTURE_COOLDOWN_MS;

      if (score < MOTION_STILL_THRESHOLD && cooldownOk && !isCapturing.current) {
        stillMs.current = Math.min(stillMs.current + dt, STILL_THRESHOLD_MS);
      } else {
        stillMs.current = Math.max(stillMs.current - dt * 2, 0); // drop faster than it rises
      }

      const pct = stillMs.current / STILL_THRESHOLD_MS;
      setStillPct(pct);

      if (pct >= 1 && !isCapturing.current && cooldownOk && !isAnalyzing) {
        stillMs.current = 0;
        captureAndDetect();
      }
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isReady, isAnalyzing, captureAndDetect]);

  // ── Done ───────────────────────────────────────────────────────────────────
  const handleDone = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    cancelAnimationFrame(rafRef.current);

    if (lastCapture && items.length > 0) {
      onScanComplete(items, lastCapture);
    } else {
      onClose();
    }
  }, [items, lastCapture, onScanComplete, onClose]);

  const handleClose = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    cancelAnimationFrame(rafRef.current);
    onClose();
  };

  // ── Ring SVG ───────────────────────────────────────────────────────────────
  const RING_R  = 34;
  const RING_C  = 42;
  const RING_CIRC = 2 * Math.PI * RING_R;
  const ringDash  = RING_CIRC * stillPct;

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position:      'fixed',
        inset:         0,
        background:    '#000',
        zIndex:        999,
        display:       'flex',
        flexDirection: 'column',
        fontFamily:    "'Inter', sans-serif",
      }}
    >
      {/* Hidden diff canvas */}
      <canvas
        ref={diffCanvas}
        width={DIFF_W}
        height={DIFF_H}
        style={{ display: 'none' }}
      />

      {/* ── Top bar ── */}
      <div
        style={{
          position:       'relative',
          zIndex:         5,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '14px 18px',
          background:     'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
        }}
      >
        <button
          onClick={handleClose}
          style={{
            background:   'rgba(255,255,255,0.12)',
            border:       '1px solid rgba(255,255,255,0.18)',
            borderRadius: 10,
            color:        '#fff',
            padding:      '8px 14px',
            fontSize:     '0.82rem',
            fontWeight:   600,
            cursor:       'pointer',
            fontFamily:   'inherit',
          }}
        >
          ✕ Cancel
        </button>

        {/* Scan count badge */}
        <div
          style={{
            position:     'absolute',
            left:         '50%',
            transform:    'translateX(-50%)',
            display:      'flex',
            alignItems:   'center',
            gap:          7,
            background:   'rgba(0,0,0,0.55)',
            border:       '1px solid rgba(108,99,255,0.35)',
            borderRadius: 100,
            padding:      '5px 14px',
          }}
        >
          <div
            style={{
              width:      7,
              height:     7,
              borderRadius: '50%',
              background: '#6c63ff',
              animation:  'rs-pulse 1.4s ease-in-out infinite',
            }}
          />
          <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>
            {isAnalyzing
              ? 'Analyzing…'
              : scanCount === 0
              ? 'Scanning room…'
              : `${items.length} item${items.length !== 1 ? 's' : ''} found`}
          </span>
        </div>

        {/* Done button */}
        <button
          onClick={handleDone}
          disabled={items.length === 0}
          style={{
            background:   items.length > 0
              ? 'linear-gradient(135deg, #6c63ff, #a855f7)'
              : 'rgba(255,255,255,0.1)',
            border:       'none',
            borderRadius: 10,
            color:        items.length > 0 ? '#fff' : 'rgba(255,255,255,0.35)',
            padding:      '8px 16px',
            fontSize:     '0.82rem',
            fontWeight:   700,
            cursor:       items.length > 0 ? 'pointer' : 'default',
            fontFamily:   'inherit',
            transition:   'all 0.25s',
            boxShadow:    items.length > 0 ? '0 4px 18px rgba(108,99,255,0.45)' : 'none',
          }}
        >
          Done →
        </button>
      </div>

      {/* ── Viewfinder ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />

        {/* ── Corner guide rect ── */}
        {isReady && !error && (
          <div
            style={{
              position:     'absolute',
              inset:        '10% 6%',
              border:       `2px solid ${isAnalyzing ? 'rgba(251,191,36,0.7)' : 'rgba(108,99,255,0.6)'}`,
              borderRadius: 16,
              transition:   'border-color 0.3s',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* ── Stillness progress ring + shutter indicator ── */}
        {isReady && !error && !isAnalyzing && (
          <div
            style={{
              position:       'absolute',
              bottom:         'calc(10% + 20px)',
              left:           '50%',
              transform:      'translateX(-50%)',
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              gap:            8,
              pointerEvents:  'none',
            }}
          >
            <svg width={RING_C * 2} height={RING_C * 2} style={{ transform: 'rotate(-90deg)' }}>
              {/* Track */}
              <circle
                cx={RING_C} cy={RING_C} r={RING_R}
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={4}
              />
              {/* Progress */}
              <circle
                cx={RING_C} cy={RING_C} r={RING_R}
                fill="none"
                stroke={stillPct > 0.7 ? '#4ade80' : '#6c63ff'}
                strokeWidth={4}
                strokeLinecap="round"
                strokeDasharray={`${ringDash} ${RING_CIRC}`}
                style={{ transition: 'stroke-dasharray 0.08s linear, stroke 0.3s' }}
              />
              {/* Inner circle */}
              <circle cx={RING_C} cy={RING_C} r={18} fill="rgba(0,0,0,0.45)" />
              {/* Center icon */}
              <text
                x={RING_C} y={RING_C + 6}
                textAnchor="middle"
                fontSize={16}
                style={{ transform: 'rotate(90deg)', transformOrigin: `${RING_C}px ${RING_C}px` }}
              >
                {stillPct > 0.5 ? '🔒' : '📡'}
              </text>
            </svg>
            <div
              style={{
                color:        'rgba(255,255,255,0.6)',
                fontSize:     '0.68rem',
                fontWeight:   500,
                letterSpacing: '0.03em',
                background:   'rgba(0,0,0,0.4)',
                padding:      '3px 10px',
                borderRadius: 100,
              }}
            >
              {stillPct > 0.7 ? 'Hold still…' : 'Point at items'}
            </div>
          </div>
        )}

        {/* ── Analyzing overlay ── */}
        {isAnalyzing && (
          <div
            style={{
              position:       'absolute',
              inset:          0,
              background:     'rgba(0,0,0,0.45)',
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            14,
            }}
          >
            <div
              style={{
                width:        52,
                height:       52,
                border:       '4px solid rgba(108,99,255,0.25)',
                borderTop:    '4px solid #6c63ff',
                borderRadius: '50%',
                animation:    'ms-spin 0.8s linear infinite',
              }}
            />
            <div
              style={{
                color:        'rgba(255,255,255,0.75)',
                fontSize:     '0.85rem',
                fontWeight:   600,
                background:   'rgba(0,0,0,0.5)',
                padding:      '6px 18px',
                borderRadius: 100,
              }}
            >
              Identifying items…
            </div>
          </div>
        )}

        {/* ── "Found X items" toast ── */}
        {showToast && (
          <div
            style={{
              position:     'absolute',
              top:          '12%',
              left:         '50%',
              transform:    'translateX(-50%)',
              background:   'rgba(74,222,128,0.18)',
              border:       '1px solid rgba(74,222,128,0.5)',
              borderRadius: 100,
              color:        '#4ade80',
              fontSize:     '0.82rem',
              fontWeight:   700,
              padding:      '7px 18px',
              whiteSpace:   'nowrap',
              animation:    'rs-fadein 0.25s ease',
            }}
          >
            +{newFound} item{newFound !== 1 ? 's' : ''} detected ✓
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div
            style={{
              position:       'absolute',
              inset:          0,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              padding:        32,
            }}
          >
            <div
              style={{
                background:   'rgba(248,113,113,0.12)',
                border:       '1px solid rgba(248,113,113,0.35)',
                borderRadius: 14,
                padding:      '24px 28px',
                color:        '#f87171',
                fontSize:     '0.85rem',
                lineHeight:   1.6,
                textAlign:    'center',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>📷</div>
              {error}
              <button
                onClick={handleClose}
                style={{
                  display:      'block',
                  margin:       '18px auto 0',
                  background:   'rgba(248,113,113,0.15)',
                  border:       '1px solid rgba(248,113,113,0.35)',
                  borderRadius: 8,
                  color:        '#f87171',
                  padding:      '8px 20px',
                  fontSize:     '0.82rem',
                  cursor:       'pointer',
                  fontFamily:   'inherit',
                }}
              >
                Go back
              </button>
            </div>
          </div>
        )}

        {/* ── Camera loading ── */}
        {!isReady && !error && (
          <div
            style={{
              position:       'absolute',
              inset:          0,
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            14,
            }}
          >
            <div
              style={{
                width:        40,
                height:       40,
                border:       '3px solid rgba(108,99,255,0.25)',
                borderTop:    '3px solid #6c63ff',
                borderRadius: '50%',
                animation:    'ms-spin 0.9s linear infinite',
              }}
            />
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
              Starting camera…
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom sheet — accumulated items ── */}
      <div
        style={{
          background:    'linear-gradient(to top, rgba(0,0,0,0.92) 60%, transparent)',
          padding:       '16px 16px 40px',
          minHeight:     items.length > 0 ? 110 : 80,
          transition:    'min-height 0.3s',
        }}
      >
        {items.length === 0 ? (
          <div
            style={{
              textAlign:  'center',
              color:      'rgba(255,255,255,0.3)',
              fontSize:   '0.75rem',
              paddingTop: 8,
            }}
          >
            Pan slowly around the room — items appear here automatically
          </div>
        ) : (
          <>
            <div
              style={{
                fontSize:     '0.68rem',
                fontWeight:   700,
                color:        'rgba(255,255,255,0.4)',
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              Detected Items ({items.length})
            </div>
            <div
              style={{
                display:    'flex',
                flexWrap:   'wrap',
                gap:        7,
              }}
            >
              {items.map((item, i) => (
                <div
                  key={i}
                  style={{
                    background:   'rgba(108,99,255,0.18)',
                    border:       '1px solid rgba(108,99,255,0.35)',
                    borderRadius: 100,
                    color:        'rgba(255,255,255,0.85)',
                    fontSize:     '0.72rem',
                    fontWeight:   600,
                    padding:      '5px 12px',
                    animation:    'rs-fadein 0.3s ease',
                  }}
                >
                  {item.label}
                </div>
              ))}
            </div>

            {/* Done CTA repeated at bottom for thumb reach */}
            <button
              onClick={handleDone}
              style={{
                display:      'block',
                width:        '100%',
                marginTop:    16,
                background:   'linear-gradient(135deg, #6c63ff, #a855f7)',
                border:       'none',
                borderRadius: 14,
                color:        '#fff',
                fontSize:     '1rem',
                fontWeight:   700,
                padding:      '16px',
                cursor:       'pointer',
                fontFamily:   'inherit',
                letterSpacing: '-0.01em',
                boxShadow:    '0 6px 24px rgba(108,99,255,0.4)',
              }}
            >
              Generate Listings for {items.length} Item{items.length !== 1 ? 's' : ''} →
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes rs-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.65); }
        }
        @keyframes rs-fadein {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ms-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
