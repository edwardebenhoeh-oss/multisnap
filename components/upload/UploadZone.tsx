'use client';

// ─────────────────────────────────────────────────────────────────────────────
// UploadZone — drag-and-drop, gallery picker, and camera capture.
// Renders two distinct states: "empty" and "image-selected".
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState, useCallback } from 'react';
import type { CompressedImage } from '@/types';
import { compressImage } from '@/lib/imageUtils';

interface UploadZoneProps {
  currentImage: CompressedImage | null;
  onImageSelected: (image: CompressedImage) => void;
  onScanClick: () => void;
  isScanning?: boolean;
}

export default function UploadZone({
  currentImage,
  onImageSelected,
  onScanClick,
  isScanning = false,
}: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // ── file handler ────────────────────────────────────────────────────────────
  const handleFile = useCallback(
    async (file: File | null | undefined) => {
      if (!file || !file.type.startsWith('image/')) return;
      const compressed = await compressImage(file);
      onImageSelected(compressed);
    },
    [onImageSelected],
  );

  // ── drag events ─────────────────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE A: Image already selected → show preview + scan button
  // ─────────────────────────────────────────────────────────────────────────────
  if (currentImage) {
    return (
      <div
        className="max-w-xl mx-auto px-6 pb-4"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <div
          className="flex items-center gap-4 p-4 rounded-2xl"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Thumbnail */}
          <img
            src={currentImage.dataUrl}
            alt="Selected"
            className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
            style={{ border: '1px solid var(--border)' }}
          />

          {/* Meta */}
          <div className="flex-1 min-w-0">
            <div
              className="text-sm font-semibold truncate mb-0.5"
              style={{ color: 'var(--text)' }}
            >
              {currentImage.name}
            </div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>
              {currentImage.size} ·{' '}
              {currentImage.naturalWidth}×{currentImage.naturalHeight}px
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => {
                if (galleryRef.current) {
                  galleryRef.current.value = '';
                  galleryRef.current.click();
                }
              }}
              className="text-xs px-3 py-2 rounded-lg transition-colors"
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--muted)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Change
            </button>

            <button
              onClick={onScanClick}
              disabled={isScanning}
              className="text-sm font-bold px-5 py-2 rounded-lg transition-all"
              style={{
                background:
                  'linear-gradient(135deg, var(--accent), var(--accent2))',
                color: '#fff',
                border: 'none',
                cursor: isScanning ? 'not-allowed' : 'pointer',
                opacity: isScanning ? 0.6 : 1,
                fontFamily: 'inherit',
              }}
            >
              {isScanning ? 'Scanning…' : 'Scan for Items →'}
            </button>
          </div>
        </div>

        {/* Hidden inputs */}
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          style={{ position: 'absolute', left: -9999 }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE B: Empty — show full drop zone
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="max-w-xl mx-auto px-6 pb-4"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div
        className="relative rounded-2xl text-center cursor-pointer overflow-hidden transition-all"
        style={{
          border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
          background: dragOver
            ? 'rgba(108,99,255,0.06)'
            : 'var(--surface)',
          padding: '48px 32px',
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          galleryRef.current!.value = '';
          galleryRef.current!.click();
        }}
      >
        {/* Subtle radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 110%, rgba(108,99,255,0.1) 0%, transparent 70%)',
          }}
        />

        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl"
          style={{
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            boxShadow: '0 8px 32px rgba(108,99,255,0.35)',
          }}
        >
          📷
        </div>

        <div
          className="text-lg font-bold mb-2"
          style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}
        >
          Upload your photo
        </div>
        <div
          className="text-sm mb-6 leading-relaxed"
          style={{ color: 'var(--muted)' }}
        >
          Rooms, closets, shelves, garages — anything with multiple items.
          <br />
          One scan. Every item. Ready to list.
        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            className="text-sm font-bold px-6 py-3 rounded-xl transition-all"
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
            onClick={(e) => {
              e.stopPropagation();
              cameraRef.current!.value = '';
              cameraRef.current!.click();
            }}
          >
            Take Photo
          </button>
          <button
            className="text-sm font-semibold px-6 py-3 rounded-xl transition-colors"
            style={{
              background: 'var(--surface2)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
            onClick={(e) => {
              e.stopPropagation();
              galleryRef.current!.value = '';
              galleryRef.current!.click();
            }}
          >
            Choose from Library
          </button>
        </div>

        <div
          className="text-xs mt-4"
          style={{ color: 'var(--muted)' }}
        >
          Drag and drop supported on desktop
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ position: 'absolute', left: -9999 }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        style={{ position: 'absolute', left: -9999 }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
