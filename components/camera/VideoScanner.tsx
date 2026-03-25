'use client';

// ─────────────────────────────────────────────────────────────────────────────
// VideoScanner — Record a narrated video scan, detect items in real-time,
// match narration to detected objects, extract sharp stills per item,
// then show a review screen before handing off to the listing pipeline.
//
// Phases:  idle → recording → review
//
// Key features:
//   • getUserMedia (video + audio) → live viewfinder
//   • Web Speech API: continuous speech recognition for narration timestamps
//   • Every 3 s: capture frame → POST /api/analyze mode=detect → merge items
//   • Per-item: crop bestStill from highest-sharpness frame
//   • Narration: assign last-N-chars of transcript at first-seen time
//   • Review screen: toggle items, see thumbnails + narration, confirm
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CompressedImage, DetectedObject } from '@/types';

// ── Public types ──────────────────────────────────────────────────────────────

export interface VideoScanItem {
  id:          string;
  label:       string;
  confidence:  'high' | 'medium' | 'low';
  detection:   DetectedObject;   // bbox on baseImage (bestStill of the full frame)
  cropDataUrl: string;           // pre-cropped best still for this item
  narration:   string;           // speech segment captured when item appeared
  selected:    boolean;
}

interface VideoScannerProps {
  onScanComplete: (items: VideoScanItem[], baseImage: CompressedImage) => void;
  onClose:        () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Pixel-variance based sharpness score (higher = sharper). */
function sharpnessScore(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  const { data } = ctx.getImageData(0, 0, w, h);
  let sum = 0, sq = 0, n = 0;
  for (let i = 0; i < data.length; i += 20) {
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sum += l; sq += l * l; n++;
  }
  const m = sum / n;
  return sq / n - m * m;  // variance
}

/** Crop a video frame at fractional bbox → JPEG data-URL + sharpness. */
function cropFrame(
  video: HTMLVideoElement,
  obj: DetectedObject,
  pad = 0.03,
): { dataUrl: string; sharpness: number } {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const x = Math.max(0, (obj.xFrac - pad) * vw);
  const y = Math.max(0, (obj.yFrac - pad) * vh);
  const w = Math.min(vw - x, (obj.wFrac + pad * 2) * vw);
  const h = Math.min(vh - y, (obj.hFrac + pad * 2) * vh);
  const c = document.createElement('canvas');
  c.width  = Math.round(w);
  c.height = Math.round(h);
  const ctx = c.getContext('2d')!;
  ctx.drawImage(video, x, y, w, h, 0, 0, c.width, c.height);
  return { dataUrl: c.toDataURL('image/jpeg', 0.85), sharpness: sharpnessScore(ctx, c.width, c.height) };
}

/** Capture a full video frame scaled to ≤1280px → CompressedImage. */
function captureFullFrame(video: HTMLVideoElement): CompressedImage {
  const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
  const c     = document.createElement('canvas');
  c.width     = Math.round(video.videoWidth  * scale);
  c.height    = Math.round(video.videoHeight * scale);
  c.getContext('2d')!.drawImage(video, 0, 0, c.width, c.height);
  const dataUrl = c.toDataURL('image/jpeg', 0.82);
  const bytes   = Math.round(dataUrl.length * 0.75);
  return {
    dataUrl,
    name:          'video-frame.jpg',
    size:          bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`,
    naturalWidth:  c.width,
    naturalHeight: c.height,
  };
}

/** True if two item labels share at least one meaningful word. */
function labelsOverlap(a: string, b: string): boolean {
  const wa = a.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const wb = new Set(b.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  return wa.some((w) => wb.has(w));
}

type SpeechRecognitionType = typeof window extends { SpeechRecognition: infer T } ? T : never;

// ─────────────────────────────────────────────────────────────────────────────

export default function VideoScanner({ onScanComplete, onClose }: VideoScannerProps) {
  type Phase = 'idle' | 'recording' | 'review';

  const [phase,       setPhase]       = useState<Phase>('idle');
  const [items,       setItems]       = useState<VideoScanItem[]>([]);
  const [transcript,  setTranscript]  = useState('');
  const [elapsed,     setElapsed]     = useState(0);
  const [scanMsg,     setScanMsg]     = useState('');
  const [scanCount,   setScanCount]   = useState(0);
  const [hasSpeech,   setHasSpeech]   = useState(false);

  const videoRef       = useRef<HTMLVideoElement>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const speechRef      = useRef<SpeechRecognitionType | null>(null);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const detectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const detectingRef   = useRef(false);
  const startTimeRef   = useRef(0);
  const transcriptRef  = useRef('');
  const itemsRef       = useRef<VideoScanItem[]>([]);

  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
  useEffect(() => { itemsRef.current = items; }, [items]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => {
    timerRef.current      && clearInterval(timerRef.current);
    detectTimerRef.current && clearInterval(detectTimerRef.current);
    (speechRef.current as { stop?: () => void } | null)?.stop?.();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  // ── Frame detection (runs on interval while recording) ───────────────────
  const runFrameDetection = useCallback(async () => {
    if (detectingRef.current) return;
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    detectingRef.current = true;
    setScanMsg('Scanning…');

    try {
      const frame  = captureFullFrame(video);
      const base64 = frame.dataUrl.split(',')[1];

      const res = await fetch('/api/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ imageBase64: base64, mediaType: 'image/jpeg', mode: 'detect' }),
      });
      if (!res.ok) throw new Error('detect failed');
      const data = await res.json();
      const objs: DetectedObject[] = data.objects ?? [];

      if (objs.length > 0) {
        setScanCount((n) => n + 1);
        mergeIntoItems(objs, video);
      }
      setScanMsg(objs.length > 0 ? `${objs.length} item${objs.length !== 1 ? 's' : ''} found` : '');
    } catch {
      setScanMsg('');
    } finally {
      detectingRef.current = false;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const mergeIntoItems = useCallback((objs: DetectedObject[], video: HTMLVideoElement) => {
    const ts      = Date.now() - startTimeRef.current;
    const current = [...itemsRef.current];
    const narText = transcriptRef.current;

    objs.forEach((obj) => {
      const crop  = cropFrame(video, obj);
      const match = current.find((it) => labelsOverlap(it.label, obj.label));

      if (match) {
        // Update if this crop is sharper
        if (crop.sharpness > (match as { _sharpness?: number })._sharpness!) {
          const idx = current.indexOf(match);
          current[idx] = { ...match, cropDataUrl: crop.dataUrl, detection: obj };
          (current[idx] as { _sharpness?: number })._sharpness = crop.sharpness;
        }
      } else {
        const newItem: VideoScanItem & { _sharpness: number } = {
          id:          `vs-${ts}-${Math.random().toString(36).slice(2, 6)}`,
          label:       obj.label,
          confidence:  obj.confidence,
          detection:   obj,
          cropDataUrl: crop.dataUrl,
          narration:   narText.slice(-400).trim(),
          selected:    true,
          _sharpness:  crop.sharpness,
        };
        current.push(newItem);
      }
    });

    setItems([...current]);
  }, []);

  // ── Start recording ───────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted     = true;
        await videoRef.current.play();
      }

      // Web Speech API (non-fatal if unavailable)
      const SR = (
        (window as { SpeechRecognition?: SpeechRecognitionType }).SpeechRecognition ||
        (window as { webkitSpeechRecognition?: SpeechRecognitionType }).webkitSpeechRecognition
      );
      if (SR) {
        const sr = new (SR as new () => SpeechRecognition)();
        (sr as SpeechRecognition & { continuous: boolean; interimResults: boolean; lang: string }).continuous     = true;
        (sr as SpeechRecognition & { continuous: boolean; interimResults: boolean; lang: string }).interimResults = true;
        (sr as SpeechRecognition & { continuous: boolean; interimResults: boolean; lang: string }).lang           = 'en-US';
        (sr as SpeechRecognition).onresult = (ev: SpeechRecognitionEvent) => {
          let full = '';
          for (let i = 0; i < ev.results.length; i++) full += ev.results[i][0].transcript + ' ';
          setTranscript(full.trim());
        };
        (sr as SpeechRecognition).onerror = () => {};
        (sr as SpeechRecognition).start();
        speechRef.current = sr as unknown as SpeechRecognitionType;
        setHasSpeech(true);
      }

      startTimeRef.current = Date.now();
      setPhase('recording');
      setItems([]);
      setTranscript('');
      setScanCount(0);
      setScanMsg('');
      setElapsed(0);

      timerRef.current = setInterval(
        () => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)),
        1000,
      );
      // First detection after 1.5 s, then every 3 s
      const firstTimeout = setTimeout(() => runFrameDetection(), 1500);
      detectTimerRef.current = setInterval(() => runFrameDetection(), 3000);
      // Store the timeout so cleanup can clear it
      return () => clearTimeout(firstTimeout);
    } catch {
      onClose();
    }
  }, [runFrameDetection, onClose]);

  // ── Stop recording → go to review ─────────────────────────────────────────
  const stopRecording = useCallback(() => {
    timerRef.current       && clearInterval(timerRef.current);
    detectTimerRef.current && clearInterval(detectTimerRef.current);
    (speechRef.current as { stop?: () => void } | null)?.stop?.();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setPhase('review');
  }, []);

  // ── Toggle item selection ─────────────────────────────────────────────────
  const toggleItem = (id: string) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, selected: !it.selected } : it)));

  // ── Confirm → pass selected items to parent ───────────────────────────────
  const handleConfirm = useCallback(() => {
    const selected = items.filter((it) => it.selected);
    if (selected.length === 0) return;

    // Use the bestStill of the first item as the base image
    const hero     = selected[0];
    const img      = new Image();
    img.onload = () => {
      const baseImage: CompressedImage = {
        dataUrl:       hero.cropDataUrl,
        name:          'video-scan.jpg',
        size:          `${(Math.round(hero.cropDataUrl.length * 0.75) / 1024).toFixed(1)} KB`,
        naturalWidth:  img.naturalWidth,
        naturalHeight: img.naturalHeight,
      };
      onScanComplete(selected, baseImage);
    };
    img.src = hero.cropDataUrl;
  }, [items, onScanComplete]);

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const btnBase: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 700,
    cursor:     'pointer',
    border:     'none',
    outline:    'none',
  };

  // ── IDLE ─────────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg)',
        display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif",
      }}>
        {/* Back */}
        <button
          onClick={onClose}
          style={{ ...btnBase, position: 'absolute', top: 20, left: 20, background: 'var(--surface2)', color: 'var(--text)', borderRadius: 10, padding: '8px 16px', fontSize: '0.85rem', border: '1px solid var(--border)' as string } as React.CSSProperties}
        >
          ← Back
        </button>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 32px 40px' }}>
          {/* Icon */}
          <div style={{ width: 80, height: 80, borderRadius: 24, background: 'linear-gradient(135deg,var(--accent),var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', marginBottom: 28, boxShadow: '0 12px 40px rgba(108,99,255,0.4)' }}>
            🎬
          </div>

          <h2 style={{ fontSize: '1.7rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 12, textAlign: 'center' }}>
            Narrated Video Scan
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.7, textAlign: 'center', maxWidth: 340, marginBottom: 36 }}>
            Pan your camera across items while narrating what you see.
            AI detects and tracks every object — extracting the sharpest still image per item.
          </p>

          {/* Feature list */}
          <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
            {[
              ['🎯', 'Real-time detection', 'Items identified every 3 seconds'],
              ['🎙️', 'Narration capture',  'Speech-to-text saved per item'],
              ['📸', 'Best-frame extraction', 'Sharpest still selected automatically'],
            ].map(([icon, title, sub]) => (
              <div key={title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px' }}>
                <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{title}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={startRecording}
            style={{ ...btnBase, width: '100%', maxWidth: 360, background: 'linear-gradient(135deg,var(--accent),var(--accent2))', color: '#fff', borderRadius: 16, padding: '18px', fontSize: '1rem', letterSpacing: '-0.01em', boxShadow: '0 8px 28px rgba(108,99,255,0.42)' }}
          >
            🎬 Start Recording
          </button>
        </div>
      </div>
    );
  }

  // ── RECORDING ─────────────────────────────────────────────────────────────
  if (phase === 'recording') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#000', fontFamily: "'Inter', sans-serif" }}>
        {/* Viewfinder */}
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />

        {/* Overlay gradient bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to top,rgba(0,0,0,0.85) 0%,transparent 100%)', pointerEvents: 'none' }} />
        {/* Overlay gradient top */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '30%', background: 'linear-gradient(to bottom,rgba(0,0,0,0.6) 0%,transparent 100%)', pointerEvents: 'none' }} />

        {/* Top bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0' }}>
          {/* REC indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.5)', borderRadius: 100, padding: '6px 14px', backdropFilter: 'blur(8px)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171', animation: 'vs-pulse 1.2s ease-in-out infinite' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', letterSpacing: '0.06em' }}>REC {fmtTime(elapsed)}</span>
          </div>

          {/* Scan count */}
          {scanCount > 0 && (
            <div style={{ background: 'rgba(108,99,255,0.7)', borderRadius: 100, padding: '6px 14px', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff' }}>
                {items.length} item{items.length !== 1 ? 's' : ''} detected
              </span>
            </div>
          )}
        </div>

        {/* Scan flash message */}
        {scanMsg && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(0,0,0,0.55)', borderRadius: 100, padding: '6px 18px', backdropFilter: 'blur(8px)', pointerEvents: 'none' }}>
            <span style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 600 }}>✦ {scanMsg}</span>
          </div>
        )}

        {/* Bottom panel */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 20px 36px' }}>
          {/* Detected item chips */}
          {items.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {items.slice(-8).map((it) => (
                <div
                  key={it.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 100, padding: '4px 10px', backdropFilter: 'blur(6px)' }}
                >
                  <img src={it.cropDataUrl} alt="" style={{ width: 22, height: 22, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.68rem', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>{it.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Speech transcript */}
          {hasSpeech && transcript && (
            <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: '8px 14px', marginBottom: 14, backdropFilter: 'blur(8px)' }}>
              <div style={{ fontSize: '0.58rem', fontWeight: 700, color: 'rgba(108,99,255,0.9)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>🎙 Narration</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, maxHeight: 48, overflow: 'hidden' }}>
                {transcript.slice(-200)}
              </div>
            </div>
          )}

          {/* Tip */}
          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginBottom: 14 }}>
            {hasSpeech ? 'Narrate as you scan — speech is saved per item' : 'Pan slowly across all items'}
          </div>

          {/* Stop button */}
          <button
            onClick={stopRecording}
            style={{ ...btnBase, width: '100%', background: 'rgba(248,113,113,0.9)', color: '#fff', borderRadius: 16, padding: '18px', fontSize: '1rem', backdropFilter: 'blur(8px)', boxShadow: '0 6px 24px rgba(248,113,113,0.4)' }}
          >
            ⏹ Stop Recording {items.length > 0 ? `(${items.length} items)` : ''}
          </button>
        </div>

        <style>{`
          @keyframes vs-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
        `}</style>
      </div>
    );
  }

  // ── REVIEW ────────────────────────────────────────────────────────────────
  const selectedCount = items.filter((it) => it.selected).length;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg)', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 0' }}>
        <button
          onClick={() => { setPhase('idle'); setItems([]); setTranscript(''); }}
          style={{ ...btnBase, background: 'var(--surface2)', color: 'var(--text)', borderRadius: 10, padding: '8px 14px', fontSize: '0.82rem', border: '1px solid var(--border)' as string } as React.CSSProperties}
        >
          ← Rescan
        </button>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Review Scan</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 1 }}>
            {items.length} item{items.length !== 1 ? 's' : ''} detected · {selectedCount} selected
          </div>
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔍</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>No items detected</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--muted)', textAlign: 'center', lineHeight: 1.6, maxWidth: 280, marginBottom: 28 }}>
            Try recording again — move slower and make sure items are clearly visible.
          </div>
          <button
            onClick={() => { setPhase('idle'); setItems([]); }}
            style={{ ...btnBase, background: 'linear-gradient(135deg,var(--accent),var(--accent2))', color: '#fff', borderRadius: 14, padding: '14px 28px', fontSize: '0.95rem' }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Item list */}
      {items.length > 0 && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>
          {/* Select all / deselect all */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Detected Items
            </span>
            <button
              onClick={() => {
                const allSelected = items.every((it) => it.selected);
                setItems((prev) => prev.map((it) => ({ ...it, selected: !allSelected })));
              }}
              style={{ ...btnBase, background: 'transparent', color: 'var(--muted)', fontSize: '0.72rem', padding: '4px 8px' }}
            >
              {items.every((it) => it.selected) ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 120 }}>
            {items.map((item, i) => (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                style={{
                  display:      'flex',
                  gap:          14,
                  alignItems:   'flex-start',
                  background:   'var(--surface)',
                  border:       `1.5px solid ${item.selected ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 16,
                  padding:      '14px',
                  cursor:       'pointer',
                  transition:   'border-color 0.15s',
                  opacity:      item.selected ? 1 : 0.5,
                }}
              >
                {/* Thumbnail */}
                <img
                  src={item.cropDataUrl}
                  alt={item.label}
                  style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 12, flexShrink: 0, border: '1px solid var(--border)', background: '#0a0a12' }}
                />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>
                      {item.label}
                    </div>
                    {/* Checkbox */}
                    <div style={{
                      width: 22, height: 22, borderRadius: 7, border: `2px solid ${item.selected ? 'var(--accent)' : 'var(--border)'}`,
                      background: item.selected ? 'var(--accent)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'all 0.15s',
                    }}>
                      {item.selected && <span style={{ fontSize: '0.7rem', color: '#fff' }}>✓</span>}
                    </div>
                  </div>

                  {/* Confidence badge */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: item.narration ? 8 : 0, alignItems: 'center' }}>
                    <span style={{
                      fontSize: '0.58rem', fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                      background: item.confidence === 'high' ? 'rgba(74,222,128,0.12)' : item.confidence === 'medium' ? 'rgba(251,191,36,0.12)' : 'rgba(248,113,113,0.12)',
                      color:      item.confidence === 'high' ? '#4ade80' : item.confidence === 'medium' ? '#fbbf24' : '#f87171',
                    }}>
                      {item.confidence} confidence
                    </span>
                    <span style={{ fontSize: '0.58rem', color: 'var(--muted)' }}>
                      #{i + 1}
                    </span>
                  </div>

                  {/* Narration excerpt */}
                  {item.narration && (
                    <div style={{ fontSize: '0.68rem', color: 'var(--muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      🎙 {item.narration}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom CTA */}
      {items.length > 0 && (
        <div style={{ padding: '12px 16px 36px', background: 'linear-gradient(to top, var(--bg) 70%, transparent)' }}>
          <button
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            style={{
              ...btnBase,
              width:         '100%',
              background:    selectedCount > 0 ? 'linear-gradient(135deg,var(--accent),var(--accent2))' : 'var(--surface2)',
              color:         selectedCount > 0 ? '#fff' : 'var(--muted)',
              borderRadius:  16,
              padding:       '18px',
              fontSize:      '1rem',
              letterSpacing: '-0.01em',
              boxShadow:     selectedCount > 0 ? '0 6px 28px rgba(108,99,255,0.42)' : 'none',
              transition:    'all 0.2s',
            }}
          >
            {selectedCount === 0
              ? 'Select items to continue'
              : `✦ Generate Listings for ${selectedCount} Item${selectedCount !== 1 ? 's' : ''} →`}
          </button>
          {transcript && (
            <div style={{ marginTop: 10, fontSize: '0.65rem', color: 'var(--muted)', textAlign: 'center', lineHeight: 1.5 }}>
              🎙 Narration captured · {transcript.split(' ').length} words
            </div>
          )}
        </div>
      )}
    </div>
  );
}
