"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import JSZip from "jszip";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&family=Instrument+Serif:ital@0;1&display=swap');
  :root {
    --bg: #0d0d0d; --surface: #161616; --surface2: #1e1e1e; --border: #2a2a2a;
    --accent: #e8ff5a; --text: #f0ede8; --muted: #666; --card-bg: #141414; --radius: 12px;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  body { background: var(--bg); color: var(--text); font-family: 'DM Mono', monospace; min-height: 100vh; }
  .app { max-width: 1200px; margin: 0 auto; padding: 24px 16px 80px; }
  @media (min-width: 600px) { .app { padding: 40px 24px 80px; } }
  .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 36px; padding-bottom: 20px; border-bottom: 1px solid var(--border); gap: 12px; }
  .logo { font-family: 'Syne', sans-serif; font-size: 1.6rem; font-weight: 800; letter-spacing: -0.04em; }
  @media (min-width: 600px) { .logo { font-size: 2rem; } }
  .logo span { color: var(--accent); }
  .tagline { font-size: 0.65rem; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; margin-top: 4px; }
  .badge { background: var(--accent); color: #000; font-family: 'Syne', sans-serif; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 10px; border-radius: 100px; white-space: nowrap; flex-shrink: 0; }
  .how-it-works { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 28px; }
  @media (min-width: 700px) { .how-it-works { grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 40px; } }
  .hiw-step { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; }
  .hiw-num { font-family: 'Instrument Serif', serif; font-size: 1.8rem; color: var(--accent); line-height: 1; margin-bottom: 6px; opacity: 0.7; }
  .hiw-title { font-family: 'Syne', sans-serif; font-size: 0.78rem; font-weight: 700; margin-bottom: 3px; }
  .hiw-desc { font-size: 0.63rem; color: var(--muted); line-height: 1.5; }
  .drop-zone { border: 1.5px dashed var(--border); border-radius: var(--radius); background: var(--surface); padding: 48px 24px; text-align: center; cursor: pointer; transition: border-color 0.2s, background 0.2s; }
  .drop-zone.drag-over { border-color: var(--accent); background: #1a1f00; }
  .drop-icon { font-size: 2.5rem; margin-bottom: 12px; display: block; }
  .drop-title { font-family: 'Syne', sans-serif; font-size: 1.2rem; font-weight: 700; margin-bottom: 6px; }
  .drop-sub { font-size: 0.68rem; color: var(--muted); }
  .drop-btn { display: inline-block; margin-top: 18px; background: var(--accent); color: #000; font-family: 'Syne', sans-serif; font-size: 0.8rem; font-weight: 700; padding: 12px 28px; border-radius: 8px; border: none; cursor: pointer; }
  .preview-strip { display: flex; align-items: center; gap: 12px; padding: 14px; background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); flex-wrap: wrap; }
  .preview-thumb { width: 70px; height: 70px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border); flex-shrink: 0; }
  .preview-meta { flex: 1; min-width: 100px; }
  .preview-name { font-size: 0.8rem; font-weight: 500; margin-bottom: 3px; word-break: break-all; }
  .preview-size { font-size: 0.65rem; color: var(--muted); }
  .preview-actions { display: flex; gap: 8px; width: 100%; }
  @media (min-width: 500px) { .preview-actions { width: auto; } }
  .reset-btn { background: transparent; color: var(--muted); border: 1px solid var(--border); font-family: 'DM Mono', monospace; font-size: 0.72rem; padding: 10px 16px; border-radius: 6px; cursor: pointer; touch-action: manipulation; }
  .analyze-btn { background: var(--accent); color: #000; font-family: 'Syne', sans-serif; font-size: 0.85rem; font-weight: 700; padding: 12px 24px; border-radius: 8px; border: none; cursor: pointer; white-space: nowrap; flex: 1; touch-action: manipulation; }
  .analyze-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .loading-state { text-align: center; padding: 60px 24px; }
  .spinner { width: 44px; height: 44px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 20px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-title { font-family: 'Syne', sans-serif; font-size: 1.1rem; font-weight: 700; margin-bottom: 16px; }
  .loading-steps { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
  .loading-step { display: inline-block; padding: 4px 12px; border-radius: 100px; background: var(--surface2); border: 1px solid var(--border); font-size: 0.68rem; color: var(--muted); transition: all 0.3s; }
  .loading-step.active { border-color: var(--accent); color: var(--accent); background: #1a1f00; }
  .loading-step.done { color: var(--muted); }
  .error-box { background: #1a0a0a; border: 1px solid #5a1a1a; color: #ff7070; padding: 14px 18px; border-radius: var(--radius); font-size: 0.75rem; margin-top: 16px; line-height: 1.5; }
  .crop-review-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; gap: 12px; flex-wrap: wrap; }
  .crop-review-title { font-family: 'Syne', sans-serif; font-size: 1.3rem; font-weight: 800; }
  .crop-review-sub { font-size: 0.68rem; color: var(--muted); margin-top: 4px; line-height: 1.5; }
  .confirm-all-btn { background: var(--accent); color: #000; font-family: 'Syne', sans-serif; font-size: 0.85rem; font-weight: 700; padding: 12px 24px; border-radius: 8px; border: none; cursor: pointer; white-space: nowrap; touch-action: manipulation; flex-shrink: 0; }
  .confirm-all-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .crop-grid { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 24px; }
  @media (min-width: 640px) { .crop-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 960px) { .crop-grid { grid-template-columns: repeat(3, 1fr); } }
  .crop-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .crop-card-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--border); }
  .crop-card-label { font-family: 'Syne', sans-serif; font-size: 0.78rem; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.06em; }
  .crop-card-num { font-size: 0.65rem; color: var(--muted); }
  .crop-editor-wrap { position: relative; background: #111; user-select: none; touch-action: none; }
  .crop-full-img { width: 100%; display: block; opacity: 0.35; pointer-events: none; }
  .crop-selection { position: absolute; border: 2px solid var(--accent); background: rgba(232,255,90,0.06); cursor: move; touch-action: none; }
  .crop-handle { position: absolute; width: 20px; height: 20px; background: var(--accent); border-radius: 4px; touch-action: none; z-index: 10; }
  @media (min-width: 600px) { .crop-handle { width: 14px; height: 14px; } }
  .crop-handle.tl { top: -10px; left: -10px; cursor: nw-resize; }
  .crop-handle.tr { top: -10px; right: -10px; cursor: ne-resize; }
  .crop-handle.bl { bottom: -10px; left: -10px; cursor: sw-resize; }
  .crop-handle.br { bottom: -10px; right: -10px; cursor: se-resize; }
  .crop-preview-label { font-size: 0.6rem; color: var(--muted); padding: 8px 14px 4px; letter-spacing: 0.08em; text-transform: uppercase; }
  .crop-preview-img { width: 100%; max-height: 130px; object-fit: contain; background: #0a0a0a; display: block; }
  .crop-card-footer { padding: 10px 14px; display: flex; gap: 8px; }
  .skip-btn { background: transparent; color: var(--muted); border: 1px solid var(--border); font-family: 'DM Mono', monospace; font-size: 0.68rem; padding: 8px 16px; border-radius: 6px; cursor: pointer; touch-action: manipulation; }
  .skip-btn.skipped { border-color: #5a1a1a; color: #ff7070; }
  .results-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 12px; flex-wrap: wrap; }
  .results-title { font-family: 'Syne', sans-serif; font-size: 1.3rem; font-weight: 800; }
  .results-count { font-size: 0.7rem; color: var(--muted); margin-top: 4px; }
  .items-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
  @media (min-width: 600px) { .items-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 900px) { .items-grid { grid-template-columns: repeat(3, 1fr); } }
  .item-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; cursor: pointer; transition: border-color 0.2s; }
  .item-card.expanded { grid-column: 1 / -1; cursor: default; border-color: var(--accent); }
  .card-image-wrap { position: relative; background: #111; aspect-ratio: 4/3; overflow: hidden; }
  .card-image { width: 100%; height: 100%; object-fit: contain; display: block; }
  .card-object-label { position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); color: var(--accent); font-size: 0.6rem; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; padding: 3px 10px; border-radius: 100px; border: 1px solid rgba(232,255,90,0.3); }
  .card-index { position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.6); color: var(--muted); font-size: 0.62rem; padding: 2px 8px; border-radius: 4px; }
  .confidence-badge { position: absolute; top: 10px; right: 10px; font-size: 0.6rem; font-weight: 700; padding: 3px 8px; border-radius: 100px; font-family: 'Syne', sans-serif; }
  .card-body { padding: 14px; }
  .card-title { font-family: 'Syne', sans-serif; font-size: 0.95rem; font-weight: 700; margin-bottom: 8px; line-height: 1.3; }
  .card-id-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px; }
  .id-tag { font-size: 0.6rem; color: var(--muted); border: 1px solid var(--border); padding: 3px 8px; border-radius: 4px; }
  .id-tag.primary { border-color: #444; color: #aaa; }
  .card-price { font-family: 'Instrument Serif', serif; font-size: 1.4rem; color: var(--accent); margin-bottom: 10px; }
  .card-listing-preview { font-size: 0.7rem; color: var(--muted); line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .card-footer { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px 14px; border-top: 1px solid var(--border); gap: 8px; flex-wrap: wrap; }
  .expand-hint { font-size: 0.62rem; color: var(--muted); }
  .copy-btn-small { background: transparent; color: var(--muted); border: 1px solid var(--border); font-family: 'DM Mono', monospace; font-size: 0.62rem; padding: 6px 14px; border-radius: 4px; cursor: pointer; touch-action: manipulation; }
  .delete-btn-small { background: transparent; color: #ff5050; border: 1px solid #5a1a1a; font-family: 'DM Mono', monospace; font-size: 0.62rem; padding: 6px 14px; border-radius: 4px; cursor: pointer; touch-action: manipulation; }
  .expanded-inner { display: grid; grid-template-columns: 1fr; gap: 24px; padding: 16px; }
  @media (min-width: 700px) { .expanded-inner { grid-template-columns: 320px 1fr; padding: 24px; gap: 32px; } }
  .media-section { margin-top: 16px; }
  .media-section-title { font-size: 0.6rem; color: var(--muted); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 10px; }
  .media-gallery { display: flex; gap: 8px; flex-wrap: wrap; }
  .media-thumb-wrap { position: relative; width: 72px; height: 72px; border-radius: 6px; overflow: hidden; border: 1px solid var(--border); flex-shrink: 0; background: #111; }
  .media-thumb { width: 100%; height: 100%; object-fit: cover; display: block; cursor: pointer; }
  .media-thumb-video { width: 100%; height: 100%; object-fit: cover; display: block; cursor: pointer; }
  .media-remove { position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; background: rgba(0,0,0,0.8); color: #fff; border: none; border-radius: 50%; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; touch-action: manipulation; }
  .video-badge { position: absolute; bottom: 3px; left: 3px; background: rgba(0,0,0,0.7); color: var(--accent); font-size: 0.5rem; padding: 1px 5px; border-radius: 3px; }
  .add-media-row { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
  .add-media-btn { display: flex; align-items: center; gap: 6px; background: var(--surface2); border: 1px dashed var(--border); color: var(--muted); font-family: 'DM Mono', monospace; font-size: 0.68rem; padding: 8px 14px; border-radius: 6px; cursor: pointer; touch-action: manipulation; transition: border-color 0.15s, color 0.15s; white-space: nowrap; }
  .add-media-btn:hover { border-color: var(--accent); color: var(--accent); }
  .lightbox { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.92); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .lightbox-img { max-width: 100%; max-height: 90vh; border-radius: 8px; object-fit: contain; }
  .lightbox-video { max-width: 100%; max-height: 90vh; border-radius: 8px; }
  .lightbox-close { position: absolute; top: 16px; right: 16px; background: rgba(255,255,255,0.1); color: #fff; border: none; font-size: 1.2rem; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; touch-action: manipulation; }
  .expanded-img { width: 100%; border-radius: 8px; border: 1px solid var(--border); object-fit: contain; background: #111; max-height: 280px; cursor: pointer; }
  .expanded-id-list { margin-top: 14px; }
  .id-option { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 0.7rem; }
  .id-option:last-child { border-bottom: none; }
  .id-rank { font-size: 0.6rem; color: var(--muted); width: 18px; flex-shrink: 0; padding-top: 2px; }
  .id-name { flex: 1; color: var(--text); line-height: 1.4; }
  .id-conf { font-size: 0.6rem; color: var(--muted); flex-shrink: 0; }
  .detail-label { font-size: 0.6rem; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 6px; margin-top: 18px; }
  .detail-label:first-child { margin-top: 0; }
  .edit-input { width: 100%; background: var(--surface2); border: 1px solid var(--border); color: var(--text); font-family: 'Syne', sans-serif; font-size: 0.95rem; font-weight: 700; padding: 10px 12px; border-radius: 6px; outline: none; -webkit-appearance: none; }
  .edit-price { font-family: 'Instrument Serif', serif; font-size: 1.2rem; color: var(--accent); width: 140px; }
  .listing-textarea { width: 100%; background: var(--surface2); border: 1px solid var(--border); color: var(--text); font-family: 'DM Mono', monospace; font-size: 0.7rem; line-height: 1.7; padding: 12px; border-radius: 6px; resize: vertical; outline: none; min-height: 180px; -webkit-appearance: none; }
  .action-row { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
  .copy-btn { background: var(--accent); color: #000; font-family: 'Syne', sans-serif; font-size: 0.75rem; font-weight: 700; padding: 12px 18px; border-radius: 6px; border: none; cursor: pointer; touch-action: manipulation; flex: 1; text-align: center; min-width: 120px; }
  .download-btn { background: var(--surface2); color: var(--text); font-family: 'Syne', sans-serif; font-size: 0.75rem; font-weight: 700; padding: 12px 18px; border-radius: 6px; border: 1px solid var(--border); cursor: pointer; touch-action: manipulation; flex: 1; text-align: center; min-width: 120px; transition: border-color 0.15s; }
  .download-btn:hover { border-color: var(--accent); }
  .download-btn:disabled { opacity: 0.5; }
  .close-btn { background: transparent; color: var(--muted); border: 1px solid var(--border); font-family: 'DM Mono', monospace; font-size: 0.72rem; padding: 12px 18px; border-radius: 6px; cursor: pointer; touch-action: manipulation; }
  .delete-btn { background: transparent; color: #ff5050; border: 1px solid #5a1a1a; font-family: 'DM Mono', monospace; font-size: 0.72rem; padding: 12px 18px; border-radius: 6px; cursor: pointer; touch-action: manipulation; }
  .reasoning-box { background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; padding: 10px 12px; font-size: 0.65rem; color: var(--muted); line-height: 1.6; margin-top: 6px; }
  .google-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 0.65rem; color: #4ade80; margin-top: 10px; }
`;

function cropImageToCanvas(imgElement, box) {
  const { x, y, w, h } = box;
  const pad = 0.03;
  const sx = Math.max(0, x - w * pad);
  const sy = Math.max(0, y - h * pad);
  const sw = Math.min(imgElement.naturalWidth - sx, w * (1 + pad * 2));
  const sh = Math.min(imgElement.naturalHeight - sy, h * (1 + pad * 2));
  const scale = 2;
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = sw * scale; cropCanvas.height = sh * scale;
  const cropCtx = cropCanvas.getContext("2d");
  cropCtx.imageSmoothingEnabled = true; cropCtx.imageSmoothingQuality = "high";
  cropCtx.drawImage(imgElement, sx, sy, sw, sh, 0, 0, sw * scale, sh * scale);
  const imageData = cropCtx.getImageData(0, 0, cropCanvas.width, cropCanvas.height);
  const data = imageData.data;
  let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
  for (let i = 0; i < data.length; i += 4) {
    minR = Math.min(minR, data[i]); maxR = Math.max(maxR, data[i]);
    minG = Math.min(minG, data[i+1]); maxG = Math.max(maxG, data[i+1]);
    minB = Math.min(minB, data[i+2]); maxB = Math.max(maxB, data[i+2]);
  }
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, ((data[i] - minR) / (maxR - minR || 1)) * 255);
    data[i+1] = Math.min(255, ((data[i+1] - minG) / (maxG - minG || 1)) * 255);
    data[i+2] = Math.min(255, ((data[i+2] - minB) / (maxB - minB || 1)) * 255);
  }
  const sharpened = new Uint8ClampedArray(data.length);
  const W = cropCanvas.width, H = cropCanvas.height, strength = 0.4;
  for (let y2 = 0; y2 < H; y2++) {
    for (let x2 = 0; x2 < W; x2++) {
      const idx = (y2 * W + x2) * 4;
      for (let c = 0; c < 3; c++) {
        let blur = 0, count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y2 + dy, nx = x2 + dx;
            if (ny >= 0 && ny < H && nx >= 0 && nx < W) { blur += data[(ny * W + nx) * 4 + c]; count++; }
          }
        }
        blur /= count;
        sharpened[idx + c] = Math.min(255, Math.max(0, data[idx + c] + strength * (data[idx + c] - blur)));
      }
      sharpened[idx + 3] = data[idx + 3];
    }
  }
  cropCtx.putImageData(new ImageData(sharpened, W, H), 0, 0);
  const outCanvas = document.createElement("canvas");
  outCanvas.width = Math.round(sw); outCanvas.height = Math.round(sh);
  const outCtx = outCanvas.getContext("2d");
  outCtx.imageSmoothingEnabled = true; outCtx.imageSmoothingQuality = "high";
  outCtx.drawImage(cropCanvas, 0, 0, outCanvas.width, outCanvas.height);
  return outCanvas.toDataURL("image/jpeg", 0.96);
}

function getHighResCrop(imgElement, box) {
  const { x, y, w, h } = box;
  const pad = 0.03;
  const sx = Math.max(0, x - w * pad);
  const sy = Math.max(0, y - h * pad);
  const sw = Math.min(imgElement.naturalWidth - sx, w * (1 + pad * 2));
  const sh = Math.min(imgElement.naturalHeight - sy, h * (1 + pad * 2));
  const scale = 3;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * scale); canvas.height = Math.round(sh * scale);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.drawImage(imgElement, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.99).split(",")[1];
}

function getEventPos(e) {
  if (e.touches && e.touches.length > 0) return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
  return { clientX: e.clientX, clientY: e.clientY };
}

function CropEditor({ imgSrc, cropBox, onChange }) {
  const containerRef = useRef();
  const dragRef = useRef(null);
  const startDrag = (e, type) => {
    e.preventDefault(); e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    const { clientX, clientY } = getEventPos(e);
    dragRef.current = { type, startX: clientX, startY: clientY, rect, box: { ...cropBox } };
    window.addEventListener("mousemove", onDrag, { passive: false });
    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("touchmove", onDrag, { passive: false });
    window.addEventListener("touchend", stopDrag);
  };
  const onDrag = (e) => {
    if (!dragRef.current) return;
    e.preventDefault();
    const { type, startX, startY, rect, box } = dragRef.current;
    const { clientX, clientY } = getEventPos(e);
    const dx = (clientX - startX) / rect.width;
    const dy = (clientY - startY) / rect.height;
    let { x, y, w, h } = box;
    const min = 0.06;
    if (type === "move") { x = Math.max(0, Math.min(1 - w, x + dx)); y = Math.max(0, Math.min(1 - h, y + dy)); }
    else if (type === "br") { w = Math.max(min, Math.min(1 - x, w + dx)); h = Math.max(min, Math.min(1 - y, h + dy)); }
    else if (type === "tl") { const nx = Math.max(0, Math.min(x + w - min, x + dx)); const ny = Math.max(0, Math.min(y + h - min, y + dy)); w = w + (x - nx); h = h + (y - ny); x = nx; y = ny; }
    else if (type === "tr") { const ny = Math.max(0, Math.min(y + h - min, y + dy)); w = Math.max(min, Math.min(1 - x, w + dx)); h = h + (y - ny); y = ny; }
    else if (type === "bl") { const nx = Math.max(0, Math.min(x + w - min, x + dx)); w = w + (x - nx); x = nx; h = Math.max(min, Math.min(1 - y, h + dy)); }
    onChange({ x, y, w, h });
  };
  const stopDrag = () => {
    dragRef.current = null;
    window.removeEventListener("mousemove", onDrag); window.removeEventListener("mouseup", stopDrag);
    window.removeEventListener("touchmove", onDrag); window.removeEventListener("touchend", stopDrag);
  };
  const pct = (v) => (v * 100).toFixed(2) + "%";
  return (
    <div ref={containerRef} className="crop-editor-wrap">
      <img src={imgSrc} className="crop-full-img" alt="" draggable={false} />
      <div className="crop-selection"
        style={{ left: pct(cropBox.x), top: pct(cropBox.y), width: pct(cropBox.w), height: pct(cropBox.h) }}
        onMouseDown={(e) => startDrag(e, "move")} onTouchStart={(e) => startDrag(e, "move")}>
        <div className="crop-handle tl" onMouseDown={(e) => startDrag(e, "tl")} onTouchStart={(e) => startDrag(e, "tl")} />
        <div className="crop-handle tr" onMouseDown={(e) => startDrag(e, "tr")} onTouchStart={(e) => startDrag(e, "tr")} />
        <div className="crop-handle bl" onMouseDown={(e) => startDrag(e, "bl")} onTouchStart={(e) => startDrag(e, "bl")} />
        <div className="crop-handle br" onMouseDown={(e) => startDrag(e, "br")} onTouchStart={(e) => startDrag(e, "br")} />
      </div>
    </div>
  );
}

function dataUrlToBlob(dataUrl) {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(data);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function confidenceColor(score) {
  if (score >= 80) return { bg: "rgba(232,255,90,0.15)", color: "#e8ff5a" };
  if (score >= 60) return { bg: "rgba(255,170,68,0.15)", color: "#ffaa44" };
  return { bg: "rgba(255,80,80,0.15)", color: "#ff5050" };
}

export default function MultiSnapLister() {
  const [image, setImage] = useState(null);
  const [phase, setPhase] = useState("upload");
  const [loadStep, setLoadStep] = useState(0);
  const [detectedObjects, setDetectedObjects] = useState([]);
  const [cropBoxes, setCropBoxes] = useState([]);
  const [skipped, setSkipped] = useState([]);
  const [cropPreviews, setCropPreviews] = useState([]);
  const [items, setItems] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const fileRef = useRef();
  const imgRef = useRef();
  const photoRefs = useRef({});
  const videoRefs = useRef({});

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setImage({ dataUrl: e.target.result, name: file.name, size: (file.size / 1024).toFixed(1) + " KB" });
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  useEffect(() => {
    if (phase !== "crop" || !imgRef.current) return;
    const img = imgRef.current;
    const nw = img.naturalWidth, nh = img.naturalHeight;
    const previews = cropBoxes.map(box => {
      const px = { x: box.x * nw, y: box.y * nh, w: box.w * nw, h: box.h * nh };
      return cropImageToCanvas(img, px);
    });
    setCropPreviews(previews);
  }, [cropBoxes, phase]);

  const detect = async () => {
    if (!image) return;
    setPhase("loading"); setLoadStep(1); setError(null);
    try {
      const base64 = image.dataUrl.split(",")[1];
      const mediaType = image.dataUrl.split(";")[0].split(":")[1];
      const res = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType, mode: "detect" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDetectedObjects(data.objects);
      setCropBoxes(data.objects.map(o => ({ x: o.xFrac, y: o.yFrac, w: o.wFrac, h: o.hFrac })));
      setSkipped([]); setLoadStep(2); setPhase("crop");
    } catch (err) { setError(err.message); setPhase("upload"); }
  };

  const generateListings = async () => {
    setGenerating(true); setPhase("loading"); setLoadStep(3);
    const img = imgRef.current;
    const nw = img.naturalWidth, nh = img.naturalHeight;
    try {
      const activeIndexes = detectedObjects.map((_, i) => i).filter(i => !skipped.includes(i));
      const promises = activeIndexes.map(async (i) => {
        const obj = detectedObjects[i];
        const box = cropBoxes[i];
        const px = { x: box.x * nw, y: box.y * nh, w: box.w * nw, h: box.h * nh };
        const cropDataUrl = cropImageToCanvas(img, px);
        const cropBase64 = cropDataUrl.split(",")[1];
        const highResBase64 = getHighResCrop(img, px);
        const res = await fetch("/api/analyze", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: cropBase64, mediaType: "image/jpeg", mode: "list", label: obj.label, highResBase64 }),
        });
        const data = await res.json();
        return {
          id: i, label: obj.label, cropDataUrl, extraPhotos: [], video: null,
          ...(data.error ? { title: obj.label, priceSuggested: 20, priceMin: 10, priceMax: 40, listing: "Unable to generate listing.", identifications: [{ name: obj.label, confidence: "medium" }], confidenceScore: 0 } : data)
        };
      });
      const results = await Promise.all(promises);
      setLoadStep(4); await new Promise(r => setTimeout(r, 300));
      setItems(results); setPhase("results");
    } catch (err) { setError(err.message); setPhase("crop"); }
    setGenerating(false);
  };

  const addPhotos = (itemId, files) => {
    Array.from(files).filter(f => f.type.startsWith("image/")).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => setItems(prev => prev.map(it => it.id === itemId
        ? { ...it, extraPhotos: [...(it.extraPhotos || []), { dataUrl: e.target.result, name: file.name }] } : it));
      reader.readAsDataURL(file);
    });
  };

  const addVideo = (itemId, file) => {
    if (!file || !file.type.startsWith("video/")) return;
    const url = URL.createObjectURL(file);
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, video: { url, name: file.name } } : it));
  };

  const removePhoto = (itemId, pi) => setItems(prev => prev.map(it => it.id === itemId ? { ...it, extraPhotos: it.extraPhotos.filter((_, i) => i !== pi) } : it));
  const removeVideo = (itemId) => setItems(prev => prev.map(it => it.id === itemId ? { ...it, video: null } : it));

  const deleteItem = (id) => {
    setItems(prev => prev.filter(it => it.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const downloadPackage = async (item) => {
    setDownloading(item.id);
    try {
      const zip = new JSZip();
      const folder = zip.folder(item.title.replace(/[^a-z0-9]/gi, "_").slice(0, 40));
      const listingText = [
        `TITLE: ${item.title}`,
        `PRICE: $${item.priceSuggested} (Range: $${item.priceMin}-$${item.priceMax})`,
        item.confidenceScore ? `ID CONFIDENCE: ${item.confidenceScore}%` : "",
        item.googleVerified ? `GOOGLE VERIFIED: Yes` : "",
        item.condition ? `CONDITION: ${item.condition}` : "",
        item.materials ? `MATERIALS: ${item.materials}` : "",
        item.estimatedDimensions ? `DIMENSIONS: ${item.estimatedDimensions}` : "",
        item.brandMarkings && item.brandMarkings !== "None visible" ? `BRAND/MARKINGS: ${item.brandMarkings}` : "",
        `\nIDENTIFICATIONS:`,
        ...(item.identifications || []).map((id, i) => `  ${i+1}. ${id.name} (${id.confidence})${id.reasoning ? " - " + id.reasoning : ""}`),
        `\nLISTING DESCRIPTION:\n${item.listing}`,
      ].filter(Boolean).join("\n");
      folder.file("listing.txt", listingText);
      folder.file("photo_main.jpg", dataUrlToBlob(item.cropDataUrl));
      (item.extraPhotos || []).forEach((photo, i) => {
        folder.file(`photo_${i+2}.${photo.name.split(".").pop() || "jpg"}`, dataUrlToBlob(photo.dataUrl));
      });
      if (item.video) {
        const vBlob = await fetch(item.video.url).then(r => r.blob());
        folder.file(`video.${item.video.name.split(".").pop() || "mp4"}`, vBlob);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${item.title.replace(/[^a-z0-9]/gi, "_").slice(0, 40)}.zip`;
      a.click();
    } catch (err) { console.error(err); }
    setDownloading(null);
  };

  const updateCropBox = (i, box) => setCropBoxes(prev => prev.map((b, idx) => idx === i ? box : b));
  const toggleSkip = (i) => setSkipped(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  const updateItem = (id, field, value) => setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it));
  const copyListing = (item) => {
    const text = `${item.title}\n\nPrice: $${item.priceSuggested}\n\n${item.listing}`;
    navigator.clipboard.writeText(text).then(() => { setCopied(item.id); setTimeout(() => setCopied(null), 1800); });
  };
  const reset = () => { setImage(null); setItems([]); setPhase("upload"); setError(null); setExpandedId(null); setDetectedObjects([]); setCropBoxes([]); setSkipped([]); };

  const steps = ["Uploading", "Detecting Objects", "Ready", "Generating Listings", "Done!"];
  const activeCount = detectedObjects.length - skipped.length;

  return (
    <>
      <style>{STYLES}</style>
      {image && <img ref={imgRef} src={image.dataUrl} alt="" style={{ display: "none" }} />}
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="lightbox-close">✕</button>
          {lightbox.type === "image"
            ? <img className="lightbox-img" src={lightbox.src} alt="" onClick={e => e.stopPropagation()} />
            : <video className="lightbox-video" src={lightbox.src} controls autoPlay onClick={e => e.stopPropagation()} />}
        </div>
      )}
      <div className="app">
        <header className="header">
          <div>
            <div className="logo">Multi<span>Snap</span></div>
            <div className="tagline">AI Multi-Object Resale Lister</div>
          </div>
          <div className="badge">Powered by Claude</div>
        </header>

        {phase === "upload" && (
          <>
            <div className="how-it-works">
              {[
                { n: "01", t: "Upload Image", d: "Photo of a room, closet, or table with multiple items" },
                { n: "02", t: "AI Detects", d: "Claude identifies every object in the scene" },
                { n: "03", t: "Adjust Crops", d: "Drag handles to fine-tune each crop" },
                { n: "04", t: "Add Media & List", d: "Add extra photos or video then download your package" },
              ].map(s => (
                <div className="hiw-step" key={s.n}>
                  <div className="hiw-num">{s.n}</div>
                  <div className="hiw-title">{s.t}</div>
                  <div className="hiw-desc">{s.d}</div>
                </div>
              ))}
            </div>
            {!image ? (
              <div className={`drop-zone${dragOver ? " drag-over" : ""}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current.click()}>
                <span className="drop-icon">📷</span>
                <div className="drop-title">Upload your image</div>
                <div className="drop-sub">Tap to browse or drag and drop on desktop</div>
                <div className="drop-btn">Browse Image</div>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
              </div>
            ) : (
              <div className="preview-strip">
                <img className="preview-thumb" src={image.dataUrl} alt="" />
                <div className="preview-meta">
                  <div className="preview-name">{image.name}</div>
                  <div className="preview-size">{image.size}</div>
                </div>
                <div className="preview-actions">
                  <button className="reset-btn" onClick={reset}>Change</button>
                  <button className="analyze-btn" onClick={detect}>Detect Items →</button>
                </div>
              </div>
            )}
            {error && <div className="error-box">⚠ {error}</div>}
          </>
        )}

        {phase === "loading" && (
          <div className="loading-state">
            <div className="spinner" />
            <div className="loading-title">{loadStep === 3 ? "Running two-pass identification with Google verification..." : "Detecting objects..."}</div>
            <div className="loading-steps">
              {steps.map((s, i) => (
                <span key={s} className={`loading-step ${i < loadStep ? "done" : i === loadStep ? "active" : ""}`}>
                  {i < loadStep ? "✓ " : ""}{s}
                </span>
              ))}
            </div>
          </div>
        )}

        {phase === "crop" && (
          <>
            <div className="crop-review-header">
              <div>
                <div className="crop-review-title">{detectedObjects.length} Items Detected</div>
                <div className="crop-review-sub">Drag the yellow box to adjust crops. Skip items you don't want listed.</div>
              </div>
              <button className="confirm-all-btn" onClick={generateListings} disabled={generating || activeCount === 0}>
                Generate {activeCount} Listing{activeCount !== 1 ? "s" : ""} →
              </button>
            </div>
            <div className="crop-grid">
              {detectedObjects.map((obj, i) => (
                <div className="crop-card" key={i} style={{ opacity: skipped.includes(i) ? 0.4 : 1 }}>
                  <div className="crop-card-header">
                    <div className="crop-card-label">{obj.label}</div>
                    <div className="crop-card-num">#{i + 1}</div>
                  </div>
                  <CropEditor
                    imgSrc={image.dataUrl}
                    cropBox={cropBoxes[i] || { x: obj.xFrac, y: obj.yFrac, w: obj.wFrac, h: obj.hFrac }}
                    onChange={(box) => updateCropBox(i, box)}
                  />
                  {cropPreviews[i] && (
                    <>
                      <div className="crop-preview-label">Crop Preview</div>
                      <img className="crop-preview-img" src={cropPreviews[i]} alt="preview" />
                    </>
                  )}
                  <div className="crop-card-footer">
                    <button className={`skip-btn${skipped.includes(i) ? " skipped" : ""}`} onClick={() => toggleSkip(i)}>
                      {skipped.includes(i) ? "✕ Skipped" : "Skip Item"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {error && <div className="error-box">⚠ {error}</div>}
          </>
        )}

        {phase === "results" && (
          <>
            <div className="results-header">
              <div>
                <div className="results-title">{items.length} Listing{items.length !== 1 ? "s" : ""} Ready</div>
                <div className="results-count">Tap any card to expand, add media and download</div>
              </div>
              <button className="reset-btn" onClick={reset}>↩ New Image</button>
            </div>
            <div className="items-grid">
              {items.map((item) => {
                const isExp = expandedId === item.id;
                const totalMedia = 1 + (item.extraPhotos?.length || 0) + (item.video ? 1 : 0);
                const confColor = item.confidenceScore ? confidenceColor(item.confidenceScore) : null;
                return (
                  <div key={item.id} className={`item-card${isExp ? " expanded" : ""}`} onClick={() => !isExp && setExpandedId(item.id)}>
                    {!isExp ? (
                      <>
                        <div className="card-image-wrap">
                          <img className="card-image" src={item.cropDataUrl} alt={item.label} />
                          <div className="card-object-label">{item.label}</div>
                          {confColor && (
                            <div className="confidence-badge" style={{ background: confColor.bg, color: confColor.color }}>
                              {item.confidenceScore}%
                            </div>
                          )}
                          <div className="card-index">#{item.id + 1} · {totalMedia} photo{totalMedia !== 1 ? "s" : ""}{item.video ? " + video" : ""}</div>
                        </div>
                        <div className="card-body">
                          <div className="card-title">{item.title}</div>
                          <div className="card-id-tags">
                            {item.identifications?.slice(0, 3).map((id, i) => (
                              <span key={i} className={`id-tag${i === 0 ? " primary" : ""}`}>{id.name}</span>
                            ))}
                          </div>
                          <div className="card-price">${item.priceSuggested}</div>
                          <div className="card-listing-preview">{item.listing}</div>
                        </div>
                        <div className="card-footer">
                          <span className="expand-hint">Tap to expand and edit</span>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button className="copy-btn-small" onClick={e => { e.stopPropagation(); copyListing(item); }}>
                              {copied === item.id ? "✓ Copied" : "Copy"}
                            </button>
                            <button className="delete-btn-small" onClick={e => { e.stopPropagation(); deleteItem(item.id); }}>
                              Delete
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="expanded-inner">
                        <div>
                          <img className="expanded-img" src={item.cropDataUrl} alt={item.label}
                            onClick={() => setLightbox({ type: "image", src: item.cropDataUrl })} />
                          <div className="media-section">
                            <div className="media-section-title">Photos and Video ({totalMedia} total)</div>
                            <div className="media-gallery">
                              {(item.extraPhotos || []).map((photo, pi) => (
                                <div className="media-thumb-wrap" key={pi}>
                                  <img className="media-thumb" src={photo.dataUrl} alt=""
                                    onClick={() => setLightbox({ type: "image", src: photo.dataUrl })} />
                                  <button className="media-remove" onClick={() => removePhoto(item.id, pi)}>✕</button>
                                </div>
                              ))}
                              {item.video && (
                                <div className="media-thumb-wrap">
                                  <video className="media-thumb-video" src={item.video.url} muted playsInline
                                    onClick={() => setLightbox({ type: "video", src: item.video.url })} />
                                  <div className="video-badge">▶ VIDEO</div>
                                  <button className="media-remove" onClick={() => removeVideo(item.id)}>✕</button>
                                </div>
                              )}
                            </div>
                            <div className="add-media-row">
                              <button className="add-media-btn" onClick={() => photoRefs.current[item.id]?.click()}>📷 Add Photos</button>
                              <input ref={el => photoRefs.current[item.id] = el} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => addPhotos(item.id, e.target.files)} />
                              {!item.video && <button className="add-media-btn" onClick={() => videoRefs.current[item.id]?.click()}>🎥 Add Video</button>}
                              <input ref={el => videoRefs.current[item.id] = el} type="file" accept="video/*" style={{ display: "none" }} onChange={e => addVideo(item.id, e.target.files[0])} />
                            </div>
                          </div>
                          <div className="expanded-id-list">
                            <div className="detail-label" style={{ marginTop: 16 }}>
                              AI Identifications {item.confidenceScore && <span style={{ color: confColor?.color }}>· {item.confidenceScore}% confidence</span>}
                            </div>
                            {item.googleVerified && <div className="google-badge">🔍 Google Verified</div>}
                            {item.identifications?.map((id, i) => (
                              <div key={i}>
                                <div className="id-option">
                                  <span className="id-rank">{i + 1}</span>
                                  <span className="id-name">{id.name}</span>
                                  <span className="id-conf">{id.confidence}</span>
                                </div>
                                {id.reasoning && <div className="reasoning-box">{id.reasoning}</div>}
                              </div>
                            ))}
                          </div>
                          {item.brandMarkings && item.brandMarkings !== "None visible" && (
                            <div style={{ marginTop: 10, fontSize: "0.65rem", color: "var(--accent)" }}>🏷 {item.brandMarkings}</div>
                          )}
                          {item.condition && <div style={{ marginTop: 8, fontSize: "0.7rem", color: "var(--muted)", lineHeight: 1.5 }}>{item.condition}</div>}
                          {item.materials && <div style={{ marginTop: 4, fontSize: "0.65rem", color: "var(--muted)" }}>Materials: {item.materials}</div>}
                          {item.estimatedDimensions && <div style={{ marginTop: 4, fontSize: "0.65rem", color: "var(--muted)" }}>Est. size: {item.estimatedDimensions}</div>}
                        </div>
                        <div>
                          <div className="detail-label">Listing Title</div>
                          <input className="edit-input" value={item.title} onChange={e => updateItem(item.id, "title", e.target.value)} />
                          <div className="detail-label">Suggested Price</div>
                          <input className="edit-input edit-price" value={item.priceSuggested} onChange={e => updateItem(item.id, "priceSuggested", e.target.value)} />
                          <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: 4 }}>Range: ${item.priceMin} – ${item.priceMax}</div>
                          <div className="detail-label" style={{ marginTop: 16 }}>Listing Description</div>
                          <textarea className="listing-textarea" value={item.listing} onChange={e => updateItem(item.id, "listing", e.target.value)} rows={8} />
                          <div className="action-row">
                            <button className="copy-btn" onClick={() => copyListing(item)}>{copied === item.id ? "✓ Copied!" : "Copy Listing"}</button>
                            <button className="download-btn" onClick={() => downloadPackage(item)} disabled={downloading === item.id}>
                              {downloading === item.id ? "Zipping..." : "⬇ Download Package"}
                            </button>
                            <button className="close-btn" onClick={() => setExpandedId(null)}>Collapse</button>
                            <button className="delete-btn" onClick={() => deleteItem(item.id)}>Delete Item</button>
                          </div>
                          <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: 10, lineHeight: 1.6 }}>
                            Package includes: main crop + all extra photos{item.video ? " + video" : ""} + listing text
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}