// ─────────────────────────────────────────────────────────────────────────────
// MultiSnap — Image utility functions
// All canvas operations run client-side only.
// ─────────────────────────────────────────────────────────────────────────────

import type { CompressedImage, PixelBox } from '@/types';

/**
 * Compresses an image File to ≤1600px on the longest side at 85% JPEG quality.
 * Returns a data-URL, human-readable size, and the natural dimensions of the
 * compressed result (needed for accurate bbox percentage positioning).
 */
export function compressImage(file: File): Promise<CompressedImage> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxSize = 1600;
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve({
          dataUrl,
          name: file.name,
          size: (dataUrl.length / 1024).toFixed(1) + ' KB',
          naturalWidth: width,
          naturalHeight: height,
        });
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Crops an image element to a pixel bounding box, applies mild contrast
 * enhancement and sharpening, then returns a JPEG data-URL.
 * A 3% padding is added around the crop for context.
 */
export function cropImageToCanvas(imgElement: HTMLImageElement, box: PixelBox): string {
  const { x, y, w, h } = box;
  const pad = 0.03;
  const sx = Math.max(0, x - w * pad);
  const sy = Math.max(0, y - h * pad);
  const sw = Math.min(imgElement.naturalWidth - sx, w * (1 + pad * 2));
  const sh = Math.min(imgElement.naturalHeight - sy, h * (1 + pad * 2));

  const scale = 2;
  const cc = document.createElement('canvas');
  cc.width = sw * scale;
  cc.height = sh * scale;
  const cx = cc.getContext('2d')!;
  cx.imageSmoothingEnabled = true;
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(imgElement, sx, sy, sw, sh, 0, 0, sw * scale, sh * scale);

  // Auto-levels
  const id = cx.getImageData(0, 0, cc.width, cc.height);
  const d = id.data;
  let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
  for (let i = 0; i < d.length; i += 4) {
    minR = Math.min(minR, d[i]);     maxR = Math.max(maxR, d[i]);
    minG = Math.min(minG, d[i + 1]); maxG = Math.max(maxG, d[i + 1]);
    minB = Math.min(minB, d[i + 2]); maxB = Math.max(maxB, d[i + 2]);
  }
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = Math.min(255, ((d[i]     - minR) / (maxR - minR || 1)) * 255);
    d[i + 1] = Math.min(255, ((d[i + 1] - minG) / (maxG - minG || 1)) * 255);
    d[i + 2] = Math.min(255, ((d[i + 2] - minB) / (maxB - minB || 1)) * 255);
  }

  // Mild sharpening (unsharp mask)
  const sh2 = new Uint8ClampedArray(d.length);
  const W = cc.width, H = cc.height, str = 0.4;
  for (let row = 0; row < H; row++) {
    for (let col = 0; col < W; col++) {
      const idx = (row * W + col) * 4;
      for (let c = 0; c < 3; c++) {
        let blur = 0, cnt = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nr = row + dy, nc = col + dx;
            if (nr >= 0 && nr < H && nc >= 0 && nc < W) {
              blur += d[(nr * W + nc) * 4 + c];
              cnt++;
            }
          }
        }
        blur /= cnt;
        sh2[idx + c] = Math.min(255, Math.max(0, d[idx + c] + str * (d[idx + c] - blur)));
      }
      sh2[idx + 3] = d[idx + 3];
    }
  }
  cx.putImageData(new ImageData(sh2, W, H), 0, 0);

  // Downsample back to 1× for file size
  const oc = document.createElement('canvas');
  oc.width = Math.round(sw);
  oc.height = Math.round(sh);
  const ox = oc.getContext('2d')!;
  ox.imageSmoothingEnabled = true;
  ox.imageSmoothingQuality = 'high';
  ox.drawImage(cc, 0, 0, oc.width, oc.height);
  return oc.toDataURL('image/jpeg', 0.96);
}

/**
 * Returns a high-resolution (3×) base64-encoded crop for the listing API.
 * No enhancement applied — keeps original pixel fidelity for AI analysis.
 */
export function getHighResCrop(imgElement: HTMLImageElement, box: PixelBox): string {
  const { x, y, w, h } = box;
  const pad = 0.03;
  const sx = Math.max(0, x - w * pad);
  const sy = Math.max(0, y - h * pad);
  const sw = Math.min(imgElement.naturalWidth - sx, w * (1 + pad * 2));
  const sh = Math.min(imgElement.naturalHeight - sy, h * (1 + pad * 2));
  const c = document.createElement('canvas');
  c.width = Math.round(sw * 3);
  c.height = Math.round(sh * 3);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imgElement, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.99).split(',')[1];
}

/** Converts a data-URL to a Blob (for ZIP packaging). */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)![1];
  const bin = atob(data);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** Normalises mouse and touch event coordinates. */
export function getEventPos(e: MouseEvent | TouchEvent): { clientX: number; clientY: number } {
  if ('touches' in e && e.touches.length > 0) {
    return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
  }
  if ('changedTouches' in e && e.changedTouches.length > 0) {
    return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
  }
  return { clientX: (e as MouseEvent).clientX, clientY: (e as MouseEvent).clientY };
}
