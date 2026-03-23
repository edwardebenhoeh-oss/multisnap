"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import JSZip from "jszip";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
  :root {
    --bg: #08080f;
    --surface: #10101a;
    --surface2: #18182a;
    --surface3: #20203a;
    --border: #2a2a45;
    --border2: #35355a;
    --accent: #7c6fff;
    --accent2: #b06aff;
    --accent3: #ff6ab0;
    --glow: rgba(124,111,255,0.25);
    --glow2: rgba(176,106,255,0.15);
    --text: #f0f0ff;
    --text2: #a0a0c0;
    --muted: #5a5a80;
    --success: #4ade80;
    --warning: #fbbf24;
    --danger: #f87171;
    --card: #0e0e1c;
    --radius: 20px;
    --radius-sm: 12px;
    --radius-xs: 8px;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  html { scroll-behavior: smooth; }
  body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; min-height: 100vh; overflow-x: hidden; }

  /* SCROLLBAR */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 4px; }

  /* NAV */
  .nav { display: flex; align-items: center; justify-content: space-between; padding: 16px 28px; border-bottom: 1px solid var(--border); background: rgba(8,8,15,0.85); backdrop-filter: blur(20px); position: sticky; top: 0; z-index: 200; }
  .nav-logo { font-size: 1.25rem; font-weight: 900; letter-spacing: -0.04em; }
  .nav-logo .g { background: linear-gradient(135deg, var(--accent), var(--accent2), var(--accent3)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .nav-right { display: flex; align-items: center; gap: 12px; }
  .nav-tab { background: transparent; border: none; color: var(--text2); font-family: 'Inter', sans-serif; font-size: 0.78rem; font-weight: 600; padding: 7px 14px; border-radius: 100px; cursor: pointer; transition: all 0.2s; }
  .nav-tab:hover { color: var(--text); background: var(--surface2); }
  .nav-tab.active { color: var(--accent); background: rgba(124,111,255,0.12); }
  .nav-beta { font-size: 0.6rem; font-weight: 700; color: var(--accent); background: rgba(124,111,255,0.15); border: 1px solid rgba(124,111,255,0.3); padding: 3px 9px; border-radius: 100px; letter-spacing: 0.08em; }

  /* HERO */
  .hero { text-align: center; padding: 80px 24px 60px; position: relative; overflow: hidden; }
  .hero::before { content: ''; position: absolute; top: -100px; left: 50%; transform: translateX(-50%); width: 600px; height: 600px; background: radial-gradient(ellipse, rgba(124,111,255,0.12) 0%, transparent 70%); pointer-events: none; }
  .hero-pill { display: inline-flex; align-items: center; gap: 8px; background: var(--surface2); border: 1px solid var(--border2); border-radius: 100px; padding: 6px 16px; font-size: 0.72rem; font-weight: 600; color: var(--text2); margin-bottom: 32px; }
  .hero-pill-dot { width: 7px; height: 7px; background: var(--success); border-radius: 50%; animation: blink 2s ease infinite; }
  @keyframes blink { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
  .hero-h1 { font-size: clamp(2.4rem, 7vw, 4.5rem); font-weight: 900; line-height: 1.05; letter-spacing: -0.05em; margin-bottom: 20px; }
  .hero-h1 .grad { background: linear-gradient(135deg, var(--accent) 0%, var(--accent2) 50%, var(--accent3) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .hero-sub { font-size: 1.05rem; color: var(--text2); line-height: 1.7; max-width: 480px; margin: 0 auto 40px; font-weight: 400; }
  .hero-stats { display: flex; align-items: center; justify-content: center; gap: 32px; flex-wrap: wrap; }
  .hero-stat { text-align: center; }
  .hero-stat-num { font-size: 1.5rem; font-weight: 900; letter-spacing: -0.03em; background: linear-gradient(135deg, var(--accent), var(--accent2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .hero-stat-label { font-size: 0.68rem; color: var(--muted); font-weight: 500; margin-top: 2px; letter-spacing: 0.05em; text-transform: uppercase; }

  /* SCAN ZONE */
  .scan-wrap { max-width: 680px; margin: 0 auto; padding: 0 20px 80px; }
  .scan-zone { border: 2px dashed var(--border2); border-radius: var(--radius); background: var(--surface); padding: 64px 32px; text-align: center; cursor: pointer; transition: all 0.3s; position: relative; overflow: hidden; }
  .scan-zone::after { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 120%, rgba(124,111,255,0.08) 0%, transparent 60%); pointer-events: none; }
  .scan-zone.drag { border-color: var(--accent); background: rgba(124,111,255,0.06); }
  .scan-icon-wrap { width: 80px; height: 80px; background: linear-gradient(135deg, var(--accent), var(--accent2)); border-radius: 22px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 2rem; box-shadow: 0 12px 40px var(--glow); }
  .scan-title { font-size: 1.4rem; font-weight: 800; margin-bottom: 10px; letter-spacing: -0.03em; }
  .scan-sub { font-size: 0.82rem; color: var(--text2); line-height: 1.6; margin-bottom: 28px; }
  .scan-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  .btn-grad { background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #fff; font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 700; padding: 14px 32px; border-radius: var(--radius-sm); border: none; cursor: pointer; touch-action: manipulation; transition: all 0.2s; letter-spacing: -0.01em; box-shadow: 0 4px 20px var(--glow); }
  .btn-grad:hover { transform: translateY(-2px); box-shadow: 0 8px 32px var(--glow); }
  .btn-outline { background: transparent; color: var(--text); font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 600; padding: 14px 28px; border-radius: var(--radius-sm); border: 1.5px solid var(--border2); cursor: pointer; touch-action: manipulation; transition: all 0.2s; }
  .btn-outline:hover { border-color: var(--accent); color: var(--accent); }
  .scan-hint { font-size: 0.7rem; color: var(--muted); margin-top: 18px; }

  /* PREVIEW + DETECTION */
  .detect-wrap { max-width: 680px; margin: 0 auto; padding: 0 20px 80px; }
  .img-detect-container { position: relative; border-radius: var(--radius); overflow: hidden; background: #000; border: 1px solid var(--border); margin-bottom: 20px; }
  .detect-img { width: 100%; display: block; }
  .bbox { position: absolute; border: 2px solid; border-radius: 8px; cursor: pointer; transition: all 0.2s; animation: bboxIn 0.4s ease forwards; opacity: 0; }
  @keyframes bboxIn { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
  .bbox:hover { filter: brightness(1.2); }
  .bbox-label { position: absolute; top: -28px; left: 0; font-size: 0.6rem; font-weight: 700; padding: 3px 10px; border-radius: 100px; white-space: nowrap; letter-spacing: 0.06em; text-transform: uppercase; }
  .bbox-num { position: absolute; top: -10px; right: -10px; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 800; color: #fff; }
  .detect-actions { display: flex; gap: 10px; flex-wrap: wrap; }
  .btn-sm-ghost { background: transparent; color: var(--text2); border: 1px solid var(--border2); font-family: 'Inter', sans-serif; font-size: 0.75rem; font-weight: 600; padding: 8px 16px; border-radius: var(--radius-xs); cursor: pointer; touch-action: manipulation; transition: all 0.2s; }
  .btn-sm-ghost:hover { color: var(--text); border-color: var(--accent); }

  /* BOTTOM SHEET */
  .sheet-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 300; backdrop-filter: blur(4px); animation: fadeIn 0.2s ease; }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  .bottom-sheet { position: fixed; bottom: 0; left: 0; right: 0; background: var(--surface); border-top: 1px solid var(--border2); border-radius: 24px 24px 0 0; z-index: 301; max-height: 75vh; overflow-y: auto; animation: slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1); }
  @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
  .sheet-handle { width: 40px; height: 4px; background: var(--border2); border-radius: 2px; margin: 14px auto 20px; }
  .sheet-title { font-size: 1.1rem; font-weight: 800; padding: 0 20px 16px; letter-spacing: -0.02em; }
  .sheet-items { padding: 0 16px 32px; display: flex; flex-direction: column; gap: 10px; }
  .sheet-item { display: flex; align-items: center; gap: 14px; padding: 12px 14px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; transition: all 0.2s; }
  .sheet-item:hover, .sheet-item.selected { border-color: var(--accent); background: rgba(124,111,255,0.08); }
  .sheet-item-thumb { width: 56px; height: 56px; border-radius: 10px; object-fit: cover; background: var(--surface3); flex-shrink: 0; }
  .sheet-item-info { flex: 1; }
  .sheet-item-label { font-size: 0.82rem; font-weight: 700; margin-bottom: 3px; }
  .sheet-item-sub { font-size: 0.68rem; color: var(--text2); }
  .sheet-item-check { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--border2); display: flex; align-items: center; justify-content: center; font-size: 0.7rem; flex-shrink: 0; transition: all 0.2s; }
  .sheet-item.selected .sheet-item-check { background: var(--accent); border-color: var(--accent); color: #fff; }
  .sheet-footer { padding: 16px 20px 32px; border-top: 1px solid var(--border); display: flex; gap: 10px; }

  /* LOADING */
  .loading-full { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; padding: 40px 24px; text-align: center; }
  .loader-ring { position: relative; width: 64px; height: 64px; margin: 0 auto 28px; }
  .loader-ring-outer { width: 64px; height: 64px; border: 3px solid var(--border2); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.9s linear infinite; }
  .loader-ring-inner { position: absolute; inset: 8px; border: 2px solid transparent; border-top-color: var(--accent2); border-radius: 50%; animation: spin 0.6s linear infinite reverse; }
  @keyframes spin { to{transform:rotate(360deg)} }
  .loading-h { font-size: 1.3rem; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.02em; }
  .loading-sub { font-size: 0.8rem; color: var(--text2); margin-bottom: 28px; line-height: 1.6; }
  .steps-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
  .step-pill { padding: 5px 14px; border-radius: 100px; background: var(--surface2); border: 1px solid var(--border); font-size: 0.68rem; font-weight: 600; color: var(--muted); transition: all 0.3s; }
  .step-pill.active { border-color: var(--accent); color: var(--accent); background: rgba(124,111,255,0.12); }
  .step-pill.done { border-color: var(--border); color: var(--success); }

  /* CROP EDITOR */
  .crop-overlay-wrap { max-width: 900px; margin: 0 auto; padding: 24px 20px; }
  .crop-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
  @media(min-width:640px){.crop-grid{grid-template-columns:repeat(2,1fr)}}
  @media(min-width:960px){.crop-grid{grid-template-columns:repeat(3,1fr)}}
  .crop-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .crop-card-top { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--border); }
  .crop-card-name { font-size: 0.75rem; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.07em; }
  .crop-card-num { font-size: 0.65rem; color: var(--muted); font-family: 'DM Mono', monospace; }
  .crop-editor-wrap { position: relative; background: #05050f; touch-action: none; user-select: none; overflow: hidden; }
  .crop-bg-img { width: 100%; display: block; opacity: 0.3; pointer-events: none; }
  .crop-sel { position: absolute; border: 2px solid var(--accent); background: rgba(124,111,255,0.07); touch-action: none; will-change: left,top,width,height; }
  .crop-h { position: absolute; width: 26px; height: 26px; background: linear-gradient(135deg,var(--accent),var(--accent2)); border-radius: 6px; touch-action: none; z-index: 10; box-shadow: 0 2px 12px var(--glow); }
  @media(min-width:600px){.crop-h{width:14px;height:14px;border-radius:3px}}
  .crop-h.tl{top:-13px;left:-13px;cursor:nw-resize}
  .crop-h.tr{top:-13px;right:-13px;cursor:ne-resize}
  .crop-h.bl{bottom:-13px;left:-13px;cursor:sw-resize}
  .crop-h.br{bottom:-13px;right:-13px;cursor:se-resize}
  @media(min-width:600px){.crop-h.tl{top:-7px;left:-7px}.crop-h.tr{top:-7px;right:-7px}.crop-h.bl{bottom:-7px;left:-7px}.crop-h.br{bottom:-7px;right:-7px}}
  .crop-preview-bar { font-size: 0.58rem; color: var(--muted); padding: 7px 14px 3px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
  .crop-preview-img { width: 100%; max-height: 110px; object-fit: contain; background: #030308; display: block; }
  .crop-card-foot { padding: 10px 14px; display: flex; gap: 8px; }
  .skip-btn { background: transparent; color: var(--muted); border: 1px solid var(--border); font-family: 'Inter', sans-serif; font-size: 0.68rem; font-weight: 600; padding: 7px 14px; border-radius: var(--radius-xs); cursor: pointer; touch-action: manipulation; transition: all 0.2s; }
  .skip-btn:hover { border-color: var(--danger); color: var(--danger); }
  .skip-btn.skipped { border-color: rgba(248,113,113,0.4); color: var(--danger); background: rgba(248,113,113,0.06); }

  /* ITEM CARDS GRID */
  .results-wrap { max-width: 1200px; margin: 0 auto; padding: 32px 20px 80px; }
  .results-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 32px; gap: 16px; flex-wrap: wrap; }
  .results-h { font-size: 1.6rem; font-weight: 900; letter-spacing: -0.04em; }
  .results-sub { font-size: 0.75rem; color: var(--text2); margin-top: 5px; font-weight: 500; }
  .items-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
  @media(min-width:600px){.items-grid{grid-template-columns:repeat(2,1fr)}}
  @media(min-width:900px){.items-grid{grid-template-columns:repeat(3,1fr)}}

  .item-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; transition: all 0.25s; cursor: pointer; }
  .item-card:hover { border-color: rgba(124,111,255,0.4); transform: translateY(-3px); box-shadow: 0 12px 40px rgba(124,111,255,0.15); }
  .item-card.expanded { grid-column: 1/-1; cursor: default; border-color: var(--accent); transform: none; box-shadow: 0 0 0 1px var(--accent), 0 20px 60px var(--glow); }

  .card-img-wrap { position: relative; aspect-ratio: 4/3; background: #05050f; overflow: hidden; }
  .card-img { width: 100%; height: 100%; object-fit: contain; display: block; transition: transform 0.3s; }
  .item-card:hover .card-img { transform: scale(1.03); }
  .card-badge { position: absolute; top: 12px; left: 12px; font-size: 0.58rem; font-weight: 700; padding: 4px 10px; border-radius: 100px; backdrop-filter: blur(8px); letter-spacing: 0.08em; text-transform: uppercase; border: 1px solid rgba(124,111,255,0.3); background: rgba(8,8,15,0.8); color: var(--accent); }
  .conf-pill { position: absolute; top: 12px; right: 12px; font-size: 0.62rem; font-weight: 700; padding: 4px 10px; border-radius: 100px; font-family: 'Inter', sans-serif; }
  .card-media-count { position: absolute; bottom: 12px; right: 12px; background: rgba(8,8,15,0.8); color: var(--text2); font-size: 0.6rem; padding: 3px 9px; border-radius: 6px; font-family: 'DM Mono', monospace; backdrop-filter: blur(4px); }

  .card-body { padding: 18px; }
  .card-title { font-size: 0.95rem; font-weight: 700; margin-bottom: 10px; line-height: 1.3; letter-spacing: -0.02em; }
  .card-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 14px; }
  .tag { font-size: 0.6rem; color: var(--text2); border: 1px solid var(--border); padding: 3px 9px; border-radius: 6px; font-weight: 500; }
  .tag.primary { border-color: rgba(124,111,255,0.35); color: rgba(176,106,255,0.9); background: rgba(124,111,255,0.07); }
  .card-price-row { display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; }
  .card-price { font-size: 1.6rem; font-weight: 900; letter-spacing: -0.04em; }
  .card-price-range { font-size: 0.72rem; color: var(--muted); font-weight: 500; }
  .card-preview { font-size: 0.7rem; color: var(--text2); line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .platform-row { display: flex; gap: 6px; margin-top: 12px; flex-wrap: wrap; }
  .platform-chip { display: flex; align-items: center; gap: 5px; background: var(--surface2); border: 1px solid var(--border); padding: 4px 10px; border-radius: 6px; font-size: 0.62rem; font-weight: 600; color: var(--text2); }

  .card-footer { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-top: 1px solid var(--border); gap: 8px; flex-wrap: wrap; }
  .card-foot-hint { font-size: 0.62rem; color: var(--muted); font-weight: 500; }
  .card-foot-btns { display: flex; gap: 6px; }
  .btn-card { background: transparent; font-family: 'Inter', sans-serif; font-size: 0.65rem; font-weight: 700; padding: 6px 14px; border-radius: var(--radius-xs); cursor: pointer; touch-action: manipulation; transition: all 0.2s; border: 1px solid var(--border); color: var(--text2); }
  .btn-card:hover { color: var(--text); border-color: var(--accent); }
  .btn-card.danger { color: rgba(248,113,113,0.7); border-color: rgba(248,113,113,0.2); }
  .btn-card.danger:hover { color: var(--danger); border-color: var(--danger); }

  /* EXPANDED CARD */
  .exp-inner { display: grid; grid-template-columns: 1fr; gap: 28px; padding: 24px; }
  @media(min-width:700px){.exp-inner{grid-template-columns:300px 1fr;padding:32px;gap:40px}}

  .exp-img { width: 100%; border-radius: var(--radius-sm); border: 1px solid var(--border); object-fit: contain; background: #05050f; max-height: 260px; cursor: pointer; transition: opacity 0.2s; }
  .exp-img:hover { opacity: 0.9; }

  /* MEDIA */
  .media-sec { margin-top: 18px; }
  .media-sec-title { font-size: 0.6rem; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 10px; font-weight: 700; }
  .media-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
  .media-thumb-w { position: relative; width: 64px; height: 64px; border-radius: 10px; overflow: hidden; border: 1px solid var(--border); flex-shrink: 0; background: #05050f; }
  .media-thumb { width: 100%; height: 100%; object-fit: cover; cursor: pointer; display: block; }
  .media-vid { width: 100%; height: 100%; object-fit: cover; cursor: pointer; display: block; }
  .media-rm { position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; background: rgba(8,8,15,0.9); color: #fff; border: none; border-radius: 50%; font-size: 9px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .vid-badge { position: absolute; bottom: 3px; left: 3px; background: rgba(8,8,15,0.8); color: var(--accent); font-size: 0.48rem; padding: 1px 5px; border-radius: 3px; font-weight: 700; }
  .add-media-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .add-btn { display: flex; align-items: center; gap: 5px; background: var(--surface2); border: 1px dashed var(--border2); color: var(--muted); font-family: 'Inter', sans-serif; font-size: 0.68rem; font-weight: 600; padding: 8px 14px; border-radius: var(--radius-xs); cursor: pointer; touch-action: manipulation; transition: all 0.2s; white-space: nowrap; }
  .add-btn:hover { border-color: var(--accent); color: var(--accent); }

  /* ID LIST */
  .id-sec { margin-top: 18px; }
  .id-sec-title { font-size: 0.6rem; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
  .id-row { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); }
  .id-row:last-child { border-bottom: none; }
  .id-n { font-size: 0.6rem; color: var(--muted); width: 18px; font-family: 'DM Mono', monospace; flex-shrink: 0; padding-top: 1px; }
  .id-name { flex: 1; font-size: 0.72rem; font-weight: 600; line-height: 1.4; }
  .id-conf { font-size: 0.6rem; color: var(--muted); flex-shrink: 0; }
  .reason-box { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-xs); padding: 8px 12px; font-size: 0.62rem; color: var(--text2); line-height: 1.6; margin-top: 4px; }
  .g-verify { display: inline-flex; align-items: center; gap: 5px; font-size: 0.65rem; color: var(--success); font-weight: 700; margin-top: 6px; }
  .meta-item { font-size: 0.68rem; color: var(--text2); margin-top: 5px; line-height: 1.5; }
  .meta-item span { color: rgba(176,106,255,0.9); font-weight: 600; }

  /* FORM */
  .form-sec { }
  .f-label { font-size: 0.6rem; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 7px; margin-top: 20px; font-weight: 700; display: flex; align-items: center; justify-content: space-between; }
  .f-label:first-child { margin-top: 0; }
  .f-input { width: 100%; background: var(--surface2); border: 1px solid var(--border); color: var(--text); font-family: 'Inter', sans-serif; font-size: 0.95rem; font-weight: 700; padding: 12px 14px; border-radius: var(--radius-sm); outline: none; -webkit-appearance: none; transition: border-color 0.2s; letter-spacing: -0.02em; }
  .f-input:focus { border-color: var(--accent); }
  .f-price { width: 160px; font-size: 1.5rem; font-weight: 900; letter-spacing: -0.04em; }
  .price-meta { font-size: 0.65rem; color: var(--muted); margin-top: 5px; font-weight: 500; }
  .f-textarea { width: 100%; background: var(--surface2); border: 1px solid var(--border); color: var(--text); font-family: 'DM Mono', monospace; font-size: 0.7rem; line-height: 1.7; padding: 12px 14px; border-radius: var(--radius-sm); resize: vertical; outline: none; min-height: 170px; -webkit-appearance: none; transition: border-color 0.2s; }
  .f-textarea:focus { border-color: var(--accent); }

  /* TONE SLIDER */
  .tone-wrap { margin-top: 18px; }
  .tone-label-row { display: flex; justify-content: space-between; font-size: 0.62rem; color: var(--muted); font-weight: 600; margin-bottom: 8px; }
  .tone-slider { width: 100%; -webkit-appearance: none; appearance: none; height: 4px; border-radius: 2px; background: linear-gradient(90deg, var(--success), var(--accent), var(--warning)); outline: none; cursor: pointer; }
  .tone-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.4); cursor: pointer; transition: transform 0.15s; }
  .tone-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
  .tone-current { text-align: center; font-size: 0.7rem; color: var(--accent); font-weight: 700; margin-top: 6px; }

  /* SMART TOOLS */
  .tools-row { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
  .tool-btn { display: flex; align-items: center; gap: 6px; background: var(--surface2); border: 1px solid var(--border2); color: var(--text2); font-family: 'Inter', sans-serif; font-size: 0.7rem; font-weight: 600; padding: 8px 14px; border-radius: var(--radius-xs); cursor: pointer; touch-action: manipulation; transition: all 0.2s; white-space: nowrap; }
  .tool-btn:hover { border-color: var(--accent); color: var(--accent); }
  .tool-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .seo-toggle { display: flex; align-items: center; gap: 8px; }
  .toggle-sw { position: relative; width: 36px; height: 20px; background: var(--border2); border-radius: 100px; cursor: pointer; transition: background 0.2s; flex-shrink: 0; }
  .toggle-sw.on { background: var(--accent); }
  .toggle-sw::after { content: ''; position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; background: #fff; border-radius: 50%; transition: transform 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.3); }
  .toggle-sw.on::after { transform: translateX(16px); }

  /* ACTION ROW */
  .act-row { display: flex; gap: 8px; margin-top: 20px; flex-wrap: wrap; }
  .btn-list-now { background: linear-gradient(135deg,var(--accent),var(--accent2)); color: #fff; font-family: 'Inter', sans-serif; font-size: 0.82rem; font-weight: 700; padding: 13px 22px; border-radius: var(--radius-sm); border: none; cursor: pointer; touch-action: manipulation; flex: 1; text-align: center; min-width: 110px; transition: all 0.2s; letter-spacing: -0.01em; box-shadow: 0 4px 16px var(--glow); }
  .btn-list-now:hover { transform: translateY(-1px); box-shadow: 0 8px 24px var(--glow); }
  .btn-dl { background: var(--surface2); color: var(--text); font-family: 'Inter', sans-serif; font-size: 0.82rem; font-weight: 600; padding: 13px 20px; border-radius: var(--radius-sm); border: 1px solid var(--border2); cursor: pointer; touch-action: manipulation; flex: 1; text-align: center; min-width: 110px; transition: border-color 0.2s; }
  .btn-dl:hover { border-color: var(--accent); }
  .btn-dl:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-col { background: transparent; color: var(--muted); border: 1px solid var(--border); font-family: 'Inter', sans-serif; font-size: 0.78rem; font-weight: 500; padding: 13px 18px; border-radius: var(--radius-sm); cursor: pointer; touch-action: manipulation; transition: all 0.2s; }
  .btn-col:hover { color: var(--text); border-color: var(--border2); }
  .btn-del { background: transparent; color: rgba(248,113,113,0.7); border: 1px solid rgba(248,113,113,0.2); font-family: 'Inter', sans-serif; font-size: 0.78rem; font-weight: 500; padding: 13px 18px; border-radius: var(--radius-sm); cursor: pointer; touch-action: manipulation; transition: all 0.2s; }
  .btn-del:hover { color: var(--danger); border-color: var(--danger); }
  .pkg-note { font-size: 0.62rem; color: var(--muted); margin-top: 10px; line-height: 1.6; }

  /* POSTING SCREEN */
  .post-wrap { max-width: 680px; margin: 0 auto; padding: 40px 20px 80px; }
  .post-header { text-align: center; margin-bottom: 40px; }
  .post-h { font-size: 1.8rem; font-weight: 900; letter-spacing: -0.04em; margin-bottom: 10px; }
  .post-sub { font-size: 0.82rem; color: var(--text2); line-height: 1.6; }
  .platform-cards { display: flex; flex-direction: column; gap: 14px; margin-bottom: 32px; }
  .platform-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; display: flex; align-items: center; gap: 16px; transition: all 0.2s; cursor: pointer; }
  .platform-card:hover { border-color: var(--border2); }
  .platform-card.active { border-color: var(--accent); background: rgba(124,111,255,0.05); }
  .platform-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; }
  .platform-info { flex: 1; }
  .platform-name { font-size: 0.95rem; font-weight: 700; margin-bottom: 3px; letter-spacing: -0.02em; }
  .platform-desc { font-size: 0.7rem; color: var(--text2); }
  .platform-status { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
  .status-badge { font-size: 0.62rem; font-weight: 700; padding: 3px 10px; border-radius: 100px; letter-spacing: 0.05em; }
  .status-badge.ready { background: rgba(74,222,128,0.12); color: var(--success); border: 1px solid rgba(74,222,128,0.2); }
  .status-badge.posting { background: rgba(124,111,255,0.12); color: var(--accent); border: 1px solid rgba(124,111,255,0.2); }
  .status-badge.done { background: rgba(74,222,128,0.12); color: var(--success); border: 1px solid rgba(74,222,128,0.2); }
  .status-badge.error { background: rgba(248,113,113,0.12); color: var(--danger); border: 1px solid rgba(248,113,113,0.2); }
  .progress-bar-wrap { width: 80px; height: 3px; background: var(--border); border-radius: 2px; overflow: hidden; }
  .progress-bar-fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent2)); border-radius: 2px; transition: width 0.5s ease; }
  .post-all-btn { width: 100%; background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #fff; font-family: 'Inter', sans-serif; font-size: 1rem; font-weight: 800; padding: 18px; border-radius: var(--radius-sm); border: none; cursor: pointer; touch-action: manipulation; letter-spacing: -0.02em; box-shadow: 0 8px 32px var(--glow); transition: all 0.2s; }
  .post-all-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 40px var(--glow); }
  .post-all-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  /* DASHBOARD */
  .dash-wrap { max-width: 1100px; margin: 0 auto; padding: 32px 20px 80px; }
  .dash-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 28px; }
  @media(min-width:700px){.dash-stats{grid-template-columns:repeat(4,1fr)}}
  .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 20px; }
  .stat-card-label { font-size: 0.62rem; color: var(--muted); font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px; }
  .stat-card-val { font-size: 1.8rem; font-weight: 900; letter-spacing: -0.04em; }
  .stat-card-val.green { background: linear-gradient(135deg, var(--success), #22c55e); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .stat-card-val.purple { background: linear-gradient(135deg, var(--accent), var(--accent2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .stat-card-sub { font-size: 0.65rem; color: var(--text2); margin-top: 4px; font-weight: 500; }
  .dash-section-title { font-size: 1rem; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 16px; }
  .ai-insights { display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; }
  .insight-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 16px 18px; display: flex; align-items: center; gap: 14px; }
  .insight-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; }
  .insight-text { flex: 1; }
  .insight-title { font-size: 0.82rem; font-weight: 700; margin-bottom: 3px; }
  .insight-sub { font-size: 0.68rem; color: var(--text2); }
  .insight-action { font-size: 0.7rem; font-weight: 700; color: var(--accent); background: rgba(124,111,255,0.12); border: 1px solid rgba(124,111,255,0.2); padding: 6px 14px; border-radius: var(--radius-xs); cursor: pointer; white-space: nowrap; touch-action: manipulation; }
  .dash-listings { display: flex; flex-direction: column; gap: 10px; }
  .dash-listing-row { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 14px 18px; display: flex; align-items: center; gap: 14px; }
  .dash-listing-thumb { width: 52px; height: 52px; border-radius: 10px; object-fit: cover; background: var(--surface2); flex-shrink: 0; }
  .dash-listing-info { flex: 1; }
  .dash-listing-title { font-size: 0.82rem; font-weight: 700; margin-bottom: 3px; letter-spacing: -0.01em; }
  .dash-listing-meta { font-size: 0.65rem; color: var(--text2); }
  .dash-listing-price { font-size: 1.1rem; font-weight: 900; letter-spacing: -0.03em; }
  .dash-empty { text-align: center; padding: 48px 24px; color: var(--muted); font-size: 0.82rem; }

  /* LIGHTBOX */
  .lightbox { position: fixed; inset: 0; background: rgba(5,5,10,0.97); z-index: 500; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.2s ease; }
  .lb-img { max-width: 100%; max-height: 90vh; border-radius: var(--radius-sm); object-fit: contain; }
  .lb-video { max-width: 100%; max-height: 90vh; border-radius: var(--radius-sm); }
  .lb-close { position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.15); font-size: 1rem; width: 44px; height: 44px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
  .lb-close:hover { background: rgba(255,255,255,0.15); }

  /* ERROR */
  .err-box { background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.25); color: var(--danger); padding: 14px 18px; border-radius: var(--radius-sm); font-size: 0.78rem; margin-top: 16px; line-height: 1.5; max-width: 680px; margin-left: auto; margin-right: auto; }

  /* SECTION HEADER */
  .sec-hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 12px; flex-wrap: wrap; }
  .sec-h { font-size: 1.5rem; font-weight: 900; letter-spacing: -0.04em; }
  .sec-sub { font-size: 0.72rem; color: var(--text2); margin-top: 5px; font-weight: 500; }
  .btn-ghost-sm { background: transparent; color: var(--text2); border: 1px solid var(--border); font-family: 'Inter', sans-serif; font-size: 0.75rem; font-weight: 600; padding: 9px 18px; border-radius: var(--radius-xs); cursor: pointer; touch-action: manipulation; transition: all 0.2s; }
  .btn-ghost-sm:hover { color: var(--text); border-color: var(--border2); }
`;

const BBOX_COLORS = [
  { border: "#7c6fff", bg: "rgba(124,111,255,0.15)", label: "#7c6fff", num: "#7c6fff" },
  { border: "#ff6ab0", bg: "rgba(255,106,176,0.15)", label: "#ff6ab0", num: "#ff6ab0" },
  { border: "#4ade80", bg: "rgba(74,222,128,0.15)", label: "#4ade80", num: "#4ade80" },
  { border: "#fbbf24", bg: "rgba(251,191,36,0.15)", label: "#fbbf24", num: "#fbbf24" },
  { border: "#60a5fa", bg: "rgba(96,165,250,0.15)", label: "#60a5fa", num: "#60a5fa" },
  { border: "#f87171", bg: "rgba(248,113,113,0.15)", label: "#f87171", num: "#f87171" },
  { border: "#a78bfa", bg: "rgba(167,139,250,0.15)", label: "#a78bfa", num: "#a78bfa" },
  { border: "#34d399", bg: "rgba(52,211,153,0.15)", label: "#34d399", num: "#34d399" },
];

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
  for(let y2=0;y2<H;y2++)for(let x2=0;x2<W;x2++){const idx=(y2*W+x2)*4;for(let c=0;c<3;c++){let blur=0,cnt=0;for(let dy=-1;dy<=1;dy++)for(let dx2=-1;dx2<=1;dx2++){const ny=y2+dy,nx=x2+dx2;if(ny>=0&&ny<H&&nx>=0&&nx<W){blur+=d[(ny*W+nx)*4+c];cnt++;}}blur/=cnt;sh2[idx+c]=Math.min(255,Math.max(0,d[idx+c]+str*(d[idx+c]-blur)));}sh2[idx+3]=d[idx+3];}
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
    dragRef.current = { type, ...getRelPos(clientX, clientY), box: { ...cropBox } };
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
      const { type, x: sx, y: sy, box } = dragRef.current;
      const dx = rel.x - sx, dy = rel.y - sy;
      let { x, y, w, h } = box;
      const min = 0.06;
      if (type === "move") { x = Math.max(0, Math.min(1-w, x+dx)); y = Math.max(0, Math.min(1-h, y+dy)); }
      else if (type === "br") { w = Math.max(min, Math.min(1-x, w+dx)); h = Math.max(min, Math.min(1-y, h+dy)); }
      else if (type === "tl") { const nx=Math.max(0,Math.min(x+w-min,x+dx)),ny=Math.max(0,Math.min(y+h-min,y+dy)); w=w+(x-nx);h=h+(y-ny);x=nx;y=ny; }
      else if (type === "tr") { const ny=Math.max(0,Math.min(y+h-min,y+dy)); w=Math.max(min,Math.min(1-x,w+dx));h=h+(y-ny);y=ny; }
      else if (type === "bl") { const nx=Math.max(0,Math.min(x+w-min,x+dx)); w=w+(x-nx);x=nx;h=Math.max(min,Math.min(1-y,h+dy)); }
      dragRef.current.box = { x, y, w, h };
      dragRef.current.x = rel.x; dragRef.current.y = rel.y;
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
      <img src={imgSrc} className="crop-bg-img" alt="" draggable={false} />
      <div className="crop-sel" style={{ left: pct(cropBox.x), top: pct(cropBox.y), width: pct(cropBox.w), height: pct(cropBox.h) }}
        onMouseDown={e => startDrag(e, "move")} onTouchStart={e => startDrag(e, "move")}>
        <div className="crop-h tl" onMouseDown={e => startDrag(e, "tl")} onTouchStart={e => startDrag(e, "tl")} />
        <div className="crop-h tr" onMouseDown={e => startDrag(e, "tr")} onTouchStart={e => startDrag(e, "tr")} />
        <div className="crop-h bl" onMouseDown={e => startDrag(e, "bl")} onTouchStart={e => startDrag(e, "bl")} />
        <div className="crop-h br" onMouseDown={e => startDrag(e, "br")} onTouchStart={e => startDrag(e, "br")} />
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

const PLATFORMS = [
  { id: "ebay", name: "eBay", icon: "🛒", desc: "Best for electronics, collectibles, branded items", color: "#e53238" },
  { id: "facebook", name: "Facebook Marketplace", icon: "📘", desc: "Best for furniture, local pickup, general items", color: "#1877f2" },
  { id: "offerup", name: "OfferUp", icon: "🟠", desc: "Best for quick local sales, all categories", color: "#ff5a35" },
];

export default function App() {
  const [tab, setTab] = useState("scan");
  const [image, setImage] = useState(null);
  const [phase, setPhase] = useState("upload");
  const [loadStep, setLoadStep] = useState(0);
  const [detectedObjects, setDetectedObjects] = useState([]);
  const [cropBoxes, setCropBoxes] = useState([]);
  const [skipped, setSkipped] = useState([]);
  const [cropPreviews, setCropPreviews] = useState([]);
  const [showSheet, setShowSheet] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [items, setItems] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [toneValues, setToneValues] = useState({});
  const [seoToggles, setSeoToggles] = useState({});
  const [rewriting, setRewriting] = useState(null);
  const [postingStatus, setPostingStatus] = useState({});
  const [postProgress, setPostProgress] = useState({});
  const [isPosting, setIsPosting] = useState(false);
  const [soldItems] = useState([]);
  const cameraRef = useRef();
  const galleryRef = useRef();
  const imgRef = useRef();
  const photoRefs = useRef({});
  const videoRefs = useRef({});

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImage(await compressImage(file));
    setPhase("upload");
    setDetectedObjects([]);
    setCropBoxes([]);
    setSkipped([]);
    setShowSheet(false);
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
      setSkipped([]);
      setSelectedItems(data.objects.map((_, i) => i));
      setLoadStep(2); setPhase("detect");
      setTimeout(() => setShowSheet(true), 600);
    } catch (err) { setError(err.message); setPhase("upload"); }
  };

  const generateListings = async () => {
    setShowSheet(false);
    setPhase("loading"); setLoadStep(3);
    const img = imgRef.current;
    const nw = img.naturalWidth, nh = img.naturalHeight;
    try {
      const activeIndexes = detectedObjects.map((_, i) => i).filter(i => !skipped.includes(i) && selectedItems.includes(i));
      const results = await Promise.all(activeIndexes.map(async (i) => {
        const obj = detectedObjects[i], box = cropBoxes[i];
        const px = { x: box.x*nw, y: box.y*nh, w: box.w*nw, h: box.h*nh };
        const cropDataUrl = cropImageToCanvas(img, px);
        const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageBase64: cropDataUrl.split(",")[1], mediaType: "image/jpeg", mode: "list", label: obj.label, highResBase64: getHighResCrop(img, px) }) });
        const data = await res.json();
        return { id: i, label: obj.label, cropDataUrl, extraPhotos: [], video: null, ...(data.error ? { title: obj.label, priceSuggested: 20, priceMin: 10, priceMax: 40, listing: "Unable to generate listing.", identifications: [{ name: obj.label, confidence: "medium" }], confidenceScore: 0, tags: [] } : data) };
      }));
      setLoadStep(4); await new Promise(r => setTimeout(r, 300));
      setItems(results); setPhase("results"); setTab("scan");
    } catch (err) { setError(err.message); setPhase("detect"); }
    setGenerating(false);
  };

  const rewriteListing = async (itemId) => {
    const item = items.find(it => it.id === itemId);
    if (!item) return;
    setRewriting(itemId);
    try {
      const tone = toneValues[itemId] !== undefined ? (toneValues[itemId] < 33 ? "fast" : toneValues[itemId] > 66 ? "profit" : "balanced") : "balanced";
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "rewrite", currentTitle: item.title, currentListing: item.listing, rewriteTone: tone }) });
      const data = await res.json();
      if (data.title) updateItem(itemId, "title", data.title);
      if (data.listing) updateItem(itemId, "listing", data.listing);
    } catch (err) { console.error(err); }
    setRewriting(null);
  };

  const simulatePosting = async () => {
    if (items.length === 0) return;
    setIsPosting(true);
    const newStatus = {};
    const newProgress = {};
    PLATFORMS.forEach(p => { newStatus[p.id] = "posting"; newProgress[p.id] = 0; });
    setPostingStatus(newStatus);
    setPostProgress(newProgress);
    for (const platform of PLATFORMS) {
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(r => setTimeout(r, 150));
        setPostProgress(prev => ({ ...prev, [platform.id]: i }));
      }
      await new Promise(r => setTimeout(r, 300));
      setPostingStatus(prev => ({ ...prev, [platform.id]: "done" }));
    }
    setIsPosting(false);
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
  const updateItem = (id, field, value) => setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it));
  const copyListing = item => {
    navigator.clipboard.writeText(`${item.title}\n\nPrice: $${item.priceSuggested}\n\n${item.listing}`)
      .then(() => { setCopied(item.id); setTimeout(() => setCopied(null), 1800); });
  };
  const updateCropBox = (i, box) => setCropBoxes(prev => prev.map((b,idx) => idx===i ? box : b));
  const toggleSkip = i => setSkipped(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  const toggleSelected = i => setSelectedItems(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  const reset = () => { setImage(null); setItems([]); setPhase("upload"); setError(null); setExpandedId(null); setDetectedObjects([]); setCropBoxes([]); setSkipped([]); setShowSheet(false); setSelectedItems([]); };

  const downloadPackage = async (item) => {
    setDownloading(item.id);
    try {
      const zip = new JSZip();
      const folder = zip.folder(item.title.replace(/[^a-z0-9]/gi,"_").slice(0,40));
      const txt = [`TITLE: ${item.title}`,`PRICE: $${item.priceSuggested} ($${item.priceMin}-$${item.priceMax})`,item.confidenceScore?`CONFIDENCE: ${item.confidenceScore}%`:"",item.condition?`CONDITION: ${item.condition}`:"",item.materials?`MATERIALS: ${item.materials}`:"",item.estimatedDimensions?`DIMENSIONS: ${item.estimatedDimensions}`:"",`\nTAGS: ${(item.tags||[]).join(", ")}`,`\nDESCRIPTION:\n${item.listing}`].filter(Boolean).join("\n");
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

  const getToneLabel = (val) => val < 33 ? "⚡ Sell Fast" : val > 66 ? "💰 Max Profit" : "⚖️ Balanced";
  const steps = ["Uploading","Detecting Objects","Ready","Generating Listings","Done!"];
  const activeCount = detectedObjects.length - skipped.length;
  const totalEarnings = items.reduce((sum, it) => sum + (parseFloat(it.priceSuggested) || 0), 0);

  return (
    <>
      <style>{STYLES}</style>
      {image && <img ref={imgRef} src={image.dataUrl} alt="" style={{ display:"none" }} />}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ position:"absolute",left:"-9999px" }} onChange={e=>handleFile(e.target.files[0])} />
      <input ref={galleryRef} type="file" accept="image/*" style={{ position:"absolute",left:"-9999px" }} onChange={e=>handleFile(e.target.files[0])} />

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="lb-close">✕</button>
          {lightbox.type === "image" ? <img className="lb-img" src={lightbox.src} alt="" onClick={e=>e.stopPropagation()} /> : <video className="lb-video" src={lightbox.src} controls autoPlay onClick={e=>e.stopPropagation()} />}
        </div>
      )}

      {/* BOTTOM SHEET */}
      {showSheet && (
        <>
          <div className="sheet-backdrop" onClick={() => setShowSheet(false)} />
          <div className="bottom-sheet">
            <div className="sheet-handle" />
            <div className="sheet-title">{detectedObjects.length} Items Detected — Select to List</div>
            <div className="sheet-items">
              {detectedObjects.map((obj, i) => (
                <div key={i} className={`sheet-item${selectedItems.includes(i) ? " selected" : ""}`} onClick={() => toggleSelected(i)}>
                  {cropPreviews[i] ? <img className="sheet-item-thumb" src={cropPreviews[i]} alt="" /> : <div className="sheet-item-thumb" />}
                  <div className="sheet-item-info">
                    <div className="sheet-item-label">{obj.label}</div>
                    <div className="sheet-item-sub">#{i+1} · {obj.confidence} confidence</div>
                  </div>
                  <div className="sheet-item-check">{selectedItems.includes(i) ? "✓" : ""}</div>
                </div>
              ))}
            </div>
            <div className="sheet-footer">
              <button className="btn-ghost-sm" onClick={() => setShowSheet(false)} style={{ flex:1 }}>Back to Image</button>
              <button className="btn-grad" onClick={generateListings} style={{ flex:2 }} disabled={selectedItems.length === 0}>
                Generate {selectedItems.length} Listing{selectedItems.length !== 1 ? "s" : ""} →
              </button>
            </div>
          </div>
        </>
      )}

      {/* NAV */}
      <nav className="nav">
        <div className="nav-logo">Multi<span className="g">Snap</span></div>
        <div className="nav-right">
          {["scan","listings","post","dashboard"].map(t => (
            <button key={t} className={`nav-tab${tab===t?" active":""}`} onClick={() => setTab(t)}>
              {t === "scan" ? "Scan" : t === "listings" ? `Listings${items.length ? ` (${items.length})` : ""}` : t === "post" ? "Post" : "Dashboard"}
            </button>
          ))}
          <div className="nav-beta">BETA</div>
        </div>
      </nav>

      {/* SCAN TAB */}
      {tab === "scan" && (
        <>
          {phase === "upload" && (
            <>
              <div className="hero">
                <div className="hero-pill"><div className="hero-pill-dot" />AI-Powered Multi-Object Detection</div>
                <h1 className="hero-h1">One Photo.<br /><span className="grad">Infinite Listings.</span></h1>
                <p className="hero-sub">Upload any scene and watch AI detect, crop, identify, and price every item automatically.</p>
                <div className="hero-stats">
                  <div className="hero-stat"><div className="hero-stat-num">2-Pass</div><div className="hero-stat-label">AI Identification</div></div>
                  <div className="hero-stat"><div className="hero-stat-num">Google</div><div className="hero-stat-label">Price Verification</div></div>
                  <div className="hero-stat"><div className="hero-stat-num">3</div><div className="hero-stat-label">Marketplaces</div></div>
                </div>
              </div>
              <div className="scan-wrap">
                {!image ? (
                  <div className={`scan-zone${dragOver?" drag":""}`} onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop}>
                    <div className="scan-icon-wrap">📷</div>
                    <div className="scan-title">Scan Your Items</div>
                    <div className="scan-sub">Take a photo or upload from your library.<br />Works with rooms, closets, shelves — anything.</div>
                    <div className="scan-btns">
                      <button className="btn-grad" onClick={() => { cameraRef.current.value=""; cameraRef.current.click(); }}>📷 Take Photo</button>
                      <button className="btn-outline" onClick={() => { galleryRef.current.value=""; galleryRef.current.click(); }}>🖼 Choose from Library</button>
                    </div>
                    <div className="scan-hint">Drag and drop also works on desktop</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display:"flex", gap:"10px", marginBottom:"16px", flexWrap:"wrap" }}>
                      <button className="btn-ghost-sm" onClick={reset}>Change Image</button>
                      <button className="btn-grad" onClick={detect} style={{ flex:1 }}>🔍 Detect All Items →</button>
                    </div>
                    <div style={{ borderRadius:"var(--radius)", overflow:"hidden", border:"1px solid var(--border)" }}>
                      <img src={image.dataUrl} style={{ width:"100%", display:"block" }} alt="preview" />
                    </div>
                  </div>
                )}
                {error && <div className="err-box">⚠ {error}</div>}
              </div>
            </>
          )}

          {phase === "loading" && (
            <div className="loading-full">
              <div className="loader-ring">
                <div className="loader-ring-outer" />
                <div className="loader-ring-inner" />
              </div>
              <div className="loading-h">{loadStep === 3 ? "Generating listings..." : "Detecting objects..."}</div>
              <div className="loading-sub">{loadStep === 3 ? "Running two-pass AI identification with Google verification" : "AI is scanning your image for every sellable item"}</div>
              <div className="steps-row">
                {steps.map((s,i) => <span key={s} className={`step-pill${i<loadStep?" done":i===loadStep?" active":""}`}>{i<loadStep?"✓ ":""}{s}</span>)}
              </div>
            </div>
          )}

          {phase === "detect" && image && (
            <div className="detect-wrap">
              <div className="sec-hdr">
                <div>
                  <div className="sec-h">{detectedObjects.length} Items Found</div>
                  <div className="sec-sub">Tap any box to select · Adjust crops below</div>
                </div>
                <div style={{ display:"flex", gap:"8px" }}>
                  <button className="btn-ghost-sm" onClick={reset}>New Image</button>
                  <button className="btn-grad" onClick={() => setShowSheet(true)}>Select Items →</button>
                </div>
              </div>
              <div className="img-detect-container">
                <img className="detect-img" src={image.dataUrl} alt="" ref={el => { if(el) { /* just for display */ }}} />
                {detectedObjects.map((obj, i) => {
                  const col = BBOX_COLORS[i % BBOX_COLORS.length];
                  const isSelected = selectedItems.includes(i);
                  return (
                    <div key={i} className="bbox" onClick={() => toggleSelected(i)}
                      style={{ left: `${obj.xFrac*100}%`, top: `${obj.yFrac*100}%`, width: `${obj.wFrac*100}%`, height: `${obj.hFrac*100}%`, borderColor: col.border, background: isSelected ? col.bg : "rgba(0,0,0,0.1)", animationDelay: `${i*0.1}s` }}>
                      <div className="bbox-label" style={{ background: col.border, color: "#fff" }}>{obj.label}</div>
                      <div className="bbox-num" style={{ background: col.border }}>{i+1}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop:"24px" }}>
                <div className="sec-hdr">
                  <div>
                    <div style={{ fontSize:"1rem", fontWeight:800, letterSpacing:"-0.02em" }}>Adjust Crops</div>
                    <div style={{ fontSize:"0.72rem", color:"var(--text2)", marginTop:"4px" }}>Drag the handles to fine-tune each crop</div>
                  </div>
                  <button className="btn-grad" onClick={generateListings} disabled={selectedItems.length === 0}>
                    Generate {selectedItems.filter(i => !skipped.includes(i)).length} Listings →
                  </button>
                </div>
                <div className="crop-grid">
                  {detectedObjects.map((obj, i) => (
                    <div key={i} className="crop-card" style={{ opacity: skipped.includes(i) ? 0.4 : 1 }}>
                      <div className="crop-card-top">
                        <div className="crop-card-name" style={{ color: BBOX_COLORS[i%BBOX_COLORS.length].border }}>{obj.label}</div>
                        <div className="crop-card-num">#{i+1}</div>
                      </div>
                      <CropEditor imgSrc={image.dataUrl} cropBox={cropBoxes[i]||{x:obj.xFrac,y:obj.yFrac,w:obj.wFrac,h:obj.hFrac}} onChange={box=>updateCropBox(i,box)} />
                      {cropPreviews[i] && <><div className="crop-preview-bar">Preview</div><img className="crop-preview-img" src={cropPreviews[i]} alt="" /></>}
                      <div className="crop-card-foot">
                        <button className={`skip-btn${skipped.includes(i)?" skipped":""}`} onClick={() => toggleSkip(i)}>{skipped.includes(i)?"✕ Skipped":"Skip Item"}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {error && <div className="err-box">⚠ {error}</div>}
            </div>
          )}

          {phase === "results" && items.length > 0 && (
            <div className="results-wrap">
              <div className="results-header">
                <div>
                  <div className="results-h">{items.length} Listing{items.length!==1?"s":""} Ready</div>
                  <div className="results-sub">Tap any card to expand, edit, and prepare for posting</div>
                </div>
                <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                  <button className="btn-ghost-sm" onClick={reset}>New Scan</button>
                  <button className="btn-grad" onClick={() => setTab("post")}>Post All →</button>
                </div>
              </div>
              <div className="items-grid">
                {items.map(item => {
                  const isExp = expandedId === item.id;
                  const totalMedia = 1 + (item.extraPhotos?.length||0) + (item.video?1:0);
                  const cc = item.confidenceScore ? confColor(item.confidenceScore) : null;
                  const toneVal = toneValues[item.id] !== undefined ? toneValues[item.id] : 50;
                  return (
                    <div key={item.id} className={`item-card${isExp?" expanded":""}`} onClick={() => !isExp && setExpandedId(item.id)}>
                      {!isExp ? (
                        <>
                          <div className="card-img-wrap">
                            <img className="card-img" src={item.cropDataUrl} alt={item.label} />
                            <div className="card-badge">{item.label}</div>
                            {cc && <div className="conf-pill" style={{ background:cc.bg, color:cc.color }}>{item.confidenceScore}%</div>}
                            <div className="card-media-count">#{item.id+1} · {totalMedia} photo{totalMedia!==1?"s":""}</div>
                          </div>
                          <div className="card-body">
                            <div className="card-title">{item.title}</div>
                            <div className="card-tags">
                              {item.identifications?.slice(0,2).map((id,i) => <span key={i} className={`tag${i===0?" primary":""}`}>{id.name}</span>)}
                              {(item.tags||[]).slice(0,3).map((t,i) => <span key={`t${i}`} className="tag">{t}</span>)}
                            </div>
                            <div className="card-price-row">
                              <div className="card-price">${item.priceSuggested}</div>
                              <div className="card-price-range">${item.priceMin}–${item.priceMax}</div>
                            </div>
                            <div className="card-preview">{item.listing}</div>
                            <div className="platform-row">
                              {PLATFORMS.map(p => <div key={p.id} className="platform-chip">{p.icon} {p.name.split(" ")[0]}</div>)}
                            </div>
                          </div>
                          <div className="card-footer">
                            <span className="card-foot-hint">Tap to edit</span>
                            <div className="card-foot-btns">
                              <button className="btn-card" onClick={e=>{e.stopPropagation();copyListing(item);}}>{copied===item.id?"✓":"Copy"}</button>
                              <button className="btn-card danger" onClick={e=>{e.stopPropagation();deleteItem(item.id);}}>Delete</button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="exp-inner">
                          <div>
                            <img className="exp-img" src={item.cropDataUrl} alt={item.label} onClick={() => setLightbox({ type:"image", src:item.cropDataUrl })} />
                            <div className="media-sec">
                              <div className="media-sec-title">Photos & Video ({totalMedia})</div>
                              <div className="media-row">
                                {(item.extraPhotos||[]).map((photo,pi) => (
                                  <div className="media-thumb-w" key={pi}>
                                    <img className="media-thumb" src={photo.dataUrl} alt="" onClick={() => setLightbox({ type:"image", src:photo.dataUrl })} />
                                    <button className="media-rm" onClick={() => removePhoto(item.id,pi)}>✕</button>
                                  </div>
                                ))}
                                {item.video && (
                                  <div className="media-thumb-w">
                                    <video className="media-vid" src={item.video.url} muted playsInline onClick={() => setLightbox({ type:"video", src:item.video.url })} />
                                    <div className="vid-badge">VID</div>
                                    <button className="media-rm" onClick={() => removeVideo(item.id)}>✕</button>
                                  </div>
                                )}
                              </div>
                              <div className="add-media-row">
                                <button className="add-btn" onClick={() => photoRefs.current[item.id]?.click()}>+ Photos</button>
                                <input ref={el=>photoRefs.current[item.id]=el} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>addPhotos(item.id,e.target.files)} />
                                {!item.video && <button className="add-btn" onClick={() => videoRefs.current[item.id]?.click()}>+ Video</button>}
                                <input ref={el=>videoRefs.current[item.id]=el} type="file" accept="video/*" style={{display:"none"}} onChange={e=>addVideo(item.id,e.target.files[0])} />
                              </div>
                            </div>
                            <div className="id-sec">
                              <div className="id-sec-title">
                                AI ID {cc && <span style={{ color:cc.color, fontWeight:700 }}>{item.confidenceScore}% confidence</span>}
                                {item.googleVerified && <span className="g-verify">✓ Google</span>}
                              </div>
                              {item.identifications?.map((id,i) => (
                                <div key={i}>
                                  <div className="id-row"><span className="id-n">{i+1}</span><span className="id-name">{id.name}</span><span className="id-conf">{id.confidence}</span></div>
                                  {id.reasoning && <div className="reason-box">{id.reasoning}</div>}
                                </div>
                              ))}
                            </div>
                            {item.condition && <div className="meta-item">{item.condition}</div>}
                            {item.materials && <div className="meta-item">Materials: <span>{item.materials}</span></div>}
                            {item.estimatedDimensions && <div className="meta-item">Size: <span>{item.estimatedDimensions}</span></div>}
                          </div>
                          <div className="form-sec">
                            <div className="f-label">Listing Title</div>
                            <input className="f-input" value={item.title} onChange={e=>updateItem(item.id,"title",e.target.value)} />
                            <div className="f-label">Price</div>
                            <input className="f-input f-price" value={item.priceSuggested} onChange={e=>updateItem(item.id,"priceSuggested",e.target.value)} />
                            <div className="price-meta">Range: ${item.priceMin} – ${item.priceMax}</div>

                            <div className="tone-wrap">
                              <div className="f-label" style={{ marginTop:16 }}>Pricing Strategy</div>
                              <div className="tone-label-row"><span>⚡ Sell Fast</span><span>💰 Max Profit</span></div>
                              <input type="range" className="tone-slider" min="0" max="100" value={toneVal} onChange={e => setToneValues(prev => ({ ...prev, [item.id]: parseInt(e.target.value) }))} />
                              <div className="tone-current">{getToneLabel(toneVal)}</div>
                            </div>

                            <div className="f-label" style={{ marginTop:18 }}>
                              <span>Description</span>
                              <div className="seo-toggle">
                                <span style={{ fontSize:"0.6rem", color:"var(--muted)" }}>SEO</span>
                                <div className={`toggle-sw${seoToggles[item.id]?" on":""}`} onClick={() => setSeoToggles(prev => ({ ...prev, [item.id]: !prev[item.id] }))} />
                              </div>
                            </div>
                            <textarea className="f-textarea" value={item.listing} onChange={e=>updateItem(item.id,"listing",e.target.value)} rows={7} />

                            <div className="tools-row">
                              <button className="tool-btn" onClick={() => rewriteListing(item.id)} disabled={rewriting===item.id}>
                                {rewriting===item.id ? "Rewriting..." : "✨ Rewrite"}
                              </button>
                              <button className="tool-btn" onClick={() => { setSeoToggles(prev => ({ ...prev, [item.id]: !prev[item.id] })); rewriteListing(item.id); }}>
                                🔍 Optimize SEO
                              </button>
                            </div>

                            <div className="act-row">
                              <button className="btn-list-now" onClick={() => copyListing(item)}>{copied===item.id?"✓ Copied!":"Copy Listing"}</button>
                              <button className="btn-dl" onClick={() => downloadPackage(item)} disabled={downloading===item.id}>{downloading===item.id?"Zipping...":"⬇ Download"}</button>
                              <button className="btn-col" onClick={() => setExpandedId(null)}>Collapse</button>
                              <button className="btn-del" onClick={() => deleteItem(item.id)}>Delete</button>
                            </div>
                            <div className="pkg-note">Package: main photo + extras{item.video?" + video":""} + listing text</div>
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
      )}

      {/* LISTINGS TAB */}
      {tab === "listings" && (
        <div className="results-wrap">
          {items.length === 0 ? (
            <div style={{ textAlign:"center", padding:"80px 24px" }}>
              <div style={{ fontSize:"3rem", marginBottom:"16px" }}>📦</div>
              <div style={{ fontSize:"1.2rem", fontWeight:800, marginBottom:"10px", letterSpacing:"-0.03em" }}>No listings yet</div>
              <div style={{ fontSize:"0.82rem", color:"var(--text2)", marginBottom:"28px" }}>Scan an image to get started</div>
              <button className="btn-grad" onClick={() => setTab("scan")}>Start Scanning →</button>
            </div>
          ) : (
            <>
              <div className="results-header">
                <div>
                  <div className="results-h">{items.length} Active Listing{items.length!==1?"s":""}</div>
                  <div className="results-sub">Total estimated value: ${totalEarnings.toFixed(0)}</div>
                </div>
                <button className="btn-grad" onClick={() => { setTab("scan"); reset(); }}>+ New Scan</button>
              </div>
              <div className="items-grid">
                {items.map(item => {
                  const cc = item.confidenceScore ? confColor(item.confidenceScore) : null;
                  return (
                    <div key={item.id} className="item-card" onClick={() => { setTab("scan"); setExpandedId(item.id); if(phase !== "results") setPhase("results"); }}>
                      <div className="card-img-wrap">
                        <img className="card-img" src={item.cropDataUrl} alt={item.label} />
                        <div className="card-badge">{item.label}</div>
                        {cc && <div className="conf-pill" style={{ background:cc.bg, color:cc.color }}>{item.confidenceScore}%</div>}
                      </div>
                      <div className="card-body">
                        <div className="card-title">{item.title}</div>
                        <div className="card-price-row">
                          <div className="card-price">${item.priceSuggested}</div>
                          <div className="card-price-range">${item.priceMin}–${item.priceMax}</div>
                        </div>
                        <div className="platform-row">
                          {PLATFORMS.map(p => <div key={p.id} className="platform-chip">{p.icon} {p.name.split(" ")[0]}</div>)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* POST TAB */}
      {tab === "post" && (
        <div className="post-wrap">
          <div className="post-header">
            <div className="post-h">Post Your Listings</div>
            <div className="post-sub">{items.length} listing{items.length!==1?"s":""} ready to post across all platforms</div>
          </div>
          {items.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 24px" }}>
              <div style={{ fontSize:"0.88rem", color:"var(--text2)", marginBottom:"24px" }}>No listings to post yet. Scan some items first.</div>
              <button className="btn-grad" onClick={() => setTab("scan")}>Go to Scanner →</button>
            </div>
          ) : (
            <>
              <div className="platform-cards">
                {PLATFORMS.map(p => {
                  const status = postingStatus[p.id] || "ready";
                  const progress = postProgress[p.id] || 0;
                  return (
                    <div key={p.id} className={`platform-card${status==="posting"?" active":""}`}>
                      <div className="platform-icon" style={{ background: `${p.color}22` }}>{p.icon}</div>
                      <div className="platform-info">
                        <div className="platform-name">{p.name}</div>
                        <div className="platform-desc">{p.desc}</div>
                        {status === "posting" && (
                          <div className="progress-bar-wrap" style={{ marginTop:"8px", width:"100%" }}>
                            <div className="progress-bar-fill" style={{ width:`${progress}%` }} />
                          </div>
                        )}
                      </div>
                      <div className="platform-status">
                        <div className={`status-badge ${status}`}>
                          {status === "ready" ? "Ready" : status === "posting" ? "Posting..." : status === "done" ? "✓ Done" : "Error"}
                        </div>
                        {status === "ready" && <div style={{ fontSize:"0.65rem", color:"var(--muted)" }}>{items.length} item{items.length!==1?"s":""}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button className="post-all-btn" onClick={simulatePosting} disabled={isPosting || Object.values(postingStatus).every(s => s === "done")}>
                {isPosting ? "Posting..." : Object.values(postingStatus).every(s => s === "done") ? "✓ All Posted!" : `🚀 Post All ${items.length} Listings`}
              </button>
            </>
          )}
        </div>
      )}

      {/* DASHBOARD TAB */}
      {tab === "dashboard" && (
        <div className="dash-wrap">
          <div className="sec-hdr">
            <div>
              <div className="sec-h">Dashboard</div>
              <div className="sec-sub">Your reselling activity at a glance</div>
            </div>
          </div>
          <div className="dash-stats">
            <div className="stat-card">
              <div className="stat-card-label">Est. Value</div>
              <div className="stat-card-val green">${totalEarnings.toFixed(0)}</div>
              <div className="stat-card-sub">from active listings</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Active</div>
              <div className="stat-card-val purple">{items.length}</div>
              <div className="stat-card-sub">listings ready</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Sold</div>
              <div className="stat-card-val" style={{ fontSize:"1.8rem", fontWeight:900 }}>{soldItems.length}</div>
              <div className="stat-card-sub">items sold</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Avg Price</div>
              <div className="stat-card-val purple">${items.length ? (totalEarnings / items.length).toFixed(0) : 0}</div>
              <div className="stat-card-sub">per listing</div>
            </div>
          </div>

          <div className="dash-section-title">AI Insights</div>
          <div className="ai-insights">
            {items.length === 0 ? (
              <div className="insight-card">
                <div className="insight-icon" style={{ background:"rgba(124,111,255,0.12)" }}>🤖</div>
                <div className="insight-text">
                  <div className="insight-title">Start scanning to get insights</div>
                  <div className="insight-sub">AI insights appear here after you create listings</div>
                </div>
              </div>
            ) : (
              <>
                <div className="insight-card">
                  <div className="insight-icon" style={{ background:"rgba(251,191,36,0.12)" }}>⚡</div>
                  <div className="insight-text">
                    <div className="insight-title">Lower prices by 15% to sell 3x faster</div>
                    <div className="insight-sub">Items priced 10-20% below market average sell significantly faster on all platforms</div>
                  </div>
                  <button className="insight-action" onClick={() => setTab("listings")}>Review</button>
                </div>
                <div className="insight-card">
                  <div className="insight-icon" style={{ background:"rgba(74,222,128,0.12)" }}>📸</div>
                  <div className="insight-text">
                    <div className="insight-title">Add more photos to boost engagement</div>
                    <div className="insight-sub">Listings with 4+ photos get 40% more views on Facebook Marketplace</div>
                  </div>
                  <button className="insight-action" onClick={() => setTab("listings")}>Add Photos</button>
                </div>
                <div className="insight-card">
                  <div className="insight-icon" style={{ background:"rgba(124,111,255,0.12)" }}>🔄</div>
                  <div className="insight-text">
                    <div className="insight-title">Post to all platforms for 3x more reach</div>
                    <div className="insight-sub">Multi-platform listings reach more buyers with no extra effort</div>
                  </div>
                  <button className="insight-action" onClick={() => setTab("post")}>Post Now</button>
                </div>
              </>
            )}
          </div>

          <div className="dash-section-title">Active Listings</div>
          <div className="dash-listings">
            {items.length === 0 ? (
              <div className="dash-empty">No listings yet — scan items to get started</div>
            ) : (
              items.map(item => (
                <div key={item.id} className="dash-listing-row">
                  <img className="dash-listing-thumb" src={item.cropDataUrl} alt={item.label} />
                  <div className="dash-listing-info">
                    <div className="dash-listing-title">{item.title}</div>
                    <div className="dash-listing-meta">{item.label} · {item.condition || "Condition unknown"}</div>
                  </div>
                  <div className="dash-listing-price">${item.priceSuggested}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
