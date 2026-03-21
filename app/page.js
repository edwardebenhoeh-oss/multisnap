"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import JSZip from "jszip";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
  :root {
    --bg: #0a0a0f;
    --surface: #12121a;
    --surface2: #1a1a26;
    --border: #2a2a3a;
    --accent: #6c63ff;
    --accent2: #a855f7;
    --accent-glow: rgba(108,99,255,0.3);
    --text: #f0f0ff;
    --muted: #6b6b8a;
    --card-bg: #111118;
    --radius: 16px;
    --radius-sm: 10px;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; min-height: 100vh; }

  /* NAV */
  .nav { display: flex; align-items: center; justify-content: space-between; padding: 18px 32px; border-bottom: 1px solid var(--border); background: rgba(10,10,15,0.8); backdrop-filter: blur(12px); position: sticky; top: 0; z-index: 100; }
  .nav-logo { font-size: 1.3rem; font-weight: 800; letter-spacing: -0.03em; color: var(--text); }
  .nav-logo span { background: linear-gradient(135deg, var(--accent), var(--accent2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .nav-badge { font-size: 0.68rem; font-weight: 600; color: var(--muted); letter-spacing: 0.05em; text-transform: uppercase; border: 1px solid var(--border); padding: 4px 12px; border-radius: 100px; }

  /* HERO */
  .hero { text-align: center; padding: 72px 24px 56px; max-width: 800px; margin: 0 auto; }
  .hero-eyebrow { display: inline-flex; align-items: center; gap: 8px; background: var(--surface2); border: 1px solid var(--border); border-radius: 100px; padding: 5px 16px; font-size: 0.72rem; font-weight: 600; color: var(--accent); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 28px; }
  .hero-dot { width: 6px; height: 6px; background: var(--accent); border-radius: 50%; animation: pulse 2s ease-in-out infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }
  .hero-title { font-size: clamp(2.2rem, 6vw, 3.8rem); font-weight: 900; line-height: 1.1; letter-spacing: -0.04em; margin-bottom: 20px; }
  .hero-title .gradient { background: linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .hero-sub { font-size: 1.05rem; color: var(--muted); line-height: 1.7; max-width: 520px; margin: 0 auto 16px; font-weight: 400; }
  .hero-stat { font-size: 0.8rem; color: var(--muted); margin-bottom: 40px; }
  .hero-stat strong { color: var(--text); }

  /* UPLOAD ZONE */
  .upload-wrap { max-width: 600px; margin: 0 auto; padding: 0 24px; }
  .drop-zone { border: 2px dashed var(--border); border-radius: var(--radius); background: var(--surface); padding: 56px 32px; text-align: center; cursor: pointer; transition: all 0.25s; position: relative; overflow: hidden; }
  .drop-zone::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 100%, rgba(108,99,255,0.08) 0%, transparent 70%); pointer-events: none; }
  .drop-zone.drag-over { border-color: var(--accent); background: rgba(108,99,255,0.06); }
  .drop-zone-icon { width: 64px; height: 64px; background: linear-gradient(135deg, var(--accent), var(--accent2)); border-radius: 18px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 1.8rem; box-shadow: 0 8px 32px var(--accent-glow); }
  .drop-zone-title { font-size: 1.3rem; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.02em; }
  .drop-zone-sub { font-size: 0.8rem; color: var(--muted); margin-bottom: 28px; line-height: 1.6; }
  .upload-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  .upload-btn-primary { background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #fff; font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 700; padding: 13px 28px; border-radius: 10px; border: none; cursor: pointer; touch-action: manipulation; transition: opacity 0.15s, transform 0.15s; letter-spacing: -0.01em; }
  .upload-btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
  .upload-btn-secondary { background: var(--surface2); color: var(--text); font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 600; padding: 13px 28px; border-radius: 10px; border: 1px solid var(--border); cursor: pointer; touch-action: manipulation; transition: border-color 0.15s; }
  .upload-btn-secondary:hover { border-color: var(--accent); }
  .upload-hint { font-size: 0.72rem; color: var(--muted); margin-top: 16px; }

  /* PREVIEW */
  .preview-strip { display: flex; align-items: center; gap: 14px; padding: 16px; background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); flex-wrap: wrap; max-width: 600px; margin: 0 auto; }
  .preview-thumb { width: 72px; height: 72px; object-fit: cover; border-radius: 10px; border: 1px solid var(--border); flex-shrink: 0; }
  .preview-meta { flex: 1; min-width: 100px; }
  .preview-name { font-size: 0.85rem; font-weight: 600; margin-bottom: 3px; word-break: break-all; }
  .preview-size { font-size: 0.7rem; color: var(--muted); }
  .preview-actions { display: flex; gap: 8px; width: 100%; }
  @media (min-width: 500px) { .preview-actions { width: auto; } }
  .btn-ghost { background: transparent; color: var(--muted); border: 1px solid var(--border); font-family: 'Inter', sans-serif; font-size: 0.78rem; font-weight: 500; padding: 9px 18px; border-radius: 8px; cursor: pointer; touch-action: manipulation; transition: all 0.15s; }
  .btn-ghost:hover { color: var(--text); border-color: var(--text); }
  .btn-primary { background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #fff; font-family: 'Inter', sans-serif; font-size: 0.85rem; font-weight: 700; padding: 10px 24px; border-radius: 8px; border: none; cursor: pointer; white-space: nowrap; flex: 1; touch-action: manipulation; }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

  /* HOW IT WORKS */
  .hiw-section { max-width: 900px; margin: 64px auto 0; padding: 0 24px 64px; }
  .hiw-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  @media (min-width: 700px) { .hiw-grid { grid-template-columns: repeat(4, 1fr); } }
  .hiw-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 20px 16px; text-align: center; }
  .hiw-num { width: 36px; height: 36px; background: linear-gradient(135deg, var(--accent), var(--accent2)); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800; color: #fff; margin: 0 auto 12px; }
  .hiw-title { font-size: 0.82rem; font-weight: 700; margin-bottom: 5px; }
  .hiw-desc { font-size: 0.68rem; color: var(--muted); line-height: 1.5; }

  /* LOADING */
  .loading-wrap { max-width: 500px; margin: 80px auto; text-align: center; padding: 0 24px; }
  .spinner-wrap { position: relative; width: 56px; height: 56px; margin: 0 auto 24px; }
  .spinner { width: 56px; height: 56px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.9s linear infinite; }
  .spinner-inner { position: absolute; inset: 6px; border: 2px solid transparent; border-top-color: var(--accent2); border-radius: 50%; animation: spin 0.6s linear infinite reverse; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-title { font-size: 1.15rem; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.02em; }
  .loading-sub { font-size: 0.78rem; color: var(--muted); margin-bottom: 24px; }
  .loading-steps { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
  .loading-step { padding: 4px 14px; border-radius: 100px; background: var(--surface2); border: 1px solid var(--border); font-size: 0.68rem; color: var(--muted); transition: all 0.3s; font-weight: 500; }
  .loading-step.active { border-color: var(--accent); color: var(--accent); background: rgba(108,99,255,0.1); }
  .loading-step.done { border-color: var(--border); color: var(--muted); }

  /* ERROR */
  .error-box { background: rgba(255,80,80,0.08); border: 1px solid rgba(255,80,80,0.3); color: #ff7070; padding: 14px 18px; border-radius: var(--radius-sm); font-size: 0.78rem; margin-top: 16px; line-height: 1.5; max-width: 600px; margin-left: auto; margin-right: auto; }

  /* CROP */
  .crop-wrap { max-width: 1200px; margin: 0 auto; padding: 32px 20px; }
  .section-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 12px; flex-wrap: wrap; }
  .section-title { font-size: 1.5rem; font-weight: 800; letter-spacing: -0.03em; }
  .section-sub { font-size: 0.75rem; color: var(--muted); margin-top: 4px; line-height: 1.5; }
  .btn-accent { background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #fff; font-family: 'Inter', sans-serif; font-size: 0.85rem; font-weight: 700; padding: 12px 24px; border-radius: 10px; border: none; cursor: pointer; white-space: nowrap; touch-action: manipulation; flex-shrink: 0; transition: opacity 0.15s, transform 0.15s; }
  .btn-accent:hover { opacity: 0.9; transform: translateY(-1px); }
  .btn-accent:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  .crop-grid { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 24px; }
  @media (min-width: 640px) { .crop-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 960px) { .crop-grid { grid-template-columns: repeat(3, 1fr); } }
  .crop-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .crop-card-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--border); }
  .crop-card-label { font-size: 0.72rem; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.08em; }
  .crop-card-num { font-size: 0.65rem; color: var(--muted); font-family: 'DM Mono', monospace; }
  .crop-editor-wrap { position: relative; background: #0a0a12; user-select: none; touch-action: none; overflow: hidden; }
  .crop-full-img { width: 100%; display: block; opacity: 0.3; pointer-events: none; -webkit-user-drag: none; }
  .crop-selection { position: absolute; border: 2px solid var(--accent); background: rgba(108,99,255,0.08); touch-action: none; will-change: left,top,width,height; }
  .crop-handle { position: absolute; width: 28px; height: 28px; background: linear-gradient(135deg, var(--accent), var(--accent2)); border-radius: 6px; touch-action: none; z-index: 10; box-shadow: 0 2px 8px var(--accent-glow); }
  @media (min-width: 600px) { .crop-handle { width: 16px; height: 16px; border-radius: 4px; } }
  .crop-handle.tl { top: -14px; left: -14px; cursor: nw-resize; }
  .crop-handle.tr { top: -14px; right: -14px; cursor: ne-resize; }
  .crop-handle.bl { bottom: -14px; left: -14px; cursor: sw-resize; }
  .crop-handle.br { bottom: -14px; right: -14px; cursor: se-resize; }
  @media (min-width: 600px) { .crop-handle.tl { top: -8px; left: -8px; } .crop-handle.tr { top: -8px; right: -8px; } .crop-handle.bl { bottom: -8px; left: -8px; } .crop-handle.br { bottom: -8px; right: -8px; } }
  .crop-preview-label { font-size: 0.6rem; color: var(--muted); padding: 8px 14px 4px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; }
  .crop-preview-img { width: 100%; max-height: 120px; object-fit: contain; background: #070710; display: block; }
  .crop-card-footer { padding: 10px 14px; display: flex; gap: 8px; }
  .skip-btn { background: transparent; color: var(--muted); border: 1px solid var(--border); font-family: 'Inter', sans-serif; font-size: 0.7rem; font-weight: 500; padding: 7px 16px; border-radius: 7px; cursor: pointer; touch-action: manipulation; transition: all 0.15s; }
  .skip-btn:hover { border-color: #ff5050; color: #ff5050; }
  .skip-btn.skipped { border-color: rgba(255,80,80,0.4); color: #ff7070; background: rgba(255,80,80,0.06); }

  /* RESULTS */
  .results-wrap { max-width: 1200px; margin: 0 auto; padding: 32px 20px; }
  .items-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
  @media (min-width: 600px) { .items-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 900px) { .items-grid { grid-template-columns: repeat(3, 1fr); } }
  .item-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; cursor: pointer; transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s; }
  .item-card:hover { border-color: rgba(108,99,255,0.4); transform: translateY(-2px); box-shadow: 0 8px 32px rgba(108,99,255,0.12); }
  .item-card.expanded { grid-column: 1 / -1; cursor: default; border-color: var(--accent); transform: none; box-shadow: 0 0 0 1px var(--accent); }
  .card-image-wrap { position: relative; background: #0a0a12; aspect-ratio: 4/3; overflow: hidden; }
  .card-image { width: 100%; height: 100%; object-fit: contain; display: block; }
  .card-label-pill { position: absolute; top: 10px; left: 10px; background: rgba(10,10,18,0.85); backdrop-filter: blur(8px); color: var(--accent); font-size: 0.58rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 10px; border-radius: 100px; border: 1px solid rgba(108,99,255,0.3); }
  .card-index { position: absolute; bottom: 10px; right: 10px; background: rgba(10,10,18,0.7); color: var(--muted); font-size: 0.6rem; padding: 2px 8px; border-radius: 6px; font-family: 'DM Mono', monospace; }
  .confidence-pill { position: absolute; top: 10px; right: 10px; font-size: 0.62rem; font-weight: 700; padding: 3px 10px; border-radius: 100px; font-family: 'Inter', sans-serif; }
  .card-body { padding: 16px; }
  .card-title { font-size: 0.92rem; font-weight: 700; margin-bottom: 8px; line-height: 1.3; letter-spacing: -0.01em; }
  .card-id-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px; }
  .id-tag { font-size: 0.6rem; color: var(--muted); border: 1px solid var(--border); padding: 3px 8px; border-radius: 6px; font-weight: 500; }
  .id-tag.primary { border-color: rgba(108,99,255,0.3); color: rgba(168,85,247,0.8); background: rgba(108,99,255,0.06); }
  .card-price { font-size: 1.5rem; font-weight: 800; color: var(--text); margin-bottom: 10px; letter-spacing: -0.03em; }
  .card-listing-preview { font-size: 0.7rem; color: var(--muted); line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .card-footer { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid var(--border); gap: 8px; flex-wrap: wrap; }
  .expand-hint { font-size: 0.62rem; color: var(--muted); font-weight: 500; }
  .card-actions { display: flex; gap: 6px; }
  .btn-sm { background: transparent; color: var(--muted); border: 1px solid var(--border); font-family: 'Inter', sans-serif; font-size: 0.65rem; font-weight: 600; padding: 6px 12px; border-radius: 7px; cursor: pointer; touch-action: manipulation; transition: all 0.15s; }
  .btn-sm:hover { color: var(--text); border-color: var(--text); }
  .btn-sm.danger { color: rgba(255,80,80,0.7); border-color: rgba(255,80,80,0.2); }
  .btn-sm.danger:hover { color: #ff5050; border-color: rgba(255,80,80,0.5); }

  /* EXPANDED */
  .expanded-inner { display: grid; grid-template-columns: 1fr; gap: 24px; padding: 20px; }
  @media (min-width: 700px) { .expanded-inner { grid-template-columns: 320px 1fr; padding: 28px; gap: 36px; } }
  .expanded-img { width: 100%; border-radius: 12px; border: 1px solid var(--border); object-fit: contain; background: #0a0a12; max-height: 280px; cursor: pointer; }

  /* MEDIA */
  .media-section { margin-top: 18px; }
  .media-label { font-size: 0.62rem; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 10px; font-weight: 600; }
  .media-gallery { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
  .media-thumb-wrap { position: relative; width: 68px; height: 68px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); flex-shrink: 0; background: #0a0a12; }
  .media-thumb { width: 100%; height: 100%; object-fit: cover; display: block; cursor: pointer; }
  .media-thumb-video { width: 100%; height: 100%; object-fit: cover; display: block; cursor: pointer; }
  .media-remove { position: absolute; top: 3px; right: 3px; width: 18px; height: 18px; background: rgba(10,10,18,0.9); color: #fff; border: none; border-radius: 50%; font-size: 9px; cursor: pointer; display: flex; align-items: center; justify-content: center; touch-action: manipulation; }
  .video-badge { position: absolute; bottom: 3px; left: 3px; background: rgba(10,10,18,0.8); color: var(--accent); font-size: 0.48rem; padding: 1px 5px; border-radius: 4px; font-weight: 700; letter-spacing: 0.05em; }
  .add-media-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .add-media-btn { display: flex; align-items: center; gap: 6px; background: var(--surface2); border: 1px dashed var(--border); color: var(--muted); font-family: 'Inter', sans-serif; font-size: 0.7rem; font-weight: 500; padding: 9px 14px; border-radius: 8px; cursor: pointer; touch-action: manipulation; transition: all 0.15s; white-space: nowrap; }
  .add-media-btn:hover { border-color: var(--accent); color: var(--accent); }

  /* ID LIST */
  .id-list { margin-top: 16px; }
  .id-list-title { font-size: 0.62rem; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px; font-weight: 600; }
  .id-row { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); }
  .id-row:last-child { border-bottom: none; }
  .id-num { font-size: 0.6rem; color: var(--muted); width: 18px; flex-shrink: 0; font-family: 'DM Mono', monospace; padding-top: 2px; }
  .id-name { flex: 1; font-size: 0.72rem; color: var(--text); line-height: 1.4; font-weight: 500; }
  .id-conf { font-size: 0.6rem; color: var(--muted); flex-shrink: 0; font-weight: 500; }
  .reasoning-box { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.64rem; color: var(--muted); line-height: 1.6; margin-top: 4px; }
  .google-verified { display: inline-flex; align-items: center; gap: 5px; font-size: 0.65rem; color: #4ade80; font-weight: 600; margin-top: 8px; }

  /* FORM */
  .form-label { font-size: 0.62rem; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 6px; margin-top: 18px; font-weight: 600; }
  .form-label:first-child { margin-top: 0; }
  .form-input { width: 100%; background: var(--surface2); border: 1px solid var(--border); color: var(--text); font-family: 'Inter', sans-serif; font-size: 0.95rem; font-weight: 700; padding: 11px 14px; border-radius: 10px; outline: none; -webkit-appearance: none; transition: border-color 0.15s; letter-spacing: -0.01em; }
  .form-input:focus { border-color: var(--accent); }
  .price-input { width: 150px; font-size: 1.4rem; color: var(--text); }
  .price-range { font-size: 0.65rem; color: var(--muted); margin-top: 5px; font-weight: 500; }
  .form-textarea { width: 100%; background: var(--surface2); border: 1px solid var(--border); color: var(--text); font-family: 'DM Mono', monospace; font-size: 0.7rem; line-height: 1.7; padding: 12px 14px; border-radius: 10px; resize: vertical; outline: none; min-height: 180px; -webkit-appearance: none; transition: border-color 0.15s; }
  .form-textarea:focus { border-color: var(--accent); }
  .action-row { display: flex; gap: 8px; margin-top: 18px; flex-wrap: wrap; }
  .btn-list { background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #fff; font-family: 'Inter', sans-serif; font-size: 0.8rem; font-weight: 700; padding: 12px 20px; border-radius: 9px; border: none; cursor: pointer; touch-action: manipulation; flex: 1; text-align: center; min-width: 100px; transition: opacity 0.15s; letter-spacing: -0.01em; }
  .btn-list:hover { opacity: 0.9; }
  .btn-download { background: var(--surface2); color: var(--text); font-family: 'Inter', sans-serif; font-size: 0.8rem; font-weight: 600; padding: 12px 20px; border-radius: 9px; border: 1px solid var(--border); cursor: pointer; touch-action: manipulation; flex: 1; text-align: center; min-width: 100px; transition: border-color 0.15s; }
  .btn-download:hover { border-color: var(--accent); }
  .btn-download:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-collapse { background: transparent; color: var(--muted); border: 1px solid var(--border); font-family: 'Inter', sans-serif; font-size: 0.78rem; font-weight: 500; padding: 12px 18px; border-radius: 9px; cursor: pointer; touch-action: manipulation; transition: all 0.15s; }
  .btn-collapse:hover { color: var(--text); border-color: var(--text); }
  .btn-danger { background: transparent; color: rgba(255,80,80,0.8); border: 1px solid rgba(255,80,80,0.2); font-family: 'Inter', sans-serif; font-size: 0.78rem; font-weight: 500; padding: 12px 18px; border-radius: 9px; cursor: pointer; touch-action: manipulation; transition: all 0.15s; }
  .btn-danger:hover { color: #ff5050; border-color: rgba(255,80,80,0.5); }
  .pkg-note { font-size: 0.62rem; color: var(--muted); margin-top: 10px; line-height: 1.6; }
  .meta-row { font-size: 0.68rem; color: var(--muted); margin-top: 5px; line-height: 1.5; }
  .meta-row span { color: rgba(168,85,247,0.8); }

  /* LIGHTBOX */
  .lightbox { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(5,5,10,0.96); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .lightbox-img { max-width: 100%; max-height: 90vh; border-radius: 12px; object-fit: contain; }
  .lightbox-video { max-width: 100%; max-height: 90vh; border-radius: 12px; }
  .lightbox-close { position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.15); font-size: 1rem; width: 44px; height: 44px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; touch-action: manipulation; transition: background 0.15s; }
  .lightbox-close:hover { background: rgba(255,255,255,0.15); }
`;

function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxSize = 1600;
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio); height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        resolve({ dataUrl, name: file.name, size: (dataUrl.length / 1024).toFixed(1) + " KB" });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function cropImageToCanvas(imgElement, box) {
  const { x, y, w, h } = box;
  const pad = 0.03;
  const sx = Math.max(0, x - w * pad), sy = Math.max(0, y - h * pad);
  const sw = Math.min(imgElement.naturalWidth - sx, w * (1 + pad * 2));
  const sh = Math.min(imgElement.naturalHeight - sy, h * (1 + pad * 2));
  const scale = 2;
  const cc = document.createElement("canvas");
  cc.width = sw * scale; cc.height = sh * scale;
  const cx = cc.getContext("2d");
  cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = "high";
  cx.drawImage(imgElement, sx, sy, sw, sh, 0, 0, sw * scale, sh * scale);
  const id = cx.getImageData(0, 0, cc.width, cc.height), d = id.data;
  let minR=255,maxR=0,minG=255,maxG=0,minB=255,maxB=0;
  for(let i=0;i<d.length;i+=4){minR=Math.min(minR,d[i]);maxR=Math.max(maxR,d[i]);minG=Math.min(minG,d[i+1]);maxG=Math.max(maxG,d[i+1]);minB=Math.min(minB,d[i+2]);maxB=Math.max(maxB,d[i+2]);}
  for(let i=0;i<d.length;i+=4){d[i]=Math.min(255,((d[i]-minR)/(maxR-minR||1))*255);d[i+1]=Math.min(255,((d[i+1]-minG)/(maxG-minG||1))*255);d[i+2]=Math.min(255,((d[i+2]-minB)/(maxB-minB||1))*255);}
  const sh2=new Uint8ClampedArray(d.length),W=cc.width,H=cc.height,str=0.4;
  for(let y2=0;y2<H;y2++)for(let x2=0;x2<W;x2++){const idx=(y2*W+x2)*4;for(let c=0;c<3;c++){let blur=0,cnt=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const ny=y2+dy,nx=x2+dx;if(ny>=0&&ny<H&&nx>=0&&nx<W){blur+=d[(ny*W+nx)*4+c];cnt++;}}blur/=cnt;sh2[idx+c]=Math.min(255,Math.max(0,d[idx+c]+str*(d[idx+c]-blur)));}sh2[idx+3]=d[idx+3];}
  cx.putImageData(new ImageData(sh2,W,H),0,0);
  const oc=document.createElement("canvas");oc.width=Math.round(sw);oc.height=Math.round(sh);
  const ox=oc.getContext("2d");ox.imageSmoothingEnabled=true;ox.imageSmoothingQuality="high";
  ox.drawImage(cc,0,0,oc.width,oc.height);
  return oc.toDataURL("image/jpeg",0.96);
}

function getHighResCrop(imgElement, box) {
  const { x, y, w, h } = box;
  const pad = 0.03;
  const sx = Math.max(0, x - w * pad), sy = Math.max(0, y - h * pad);
  const sw = Math.min(imgElement.naturalWidth - sx, w * (1 + pad * 2));
  const sh = Math.min(imgElement.naturalHeight - sy, h * (1 + pad * 2));
  const c = document.createElement("canvas");
  c.width = Math.round(sw * 3); c.height = Math.round(sh * 3);
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.drawImage(imgElement, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.99).split(",")[1];
}

function getEventPos(e) {
  if (e.touches && e.touches.length > 0) return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
  if (e.changedTouches && e.changedTouches.length > 0) return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
  return { clientX: e.clientX, clientY: e.clientY };
}

function CropEditor({ imgSrc, cropBox, onChange }) {
  const containerRef = useRef();
  const dragRef = useRef(null);
  const rafRef = useRef(null);
  const getRelPos = (cx, cy) => {
    const r = containerRef.current.getBoundingClientRect();
    return { x: (cx - r.left) / r.width, y: (cy - r.top) / r.height };
  };
  const startDrag = (e, type) => {
    e.preventDefault(); e.stopPropagation();
    const { clientX, clientY } = getEventPos(e);
    const rel = getRelPos(clientX, clientY);
    dragRef.current = { type, startRelX: rel.x, startRelY: rel.y, box: { ...cropBox } };
    window.addEventListener("mousemove", onDrag, { passive: false });
    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("touchmove", onDrag, { passive: false });
    window.addEventListener("touchend", stopDrag);
  };
  const onDrag = (e) => {
    if (!dragRef.current) return;
    e.preventDefault();
    const { clientX, clientY } = getEventPos(e);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!dragRef.current || !containerRef.current) return;
      const rel = getRelPos(clientX, clientY);
      const { type, startRelX, startRelY, box } = dragRef.current;
      const dx = rel.x - startRelX, dy = rel.y - startRelY;
      let { x, y, w, h } = box;
      const min = 0.06;
      if (type === "move") { x = Math.max(0, Math.min(1-w, x+dx)); y = Math.max(0, Math.min(1-h, y+dy)); }
      else if (type === "br") { w = Math.max(min, Math.min(1-x, w+dx)); h = Math.max(min, Math.min(1-y, h+dy)); }
      else if (type === "tl") { const nx=Math.max(0,Math.min(x+w-min,x+dx)),ny=Math.max(0,Math.min(y+h-min,y+dy)); w=w+(x-nx);h=h+(y-ny);x=nx;y=ny; }
      else if (type === "tr") { const ny=Math.max(0,Math.min(y+h-min,y+dy)); w=Math.max(min,Math.min(1-x,w+dx));h=h+(y-ny);y=ny; }
      else if (type === "bl") { const nx=Math.max(0,Math.min(x+w-min,x+dx)); w=w+(x-nx);x=nx;h=Math.max(min,Math.min(1-y,h+dy)); }
      dragRef.current.box = { x, y, w, h };
      dragRef.current.startRelX = rel.x; dragRef.current.startRelY = rel.y;
      onChange({ x, y, w, h });
    });
  };
  const stopDrag = () => {
    dragRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    window.removeEventListener("mousemove", onDrag); window.removeEventListener("mouseup", stopDrag);
    window.removeEventListener("touchmove", onDrag); window.removeEventListener("touchend", stopDrag);
  };
  const pct = v => (v * 100).toFixed(2) + "%";
  return (
    <div ref={containerRef} className="crop-editor-wrap">
      <img src={imgSrc} className="crop-full-img" alt="" draggable={false} />
      <div className="crop-selection"
        style={{ left: pct(cropBox.x), top: pct(cropBox.y), width: pct(cropBox.w), height: pct(cropBox.h) }}
        onMouseDown={e => startDrag(e, "move")} onTouchStart={e => startDrag(e, "move")}>
        <div className="crop-handle tl" onMouseDown={e => startDrag(e, "tl")} onTouchStart={e => startDrag(e, "tl")} />
        <div className="crop-handle tr" onMouseDown={e => startDrag(e, "tr")} onTouchStart={e => startDrag(e, "tr")} />
        <div className="crop-handle bl" onMouseDown={e => startDrag(e, "bl")} onTouchStart={e => startDrag(e, "bl")} />
        <div className="crop-handle br" onMouseDown={e => startDrag(e, "br")} onTouchStart={e => startDrag(e, "br")} />
      </div>
    </div>
  );
}

function dataUrlToBlob(dataUrl) {
  const [h, d] = dataUrl.split(",");
  const mime = h.match(/:(.*?);/)[1];
  const bin = atob(d), arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function confColor(score) {
  if (score >= 80) return { bg: "rgba(74,222,128,0.15)", color: "#4ade80" };
  if (score >= 60) return { bg: "rgba(251,191,36,0.15)", color: "#fbbf24" };
  return { bg: "rgba(248,113,113,0.15)", color: "#f87171" };
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
  const cameraRef = useRef();
  const galleryRef = useRef();
  const imgRef = useRef();
  const photoRefs = useRef({});
  const videoRefs = useRef({});

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImage(await compressImage(file));
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  useEffect(() => {
    if (phase !== "crop" || !imgRef.current) return;
    const img = imgRef.current;
    const nw = img.naturalWidth, nh = img.naturalHeight;
    setCropPreviews(cropBoxes.map(box => {
      const px = { x: box.x*nw, y: box.y*nh, w: box.w*nw, h: box.h*nh };
      return cropImageToCanvas(img, px);
    }));
  }, [cropBoxes, phase]);

  const detect = async () => {
    if (!image) return;
    setPhase("loading"); setLoadStep(1); setError(null);
    try {
      const base64 = image.dataUrl.split(",")[1];
      const mediaType = image.dataUrl.split(";")[0].split(":")[1];
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageBase64: base64, mediaType, mode: "detect" }) });
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
      const results = await Promise.all(activeIndexes.map(async (i) => {
        const obj = detectedObjects[i], box = cropBoxes[i];
        const px = { x: box.x*nw, y: box.y*nh, w: box.w*nw, h: box.h*nh };
        const cropDataUrl = cropImageToCanvas(img, px);
        const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageBase64: cropDataUrl.split(",")[1], mediaType: "image/jpeg", mode: "list", label: obj.label, highResBase64: getHighResCrop(img, px) }) });
        const data = await res.json();
        return { id: i, label: obj.label, cropDataUrl, extraPhotos: [], video: null, ...(data.error ? { title: obj.label, priceSuggested: 20, priceMin: 10, priceMax: 40, listing: "Unable to generate listing.", identifications: [{ name: obj.label, confidence: "medium" }], confidenceScore: 0 } : data) };
      }));
      setLoadStep(4); await new Promise(r => setTimeout(r, 300));
      setItems(results); setPhase("results");
    } catch (err) { setError(err.message); setPhase("crop"); }
    setGenerating(false);
  };

  const addPhotos = (itemId, files) => {
    Array.from(files).filter(f => f.type.startsWith("image/")).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => setItems(prev => prev.map(it => it.id === itemId ? { ...it, extraPhotos: [...(it.extraPhotos||[]), { dataUrl: e.target.result, name: file.name }] } : it));
      reader.readAsDataURL(file);
    });
  };

  const addVideo = (itemId, file) => {
    if (!file || !file.type.startsWith("video/")) return;
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, video: { url: URL.createObjectURL(file), name: file.name } } : it));
  };

  const removePhoto = (itemId, pi) => setItems(prev => prev.map(it => it.id === itemId ? { ...it, extraPhotos: it.extraPhotos.filter((_,i) => i !== pi) } : it));
  const removeVideo = itemId => setItems(prev => prev.map(it => it.id === itemId ? { ...it, video: null } : it));
  const deleteItem = id => { setItems(prev => prev.filter(it => it.id !== id)); if (expandedId === id) setExpandedId(null); };

  const downloadPackage = async (item) => {
    setDownloading(item.id);
    try {
      const zip = new JSZip();
      const folder = zip.folder(item.title.replace(/[^a-z0-9]/gi,"_").slice(0,40));
      const txt = [`TITLE: ${item.title}`,`PRICE: $${item.priceSuggested} (Range: $${item.priceMin}-$${item.priceMax})`,item.confidenceScore?`ID CONFIDENCE: ${item.confidenceScore}%`:"",item.googleVerified?"GOOGLE VERIFIED: Yes":"",item.condition?`CONDITION: ${item.condition}`:"",item.materials?`MATERIALS: ${item.materials}`:"",item.estimatedDimensions?`DIMENSIONS: ${item.estimatedDimensions}`:"",`\nIDENTIFICATIONS:`, ...(item.identifications||[]).map((id,i)=>`  ${i+1}. ${id.name} (${id.confidence})${id.reasoning?" - "+id.reasoning:""}`),`\nLISTING DESCRIPTION:\n${item.listing}`].filter(Boolean).join("\n");
      folder.file("listing.txt", txt);
      folder.file("photo_main.jpg", dataUrlToBlob(item.cropDataUrl));
      (item.extraPhotos||[]).forEach((p,i) => folder.file(`photo_${i+2}.${p.name.split(".").pop()||"jpg"}`, dataUrlToBlob(p.dataUrl)));
      if (item.video) { const vb = await fetch(item.video.url).then(r=>r.blob()); folder.file(`video.${item.video.name.split(".").pop()||"mp4"}`, vb); }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = `${item.title.replace(/[^a-z0-9]/gi,"_").slice(0,40)}.zip`; a.click();
    } catch(err) { console.error(err); }
    setDownloading(null);
  };

  const updateCropBox = (i, box) => setCropBoxes(prev => prev.map((b,idx) => idx===i ? box : b));
  const toggleSkip = i => setSkipped(prev => prev.includes(i) ? prev.filter(x=>x!==i) : [...prev,i]);
  const updateItem = (id, field, value) => setItems(prev => prev.map(it => it.id===id ? {...it,[field]:value} : it));
  const copyListing = item => {
    navigator.clipboard.writeText(`${item.title}\n\nPrice: $${item.priceSuggested}\n\n${item.listing}`)
      .then(() => { setCopied(item.id); setTimeout(()=>setCopied(null),1800); });
  };
  const reset = () => { setImage(null);setItems([]);setPhase("upload");setError(null);setExpandedId(null);setDetectedObjects([]);setCropBoxes([]);setSkipped([]); };

  const steps = ["Uploading","Detecting Objects","Ready","Generating Listings","Done!"];
  const activeCount = detectedObjects.length - skipped.length;

  return (
    <>
      <style>{STYLES}</style>
      {image && <img ref={imgRef} src={image.dataUrl} alt="" style={{ display:"none" }} />}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ position:"absolute",left:"-9999px" }} onChange={e=>handleFile(e.target.files[0])} />
      <input ref={galleryRef} type="file" accept="image/*" style={{ position:"absolute",left:"-9999px" }} onChange={e=>handleFile(e.target.files[0])} />

      {lightbox && (
        <div className="lightbox" onClick={()=>setLightbox(null)}>
          <button className="lightbox-close">✕</button>
          {lightbox.type==="image" ? <img className="lightbox-img" src={lightbox.src} alt="" onClick={e=>e.stopPropagation()} /> : <video className="lightbox-video" src={lightbox.src} controls autoPlay onClick={e=>e.stopPropagation()} />}
        </div>
      )}

      {/* NAV */}
      <nav className="nav">
        <div className="nav-logo">Multi<span>Snap</span></div>
        <div className="nav-badge">Beta</div>
      </nav>

      {/* UPLOAD PHASE */}
      {phase === "upload" && (
        <>
          <div className="hero">
            <div className="hero-eyebrow"><div className="hero-dot" />AI-Powered Multi-Object Lister</div>
            <h1 className="hero-title">Instant Listings for<br /><span className="gradient">Every Item in the Room</span></h1>
            <p className="hero-sub">Upload one photo and get AI-generated titles, descriptions, and price estimates for every resaleable item — automatically cropped and ready to list.</p>
            <p className="hero-stat">Powered by <strong>Claude AI</strong> + Google verification</p>
          </div>

          <div className="upload-wrap">
            {!image ? (
              <div className={`drop-zone${dragOver?" drag-over":""}`}
                onDragOver={e=>{e.preventDefault();setDragOver(true);}}
                onDragLeave={()=>setDragOver(false)}
                onDrop={handleDrop}>
                <div className="drop-zone-icon">📷</div>
                <div className="drop-zone-title">Upload your photo</div>
                <div className="drop-zone-sub">Take a new photo or choose from your library.<br />Rooms, closets, shelves — anything with multiple items.</div>
                <div className="upload-btns">
                  <button className="upload-btn-primary" onClick={()=>{cameraRef.current.value="";cameraRef.current.click();}}>Take Photo</button>
                  <button className="upload-btn-secondary" onClick={()=>{galleryRef.current.value="";galleryRef.current.click();}}>Choose from Library</button>
                </div>
                <div className="upload-hint">Drag and drop also supported on desktop</div>
              </div>
            ) : (
              <div className="preview-strip">
                <img className="preview-thumb" src={image.dataUrl} alt="" />
                <div className="preview-meta">
                  <div className="preview-name">{image.name}</div>
                  <div className="preview-size">{image.size}</div>
                </div>
                <div className="preview-actions">
                  <button className="btn-ghost" onClick={reset}>Change</button>
                  <button className="btn-primary" onClick={detect}>Detect Items →</button>
                </div>
              </div>
            )}
            {error && <div className="error-box">⚠ {error}</div>}
          </div>

          <div className="hiw-section">
            <div className="hiw-grid">
              {[
                { n:"01", t:"Upload Photo", d:"One image of any scene with multiple items" },
                { n:"02", t:"AI Detection", d:"Claude identifies every resaleable object" },
                { n:"03", t:"Adjust Crops", d:"Fine-tune each item's crop with drag handles" },
                { n:"04", t:"Download & List", d:"Get listing packages ready for any marketplace" },
              ].map(s => (
                <div className="hiw-card" key={s.n}>
                  <div className="hiw-num">{s.n}</div>
                  <div className="hiw-title">{s.t}</div>
                  <div className="hiw-desc">{s.d}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* LOADING */}
      {phase === "loading" && (
        <div className="loading-wrap">
          <div className="spinner-wrap">
            <div className="spinner" />
            <div className="spinner-inner" />
          </div>
          <div className="loading-title">{loadStep===3?"Generating listings...":"Analyzing image..."}</div>
          <div className="loading-sub">{loadStep===3?"Running two-pass AI identification with Google verification":"Detecting objects and preparing crops"}</div>
          <div className="loading-steps">
            {steps.map((s,i) => (
              <span key={s} className={`loading-step ${i<loadStep?"done":i===loadStep?"active":""}`}>
                {i<loadStep?"✓ ":""}{s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CROP */}
      {phase === "crop" && (
        <div className="crop-wrap">
          <div className="section-header">
            <div>
              <div className="section-title">{detectedObjects.length} Items Detected</div>
              <div className="section-sub">Drag the blue box to adjust any crop. Skip items you do not want listed.</div>
            </div>
            <button className="btn-accent" onClick={generateListings} disabled={generating||activeCount===0}>
              Generate {activeCount} Listing{activeCount!==1?"s":""}
            </button>
          </div>
          <div className="crop-grid">
            {detectedObjects.map((obj,i) => (
              <div className="crop-card" key={i} style={{ opacity:skipped.includes(i)?0.4:1 }}>
                <div className="crop-card-header">
                  <div className="crop-card-label">{obj.label}</div>
                  <div className="crop-card-num">#{i+1}</div>
                </div>
                <CropEditor imgSrc={image.dataUrl} cropBox={cropBoxes[i]||{x:obj.xFrac,y:obj.yFrac,w:obj.wFrac,h:obj.hFrac}} onChange={box=>updateCropBox(i,box)} />
                {cropPreviews[i] && (<><div className="crop-preview-label">Preview</div><img className="crop-preview-img" src={cropPreviews[i]} alt="" /></>)}
                <div className="crop-card-footer">
                  <button className={`skip-btn${skipped.includes(i)?" skipped":""}`} onClick={()=>toggleSkip(i)}>
                    {skipped.includes(i)?"✕ Skipped":"Skip Item"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {error && <div className="error-box">⚠ {error}</div>}
        </div>
      )}

      {/* RESULTS */}
      {phase === "results" && (
        <div className="results-wrap">
          <div className="section-header">
            <div>
              <div className="section-title">{items.length} Listing{items.length!==1?"s":""} Ready</div>
              <div className="section-sub">Tap any card to expand, edit, add media and download</div>
            </div>
            <button className="btn-ghost" onClick={reset}>New Image</button>
          </div>
          <div className="items-grid">
            {items.map(item => {
              const isExp = expandedId===item.id;
              const totalMedia = 1+(item.extraPhotos?.length||0)+(item.video?1:0);
              const cc = item.confidenceScore?confColor(item.confidenceScore):null;
              return (
                <div key={item.id} className={`item-card${isExp?" expanded":""}`} onClick={()=>!isExp&&setExpandedId(item.id)}>
                  {!isExp ? (
                    <>
                      <div className="card-image-wrap">
                        <img className="card-image" src={item.cropDataUrl} alt={item.label} />
                        <div className="card-label-pill">{item.label}</div>
                        {cc && <div className="confidence-pill" style={{background:cc.bg,color:cc.color}}>{item.confidenceScore}%</div>}
                        <div className="card-index">#{item.id+1} · {totalMedia} photo{totalMedia!==1?"s":""}{item.video?" + video":""}</div>
                      </div>
                      <div className="card-body">
                        <div className="card-title">{item.title}</div>
                        <div className="card-id-tags">
                          {item.identifications?.slice(0,3).map((id,i) => <span key={i} className={`id-tag${i===0?" primary":""}`}>{id.name}</span>)}
                        </div>
                        <div className="card-price">${item.priceSuggested}</div>
                        <div className="card-listing-preview">{item.listing}</div>
                      </div>
                      <div className="card-footer">
                        <span className="expand-hint">Tap to expand and edit</span>
                        <div className="card-actions">
                          <button className="btn-sm" onClick={e=>{e.stopPropagation();copyListing(item);}}>{copied===item.id?"Copied":"Copy"}</button>
                          <button className="btn-sm danger" onClick={e=>{e.stopPropagation();deleteItem(item.id);}}>Delete</button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="expanded-inner">
                      <div>
                        <img className="expanded-img" src={item.cropDataUrl} alt={item.label} onClick={()=>setLightbox({type:"image",src:item.cropDataUrl})} />
                        <div className="media-section">
                          <div className="media-label">Photos and Video ({totalMedia} total)</div>
                          <div className="media-gallery">
                            {(item.extraPhotos||[]).map((photo,pi) => (
                              <div className="media-thumb-wrap" key={pi}>
                                <img className="media-thumb" src={photo.dataUrl} alt="" onClick={()=>setLightbox({type:"image",src:photo.dataUrl})} />
                                <button className="media-remove" onClick={()=>removePhoto(item.id,pi)}>✕</button>
                              </div>
                            ))}
                            {item.video && (
                              <div className="media-thumb-wrap">
                                <video className="media-thumb-video" src={item.video.url} muted playsInline onClick={()=>setLightbox({type:"video",src:item.video.url})} />
                                <div className="video-badge">VIDEO</div>
                                <button className="media-remove" onClick={()=>removeVideo(item.id)}>✕</button>
                              </div>
                            )}
                          </div>
                          <div className="add-media-row">
                            <button className="add-media-btn" onClick={()=>photoRefs.current[item.id]?.click()}>+ Add Photos</button>
                            <input ref={el=>photoRefs.current[item.id]=el} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>addPhotos(item.id,e.target.files)} />
                            {!item.video && <button className="add-media-btn" onClick={()=>videoRefs.current[item.id]?.click()}>+ Add Video</button>}
                            <input ref={el=>videoRefs.current[item.id]=el} type="file" accept="video/*" style={{display:"none"}} onChange={e=>addVideo(item.id,e.target.files[0])} />
                          </div>
                        </div>
                        <div className="id-list">
                          <div className="id-list-title">AI Identifications {item.confidenceScore&&<span style={{color:cc?.color}}>· {item.confidenceScore}% confidence</span>}</div>
                          {item.googleVerified && <div className="google-verified">✓ Google Verified</div>}
                          {item.identifications?.map((id,i) => (
                            <div key={i}>
                              <div className="id-row">
                                <span className="id-num">{i+1}</span>
                                <span className="id-name">{id.name}</span>
                                <span className="id-conf">{id.confidence}</span>
                              </div>
                              {id.reasoning && <div className="reasoning-box">{id.reasoning}</div>}
                            </div>
                          ))}
                        </div>
                        {item.brandMarkings && item.brandMarkings!=="None visible" && <div className="meta-row"><span>{item.brandMarkings}</span></div>}
                        {item.condition && <div className="meta-row">{item.condition}</div>}
                        {item.materials && <div className="meta-row">Materials: {item.materials}</div>}
                        {item.estimatedDimensions && <div className="meta-row">Est. size: {item.estimatedDimensions}</div>}
                      </div>
                      <div>
                        <div className="form-label">Listing Title</div>
                        <input className="form-input" value={item.title} onChange={e=>updateItem(item.id,"title",e.target.value)} />
                        <div className="form-label">Suggested Price</div>
                        <input className="form-input price-input" value={item.priceSuggested} onChange={e=>updateItem(item.id,"priceSuggested",e.target.value)} />
                        <div className="price-range">Range: ${item.priceMin} to ${item.priceMax}</div>
                        <div className="form-label" style={{marginTop:18}}>Listing Description</div>
                        <textarea className="form-textarea" value={item.listing} onChange={e=>updateItem(item.id,"listing",e.target.value)} rows={8} />
                        <div className="action-row">
                          <button className="btn-list" onClick={()=>copyListing(item)}>{copied===item.id?"✓ Copied!":"Copy Listing"}</button>
                          <button className="btn-download" onClick={()=>downloadPackage(item)} disabled={downloading===item.id}>{downloading===item.id?"Zipping...":"Download Package"}</button>
                          <button className="btn-collapse" onClick={()=>setExpandedId(null)}>Collapse</button>
                          <button className="btn-danger" onClick={()=>deleteItem(item.id)}>Delete</button>
                        </div>
                        <div className="pkg-note">Package includes: main crop + all extra photos{item.video?" + video":""} + listing text</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
