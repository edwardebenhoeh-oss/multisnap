'use client';

// ─────────────────────────────────────────────────────────────────────────────
// CropEditor — drag-to-adjust crop box shown in the review phase.
//
// The crop box is defined in image-fraction coordinates (0–1).
// The dimmed area outside the box uses a large box-shadow (iPhone Photos style).
// Corner handles allow resizing; dragging the box interior moves it.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useRef, useState } from 'react';
import { getEventPos } from '@/lib/imageUtils';

export interface CropBox {
  x: number;  // fraction 0–1
  y: number;
  w: number;
  h: number;
}

interface CropEditorProps {
  imgSrc:   string;
  cropBox:  CropBox;
  onChange: (box: CropBox) => void;
}

type HandleId = 'tl' | 'tr' | 'bl' | 'br' | 'move';

const MIN_FRAC = 0.05;

export default function CropEditor({ imgSrc, cropBox, onChange }: CropEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef      = useRef<{ handle: HandleId; startX: number; startY: number; startBox: CropBox } | null>(null);
  const [active, setActive] = useState(false);

  // Convert fraction → pixel offset within container
  const toPercent = (v: number) => `${(v * 100).toFixed(3)}%`;

  const onPointerDown = useCallback(
    (handle: HandleId, e: React.PointerEvent) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      const pos = getEventPos(e.nativeEvent);
      dragRef.current = { handle, startX: pos.x, startY: pos.y, startBox: { ...cropBox } };
      setActive(true);
    },
    [cropBox],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || !containerRef.current) return;
      const { handle, startX, startY, startBox } = dragRef.current;
      const rect  = containerRef.current.getBoundingClientRect();
      const pos   = getEventPos(e.nativeEvent);
      const dx    = (pos.x - startX) / rect.width;
      const dy    = (pos.y - startY) / rect.height;

      let { x, y, w, h } = startBox;

      if (handle === 'move') {
        x = Math.max(0, Math.min(1 - w, x + dx));
        y = Math.max(0, Math.min(1 - h, y + dy));
      } else {
        if (handle === 'tl') {
          const nx = Math.min(x + w - MIN_FRAC, x + dx);
          const ny = Math.min(y + h - MIN_FRAC, y + dy);
          w = w - (nx - x); h = h - (ny - y);
          x = nx; y = ny;
        } else if (handle === 'tr') {
          const ny = Math.min(y + h - MIN_FRAC, y + dy);
          w = Math.max(MIN_FRAC, w + dx);
          h = h - (ny - y); y = ny;
        } else if (handle === 'bl') {
          const nx = Math.min(x + w - MIN_FRAC, x + dx);
          w = w - (nx - x); h = Math.max(MIN_FRAC, h + dy);
          x = nx;
        } else if (handle === 'br') {
          w = Math.max(MIN_FRAC, w + dx);
          h = Math.max(MIN_FRAC, h + dy);
        }
        // Clamp to image bounds
        if (x < 0) { w += x; x = 0; }
        if (y < 0) { h += y; y = 0; }
        if (x + w > 1) w = 1 - x;
        if (y + h > 1) h = 1 - y;
        w = Math.max(MIN_FRAC, w);
        h = Math.max(MIN_FRAC, h);
      }

      onChange({ x, y, w, h });
    },
    [onChange],
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
    setActive(false);
  }, []);

  const { x, y, w, h } = cropBox;

  const handleStyle: React.CSSProperties = {
    position:        'absolute',
    width:           18,
    height:          18,
    background:      '#fff',
    border:          '2px solid var(--accent)',
    borderRadius:    4,
    cursor:          'nwse-resize',
    touchAction:     'none',
    zIndex:          3,
    transform:       'translate(-50%, -50%)',
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={{ position: 'relative', userSelect: 'none', lineHeight: 0, borderRadius: 10, overflow: 'hidden' }}
    >
      {/* Base image */}
      <img
        src={imgSrc}
        alt=""
        style={{ width: '100%', display: 'block', borderRadius: 10 }}
        draggable={false}
      />

      {/* Dim overlay with crop window cut-out using box-shadow trick */}
      <div
        style={{
          position:  'absolute',
          left:      toPercent(x),
          top:       toPercent(y),
          width:     toPercent(w),
          height:    toPercent(h),
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.52)',
          border:    `2px solid ${active ? 'var(--accent)' : 'rgba(108,99,255,0.7)'}`,
          borderRadius: 4,
          cursor:    'move',
          zIndex:    2,
          touchAction: 'none',
        }}
        onPointerDown={(e) => onPointerDown('move', e)}
      >
        {/* Corner handles */}
        {([
          ['tl', '0%',   '0%'],
          ['tr', '100%', '0%'],
          ['bl', '0%',   '100%'],
          ['br', '100%', '100%'],
        ] as [HandleId, string, string][]).map(([id, left, top]) => (
          <div
            key={id}
            style={{ ...handleStyle, left, top, cursor: id === 'tl' || id === 'br' ? 'nwse-resize' : 'nesw-resize' }}
            onPointerDown={(e) => onPointerDown(id, e)}
          />
        ))}
      </div>
    </div>
  );
}
