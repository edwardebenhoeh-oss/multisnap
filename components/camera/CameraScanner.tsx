'use client';

// ─────────────────────────────────────────────────────────────────────────────
// CameraScanner — Fullscreen live camera viewfinder for mobile room scanning.
//
// Uses getUserMedia (rear camera preferred) so the user sees a live preview
// before shooting. On capture:
//   1. Flashes white (shutter feel)
//   2. Draws the video frame to canvas at native resolution
//   3. Compresses it via imageUtils
//   4. Calls onCapture(CompressedImage) → caller can immediately run detection
//
// Falls back gracefully if camera permissions are denied.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CompressedImage } from '@/types';
import { compressImage } from '@/lib/imageUtils';

interface CameraScannerProps {
  /** Called with the captured + compressed image — parent should auto-scan. */
  onCapture: (image: CompressedImage) => void;
  /** Called when user cancels without capturing. */
  onClose: () => void;
}

export default function CameraScanner({ onCapture, onClose }: CameraScannerProps) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isReady, setIsReady]   = useState(false);
  const [flash, setFlash]       = useState(false);
  const [captured, setCaptured] = useState(false);  // prevents double-taps
  const [error, setError]       = useState<string | null>(null);

  // ── Start rear camera ──────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width:  { ideal: 3840 },
            height: { ideal: 2160 },
          },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (active) setIsReady(true);
          };
        }
      } catch {
        if (active) {
          setError(
            'Camera access was denied. Please allow camera permission in your browser settings and try again.',
          );
        }
      }
    }

    startCamera();

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ── Stop stream helper ─────────────────────────────────────────────────────
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // ── Shutter ────────────────────────────────────────────────────────────────
  const capture = useCallback(async () => {
    if (!isReady || captured || !videoRef.current) return;
    setCaptured(true);

    // Flash
    setFlash(true);
    setTimeout(() => setFlash(false), 180);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) { setCaptured(false); return; }
    ctx.drawImage(video, 0, 0);

    stopStream();

    canvas.toBlob(
      async (blob) => {
        if (!blob) { setCaptured(false); return; }
        const file = new File([blob], 'room-scan.jpg', { type: 'image/jpeg' });
        const compressed = await compressImage(file);
        onCapture(compressed);
      },
      'image/jpeg',
      0.93,
    );
  }, [isReady, captured, stopStream, onCapture]);

  const handleClose = () => {
    stopStream();
    onClose();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position:       'fixed',
        inset:          0,
        background:     '#000',
        zIndex:         999,
        display:        'flex',
        flexDirection:  'column',
        fontFamily:     "'Inter', sans-serif",
      }}
    >
      {/* ── Flash overlay ── */}
      {flash && (
        <div
          style={{
            position:       'absolute',
            inset:          0,
            background:     '#fff',
            opacity:        0.75,
            zIndex:         20,
            pointerEvents:  'none',
            transition:     'opacity 0.18s',
          }}
        />
      )}

      {/* ── Top bar ── */}
      <div
        style={{
          padding:        '14px 20px',
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          position:       'relative',
          zIndex:         5,
          background:     'linear-gradient(to bottom, rgba(0,0,0,0.65), transparent)',
        }}
      >
        <button
          onClick={handleClose}
          style={{
            background:   'rgba(255,255,255,0.12)',
            border:       '1px solid rgba(255,255,255,0.2)',
            borderRadius: 10,
            color:        '#fff',
            padding:      '8px 16px',
            fontSize:     '0.85rem',
            fontWeight:   600,
            cursor:       'pointer',
            fontFamily:   'inherit',
          }}
        >
          ✕ Cancel
        </button>

        <div
          style={{
            position:  'absolute',
            left:      '50%',
            transform: 'translateX(-50%)',
            color:     'rgba(255,255,255,0.65)',
            fontSize:  '0.78rem',
            fontWeight: 600,
            letterSpacing: '0.03em',
            whiteSpace: 'nowrap',
          }}
        >
          Point at a room or table
        </div>
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

        {/* Framing guides (shown once ready) */}
        {isReady && !error && (
          <>
            {/* Dimmed border with cut-out guide rectangle */}
            <div
              style={{
                position:   'absolute',
                inset:      '8% 5%',
                border:     '2px solid rgba(108,99,255,0.7)',
                borderRadius: 16,
                boxShadow:  '0 0 0 9999px rgba(0,0,0,0.22)',
                pointerEvents: 'none',
              }}
            />

            {/* Corner accents */}
            {[
              { top: '8%',  left:  '5%',  borderTop:    '3px solid #6c63ff', borderLeft:   '3px solid #6c63ff' },
              { top: '8%',  right: '5%',  borderTop:    '3px solid #6c63ff', borderRight:  '3px solid #6c63ff' },
              { bottom: '8%', left: '5%', borderBottom: '3px solid #6c63ff', borderLeft:   '3px solid #6c63ff' },
              { bottom: '8%', right: '5%',borderBottom: '3px solid #6c63ff', borderRight:  '3px solid #6c63ff' },
            ].map((style, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width:    24,
                  height:   24,
                  borderRadius: 3,
                  pointerEvents: 'none',
                  ...style,
                }}
              />
            ))}

            {/* Tip label */}
            <div
              style={{
                position:       'absolute',
                bottom:         'calc(8% + 16px)',
                left:           '50%',
                transform:      'translateX(-50%)',
                color:          'rgba(255,255,255,0.55)',
                fontSize:       '0.72rem',
                fontWeight:     500,
                letterSpacing:  '0.02em',
                pointerEvents:  'none',
                whiteSpace:     'nowrap',
                background:     'rgba(0,0,0,0.35)',
                padding:        '4px 12px',
                borderRadius:   100,
              }}
            >
              Get the whole room in frame for best results
            </div>
          </>
        )}

        {/* Camera loading state */}
        {!isReady && !error && (
          <div
            style={{
              position:       'absolute',
              inset:          0,
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            12,
            }}
          >
            <div
              style={{
                width:        40,
                height:       40,
                border:       '3px solid rgba(108,99,255,0.3)',
                borderTop:    '3px solid #6c63ff',
                borderRadius: '50%',
                animation:    'ms-spin 0.9s linear infinite',
              }}
            />
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem' }}>
              Starting camera…
            </div>
          </div>
        )}

        {/* Error state */}
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
                maxWidth:     320,
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>📷</div>
              {error}
              <button
                onClick={handleClose}
                style={{
                  display:      'block',
                  margin:       '18px auto 0',
                  background:   'rgba(248,113,113,0.2)',
                  border:       '1px solid rgba(248,113,113,0.4)',
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
      </div>

      {/* ── Shutter bar ── */}
      <div
        style={{
          padding:        '28px 0 52px',
          display:        'flex',
          justifyContent: 'center',
          alignItems:     'center',
          background:     'linear-gradient(to top, rgba(0,0,0,0.75), transparent)',
        }}
      >
        {/* Shutter button */}
        <button
          onClick={capture}
          disabled={!isReady || captured}
          aria-label="Capture photo"
          style={{
            width:        88,
            height:       88,
            borderRadius: '50%',
            border:       '4px solid rgba(255,255,255,0.85)',
            background:   'transparent',
            cursor:       isReady && !captured ? 'pointer' : 'default',
            position:     'relative',
            transition:   'transform 0.1s, opacity 0.2s',
            opacity:      isReady && !captured ? 1 : 0.4,
            transform:    captured ? 'scale(0.9)' : 'scale(1)',
          }}
        >
          {/* Inner filled circle — the actual visible "button" */}
          <div
            style={{
              position:     'absolute',
              inset:        8,
              borderRadius: '50%',
              background:   isReady && !captured
                ? 'linear-gradient(135deg, #6c63ff, #a855f7)'
                : 'rgba(255,255,255,0.3)',
              boxShadow:    isReady && !captured
                ? '0 0 28px rgba(108,99,255,0.6)'
                : 'none',
              transition:   'all 0.2s',
            }}
          />
        </button>
      </div>

      {/* Spin keyframe for loading indicator */}
      <style>{`@keyframes ms-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
