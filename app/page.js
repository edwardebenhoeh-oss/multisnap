"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import JSZip from "jszip";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
  :root {
    --bg: #0b0b0f;
    --surface: #141418;
    --surface2: #1a1a24;
    --surface3: #22222e;
    --border: rgba(255,255,255,0.08);
    --border2: rgba(255,255,255,0.12);
    --accent: #7c5cff;
    --accent-h: #6b4eee;
    --success: #22c55e;
    --warning: #f59e0b;
    --danger: #ef4444;
    --text: #f8f8fc;
    --text2: #9191a8;
    --muted: #5a5a72;
    --card: #1a1a24;
    --radius: 16px;
    --radius-sm: 10px;
    --radius-xs: 7px;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  html { scroll-behavior: smooth; }
  body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; min-height: 100vh; overflow-x: hidden; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }

  .nav { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--border); background: rgba(11,11,15,0.95); backdrop-filter: blur(16px); position: sticky; top: 0; z-index: 200; }
  .nav-logo { font-size: 1.2rem; font-weight: 900; letter-spacing: -0.04em; color: var(--text); }
  .nav-logo .acc { color: var(--accent); }
  .nav-right { display: flex; align-items: center; gap: 6px; }
  .nav-tab { background: transparent; border: none; color: var(--text2); font-family: 'Inter', sans-serif; font-size: 0.73rem; font-weight: 600; padding: 6px 12px; border-radius: 8px; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
  .nav-tab:hover { color: var(--text); background: var(--surface2); }
  .nav-tab.active { color: var(--text); background: var(--surface2); }
  .nav-badge { font-size: 0.55rem; font-weight: 700; color: var(--accent); background: rgba(124,92,255,0.12); border: 1px solid rgba(124,92,255,0.2); padding: 2px 7px; border-radius: 100px; letter-spacing: 0.06em; }

  .step-bar { display: flex; align-items: center; padding: 12px 20px; background: var(--surface); border-bottom: 1px solid var(--border); overflow-x: auto; gap: 0; }
  .step-bar::-webkit-scrollbar { display: none; }
  .step-item { display: flex; align-items: center; gap: 7px; flex-shrink: 0; }
  .step-dot { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 800; flex-shrink: 0; transition: all 0.2s; }
  .step-dot.done { background: var(--success); color: #fff; }
  .step-dot.active { background: var(--accent); color: #fff; }
  .step-dot.pending { background: var(--surface3); color: var(--muted); border: 1px solid var(--border2); }
  .step-text { font-size: 0.67rem; font-weight: 600; white-space: nowrap; }
  .step-text.done { color: var(--success); }
  .step-text.active { color: var(--text); }
  .step-text.pending { color: var(--muted); }
  .step-arrow { color: var(--muted); font-size: 0.68rem; margin: 0 8px; flex-shrink: 0; }

  .btn-primary { background: var(--accent); color: #fff; font-family: 'Inter', sans-serif; font-size: 0.88rem; font-weight: 700; padding: 13px 24px; border-radius: var(--radius-sm); border: none; cursor: pointer; touch-action: manipulation; transition: background 0.15s; letter-spacing: -0.01em; }
  .btn-primary:hover { background: var(--accent-h); }
  .btn-primary:active { transform: scale(0.98); }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  .btn-secondary { background: var(--surface2); color: var(--text2); font-family: 'Inter', sans-serif; font-size: 0.85rem; font-weight: 600; padding: 12px 20px; border-radius: var(--radius-sm); border: 1px solid var(--border2); cursor: pointer; touch-action: manipulation; transition: all 0.15s; }
  .btn-secondary:hover { color: var(--text); }
  .btn-ghost { background: transparent; color: var(--text2); font-family: 'Inter', sans-serif; font-size: 0.8rem; font-weight: 600; padding: 10px 16px; border-radius: var(--radius-xs); border: 1px solid var(--border); cursor: pointer; touch-action: manipulation; transition: all 0.15s; }
  .btn-ghost:hover { color: var(--text); border-color: var(--border2); }

  .page { max-width: 860px; margin: 0 auto; padding: 24px 18px 80px; }

  .camera-screen { position: relative; width: 100%; background: #000; overflow: hidden; }
  .cam-video { width: 100%; height: 100%; display: block; object-fit: cover; background: #000; }
  .cam-overlay { position: absolute; inset: 0; pointer-events: none; }
  .cam-corner { position: absolute; width: 22px; height: 22px; border-color: rgba(255,255,255,0.55); border-style: solid; }
  .cam-corner.tl { top: 14px; left: 14px; border-width: 2px 0 0 2px; border-radius: 4px 0 0 0; }
  .cam-corner.tr { top: 14px; right: 14px; border-width: 2px 2px 0 0; border-radius: 0 4px 0 0; }
  .cam-corner.bl { bottom: 70px; left: 14px; border-width: 0 0 2px 2px; border-radius: 0 0 0 4px; }
  .cam-corner.br { bottom: 70px; right: 14px; border-width: 0 2px 2px 0; border-radius: 0 0 4px 0; }
  .cam-line { position: absolute; left: 14px; right: 14px; height: 1px; background: rgba(124,92,255,0.65); animation: camLine 2.5s ease-in-out infinite; }
  @keyframes camLine { 0%{top:14px;opacity:1} 90%{opacity:0.7} 100%{top:calc(100% - 70px);opacity:0} }
  .cam-controls { position: absolute; bottom: 0; left: 0; right: 0; padding: 10px 18px 22px; background: linear-gradient(transparent, rgba(0,0,0,0.88)); display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .cam-cancel { background: rgba(255,255,255,0.1); color: #fff; font-family: 'Inter', sans-serif; font-size: 0.73rem; font-weight: 600; padding: 9px 15px; border-radius: 100px; border: 1px solid rgba(255,255,255,0.15); cursor: pointer; touch-action: manipulation; }
  .cam-scan { background: var(--accent); color: #fff; font-family: 'Inter', sans-serif; font-size: 0.88rem; font-weight: 700; padding: 13px 28px; border-radius: 100px; border: none; cursor: pointer; touch-action: manipulation; transition: background 0.15s; flex: 1; max-width: 175px; }
  .cam-scan:hover { background: var(--accent-h); }
  .cam-gallery { background: rgba(255,255,255,0.1); color: #fff; font-family: 'Inter', sans-serif; font-size: 0.73rem; font-weight: 600; padding: 9px 13px; border-radius: 100px; border: 1px solid rgba(255,255,255,0.15); cursor: pointer; touch-action: manipulation; }

  .home-hero { text-align: center; padding: 52px 24px 36px; }
  .home-badge { display: inline-flex; align-items: center; gap: 7px; background: var(--surface2); border: 1px solid var(--border2); border-radius: 100px; padding: 5px 14px; font-size: 0.67rem; font-weight: 600; color: var(--text2); margin-bottom: 22px; }
  .home-badge-dot { width: 6px; height: 6px; background: var(--success); border-radius: 50%; }
  .home-h1 { font-size: clamp(1.8rem, 6vw, 3.2rem); font-weight: 900; line-height: 1.1; letter-spacing: -0.04em; margin-bottom: 13px; }
  .home-h1 .hl { color: var(--accent); }
  .home-sub { font-size: 0.88rem; color: var(--text2); line-height: 1.7; max-width: 400px; margin: 0 auto 30px; }
  .upload-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 38px 26px; text-align: center; max-width: 540px; margin: 0 auto; transition: border-color 0.2s; }
  .upload-card.drag { border-color: var(--accent); background: rgba(124,92,255,0.04); }
  .upload-icon { width: 56px; height: 56px; background: var(--surface2); border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 1.5rem; border: 1px solid var(--border2); }
  .upload-title { font-size: 1.05rem; font-weight: 700; margin-bottom: 7px; letter-spacing: -0.02em; }
  .upload-sub { font-size: 0.76rem; color: var(--text2); margin-bottom: 20px; line-height: 1.6; }
  .upload-btns { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .upload-hint { font-size: 0.63rem; color: var(--muted); margin-top: 13px; }
  .cam-err { background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.2); color: var(--danger); padding: 11px 14px; border-radius: var(--radius-sm); font-size: 0.74rem; margin-top: 12px; line-height: 1.5; max-width: 540px; margin-left: auto; margin-right: auto; }

  .loading-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 52vh; padding: 40px 24px; text-align: center; }
  .loader { position: relative; width: 50px; height: 50px; margin: 0 auto 20px; }
  .loader-r1 { width: 50px; height: 50px; border: 2.5px solid var(--border2); border-top-color: var(--accent); border-radius: 50%; animation: spin 1s linear infinite; }
  .loader-r2 { position: absolute; inset: 8px; border: 2px solid transparent; border-top-color: rgba(124,92,255,0.35); border-radius: 50%; animation: spin 0.7s linear infinite reverse; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-title { font-size: 1.1rem; font-weight: 800; margin-bottom: 7px; letter-spacing: -0.02em; }
  .loading-sub { font-size: 0.76rem; color: var(--text2); margin-bottom: 20px; line-height: 1.6; }
  .loading-pills { display: flex; flex-wrap: wrap; justify-content: center; gap: 5px; }
  .loading-pill { padding: 3px 11px; border-radius: 100px; background: var(--surface2); border: 1px solid var(--border); font-size: 0.63rem; font-weight: 600; color: var(--muted); transition: all 0.25s; }
  .loading-pill.active { border-color: var(--accent); color: var(--accent); background: rgba(124,92,255,0.08); }
  .loading-pill.done { color: var(--success); border-color: rgba(34,197,94,0.3); }

  .screen-label { font-size: 0.6rem; font-weight: 700; color: var(--accent); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 5px; }
  .screen-title { font-size: 1.45rem; font-weight: 900; letter-spacing: -0.04em; margin-bottom: 6px; }
  .screen-sub { font-size: 0.76rem; color: var(--text2); line-height: 1.6; margin-bottom: 20px; }

  .frame-wrap { position: relative; border-radius: var(--radius); overflow: hidden; border: 1px solid var(--border); margin-bottom: 18px; background: #000; }
  .frame-img { width: 100%; display: block; }
  .bbox { position: absolute; border: 2px solid; border-radius: 6px; cursor: pointer; animation: bboxIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards; opacity: 0; }
  @keyframes bboxIn { 0%{opacity:0;transform:scale(0.88)} 100%{opacity:1;transform:scale(1)} }
  .bbox:hover { filter: brightness(1.1); }
  .bbox-lbl { position: absolute; top: -23px; left: 0; font-size: 0.54rem; font-weight: 700; padding: 2px 8px; border-radius: 100px; white-space: nowrap; letter-spacing: 0.05em; text-transform: uppercase; color: #fff; }
  .bbox-num { position: absolute; top: -9px; right: -9px; width: 19px; height: 19px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.53rem; font-weight: 800; color: #fff; }
  .bbox.sel { box-shadow: 0 0 0 2px #fff inset; }

  .item-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; }
  .item-row { display: flex; align-items: center; gap: 11px; padding: 11px 13px; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; transition: all 0.15s; }
  .item-row:hover, .item-row.sel { border-color: rgba(124,92,255,0.3); background: rgba(124,92,255,0.04); }
  .item-thumb { width: 46px; height: 46px; border-radius: 8px; object-fit: cover; background: var(--surface3); flex-shrink: 0; }
  .item-thumb-ph { width: 46px; height: 46px; border-radius: 8px; background: var(--surface3); flex-shrink: 0; }
  .item-info { flex: 1; }
  .item-name { font-size: 0.8rem; font-weight: 700; margin-bottom: 2px; }
  .item-sub { font-size: 0.63rem; color: var(--text2); }
  .item-check { width: 21px; height: 21px; border-radius: 50%; border: 2px solid var(--border2); display: flex; align-items: center; justify-content: center; font-size: 0.6rem; flex-shrink: 0; transition: all 0.15s; }
  .item-row.sel .item-check { background: var(--success); border-color: var(--success); color: #fff; }

  .action-bar { background: var(--surface); border: 1px solid var(--border2); border-radius: var(--radius-sm); padding: 15px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .action-bar-info { flex: 1; font-size: 0.7rem; color: var(--text2); line-height: 1.5; min-width: 160px; }
  .action-bar-info strong { color: var(--text); }
  .action-bar-btns { display: flex; gap: 8px; flex-shrink: 0; flex-wrap: wrap; }

  .crop-grid { display: grid; grid-template-columns: 1fr; gap: 13px; margin-bottom: 22px; }
  @media(min-width:540px){.crop-grid{grid-template-columns:repeat(2,1fr)}}
  @media(min-width:800px){.crop-grid{grid-template-columns:repeat(3,1fr)}}
  .crop-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .crop-card-head { display: flex; align-items: center; justify-content: space-between; padding: 10px 13px; border-bottom: 1px solid var(--border); }
  .crop-card-name { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
  .crop-card-num { font-size: 0.58rem; color: var(--muted); font-family: 'DM Mono', monospace; }
  .crop-editor { position: relative; background: #07070d; touch-action: none; user-select: none; overflow: hidden; }
  .crop-bg { width: 100%; display: block; opacity: 0.24; pointer-events: none; }
  .crop-sel { position: absolute; border: 2px solid var(--accent); background: rgba(124,92,255,0.08); touch-action: none; }
  .crop-handle { position: absolute; width: 24px; height: 24px; background: var(--accent); border-radius: 5px; touch-action: none; z-index: 10; }
  @media(min-width:600px){.crop-handle{width:13px;height:13px;border-radius:3px}}
  .crop-handle.tl{top:-12px;left:-12px;cursor:nw-resize}
  .crop-handle.tr{top:-12px;right:-12px;cursor:ne-resize}
  .crop-handle.bl{bottom:-12px;left:-12px;cursor:sw-resize}
  .crop-handle.br{bottom:-12px;right:-12px;cursor:se-resize}
  @media(min-width:600px){.crop-handle.tl{top:-6px;left:-6px}.crop-handle.tr{top:-6px;right:-6px}.crop-handle.bl{bottom:-6px;left:-6px}.crop-handle.br{bottom:-6px;right:-6px}}
  .crop-prev-lbl { font-size: 0.54rem; color: var(--muted); padding: 5px 11px 2px; text-transform: uppercase; letter-spacing: 0.07em; font-weight: 600; }
  .crop-prev-img { width: 100%; max-height: 92px; object-fit: contain; background: #040408; display: block; }
  .crop-card-foot { padding: 8px 11px; display: flex; gap: 6px; }
  .skip-btn { background: transparent; color: var(--muted); border: 1px solid var(--border); font-family: 'Inter', sans-serif; font-size: 0.63rem; font-weight: 600; padding: 6px 11px; border-radius: var(--radius-xs); cursor: pointer; touch-action: manipulation; transition: all 0.15s; }
  .skip-btn:hover { border-color: rgba(239,68,68,0.4); color: var(--danger); }
  .skip-btn.skipped { border-color: rgba(239,68,68,0.3); color: var(--danger); background: rgba(239,68,68,0.05); }

  .gen-cta { background: var(--surface2); border: 1px solid var(--border2); border-radius: var(--radius-sm); padding: 20px; text-align: center; }
  .gen-cta-title { font-size: 0.98rem; font-weight: 800; margin-bottom: 5px; letter-spacing: -0.02em; }
  .gen-cta-sub { font-size: 0.72rem; color: var(--text2); margin-bottom: 15px; line-height: 1.5; }
  .gen-cta-btns { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

  .results-wrap { max-width: 1100px; margin: 0 auto; padding: 22px 18px 80px; }
  .results-hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 22px; gap: 13px; flex-wrap: wrap; }
  .results-h { font-size: 1.4rem; font-weight: 900; letter-spacing: -0.03em; }
  .results-sub { font-size: 0.68rem; color: var(--text2); margin-top: 4px; }
  .listings-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
  @media(min-width:540px){.listings-grid{grid-template-columns:repeat(2,1fr)}}
  @media(min-width:820px){.listings-grid{grid-template-columns:repeat(3,1fr)}}

  .listing-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; cursor: pointer; transition: border-color 0.15s, transform 0.15s; }
  .listing-card:hover { border-color: rgba(124,92,255,0.28); transform: translateY(-2px); }
  .listing-card.exp { grid-column: 1/-1; cursor: default; border-color: rgba(124,92,255,0.35); transform: none; }
  .lc-img-wrap { position: relative; aspect-ratio: 4/3; background: #0a0a10; overflow: hidden; }
  .lc-img { width: 100%; height: 100%; object-fit: contain; display: block; transition: transform 0.25s; }
  .listing-card:hover .lc-img { transform: scale(1.03); }
  .lc-badge { position: absolute; top: 9px; left: 9px; font-size: 0.53rem; font-weight: 700; padding: 2px 8px; border-radius: 100px; background: rgba(11,11,15,0.85); color: rgba(255,255,255,0.65); border: 1px solid var(--border2); backdrop-filter: blur(4px); letter-spacing: 0.06em; text-transform: uppercase; }
  .lc-conf { position: absolute; top: 9px; right: 9px; font-size: 0.57rem; font-weight: 700; padding: 2px 8px; border-radius: 100px; }
  .lc-count { position: absolute; bottom: 9px; right: 9px; background: rgba(11,11,15,0.85); color: var(--text2); font-size: 0.55rem; padding: 2px 7px; border-radius: 5px; font-family: 'DM Mono', monospace; backdrop-filter: blur(4px); }
  .lc-body { padding: 13px; }
  .lc-title { font-size: 0.86rem; font-weight: 700; margin-bottom: 8px; line-height: 1.3; letter-spacing: -0.01em; }
  .lc-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px; }
  .lc-tag { font-size: 0.55rem; color: var(--text2); border: 1px solid var(--border); padding: 2px 7px; border-radius: 5px; font-weight: 500; }
  .lc-tag.p { border-color: rgba(124,92,255,0.28); color: rgba(164,148,255,0.85); background: rgba(124,92,255,0.06); }
  .lc-price-row { display: flex; align-items: baseline; gap: 7px; margin-bottom: 7px; }
  .lc-price { font-size: 1.45rem; font-weight: 900; letter-spacing: -0.04em; }
  .lc-range { font-size: 0.65rem; color: var(--muted); }
  .lc-preview { font-size: 0.66rem; color: var(--text2); line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .platform-row { display: flex; gap: 5px; margin-top: 9px; flex-wrap: wrap; }
  .platform-chip { display: flex; align-items: center; gap: 4px; background: var(--surface3); border: 1px solid var(--border); padding: 2px 8px; border-radius: 5px; font-size: 0.57rem; font-weight: 600; color: var(--text2); }
  .lc-foot { display: flex; align-items: center; justify-content: space-between; padding: 10px 13px; border-top: 1px solid var(--border); gap: 6px; flex-wrap: wrap; }
  .lc-foot-hint { font-size: 0.57rem; color: var(--muted); }
  .lc-foot-btns { display: flex; gap: 5px; }
  .btn-sm { background: transparent; font-family: 'Inter', sans-serif; font-size: 0.61rem; font-weight: 700; padding: 5px 10px; border-radius: var(--radius-xs); cursor: pointer; touch-action: manipulation; transition: all 0.15s; border: 1px solid var(--border); color: var(--text2); }
  .btn-sm:hover { color: var(--text); border-color: var(--border2); }
  .btn-sm.del { color: rgba(239,68,68,0.6); border-color: rgba(239,68,68,0.15); }
  .btn-sm.del:hover { color: var(--danger); border-color: rgba(239,68,68,0.35); }

  .exp-inner { display: grid; grid-template-columns: 1fr; gap: 20px; padding: 17px; }
  @media(min-width:640px){.exp-inner{grid-template-columns:275px 1fr;padding:22px;gap:30px}}
  .exp-img { width: 100%; border-radius: var(--radius-sm); border: 1px solid var(--border); object-fit: contain; background: #0a0a10; max-height: 215px; cursor: pointer; }
  .media-sec { margin-top: 13px; }
  .media-lbl { font-size: 0.55rem; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px; font-weight: 700; }
  .media-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
  .media-tw { position: relative; width: 54px; height: 54px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); flex-shrink: 0; background: #0a0a10; }
  .media-th { width: 100%; height: 100%; object-fit: cover; cursor: pointer; display: block; }
  .media-vid { width: 100%; height: 100%; object-fit: cover; cursor: pointer; display: block; }
  .media-rm { position: absolute; top: 2px; right: 2px; width: 16px; height: 16px; background: rgba(11,11,15,0.9); color: #fff; border: none; border-radius: 50%; font-size: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .vid-badge { position: absolute; bottom: 2px; left: 2px; background: rgba(11,11,15,0.85); color: var(--accent); font-size: 0.42rem; padding: 1px 4px; border-radius: 3px; font-weight: 700; }
  .add-row { display: flex; gap: 6px; flex-wrap: wrap; }
  .add-btn { display: flex; align-items: center; gap: 4px; background: var(--surface2); border: 1px dashed var(--border2); color: var(--muted); font-family: 'Inter', sans-serif; font-size: 0.63rem; font-weight: 600; padding: 6px 11px; border-radius: var(--radius-xs); cursor: pointer; touch-action: manipulation; transition: all 0.15s; white-space: nowrap; }
  .add-btn:hover { border-color: var(--accent); color: var(--accent); }
  .id-sec { margin-top: 13px; }
  .id-lbl { font-size: 0.55rem; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 6px; font-weight: 700; display: flex; align-items: center; gap: 6px; }
  .id-row { display: flex; align-items: flex-start; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--border); }
  .id-row:last-child { border-bottom: none; }
  .id-n { font-size: 0.55rem; color: var(--muted); width: 16px; font-family: 'DM Mono', monospace; flex-shrink: 0; }
  .id-name { flex: 1; font-size: 0.67rem; font-weight: 600; line-height: 1.4; }
  .id-conf { font-size: 0.55rem; color: var(--muted); flex-shrink: 0; }
  .reason-box { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-xs); padding: 6px 10px; font-size: 0.59rem; color: var(--text2); line-height: 1.6; margin-top: 3px; }
  .gv-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 0.59rem; color: var(--success); font-weight: 700; margin-top: 4px; }
  .meta-row { font-size: 0.63rem; color: var(--text2); margin-top: 4px; line-height: 1.5; }
  .meta-row span { color: rgba(164,148,255,0.85); font-weight: 600; }

  .f-lbl { font-size: 0.57rem; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 5px; margin-top: 15px; font-weight: 700; display: flex; align-items: center; justify-content: space-between; }
  .f-lbl:first-child { margin-top: 0; }
  .f-input { width: 100%; background: var(--surface2); border: 1px solid var(--border); color: var(--text); font-family: 'Inter', sans-serif; font-size: 0.88rem; font-weight: 700; padding: 10px 12px; border-radius: var(--radius-sm); outline: none; -webkit-appearance: none; transition: border-color 0.15s; letter-spacing: -0.02em; }
  .f-input:focus { border-color: rgba(124,92,255,0.45); }
  .f-price { width: 135px; font-size: 1.3rem; font-weight: 900; letter-spacing: -0.04em; }
  .f-price-meta { font-size: 0.59rem; color: var(--muted); margin-top: 3px; }
  .f-textarea { width: 100%; background: var(--surface2); border: 1px solid var(--border); color: var(--text); font-family: 'DM Mono', monospace; font-size: 0.66rem; line-height: 1.7; padding: 10px 12px; border-radius: var(--radius-sm); resize: vertical; outline: none; min-height: 148px; -webkit-appearance: none; transition: border-color 0.15s; }
  .f-textarea:focus { border-color: rgba(124,92,255,0.45); }
  .tone-row { display: flex; justify-content: space-between; font-size: 0.57rem; color: var(--muted); font-weight: 600; margin-bottom: 6px; }
  .tone-slider { width: 100%; -webkit-appearance: none; appearance: none; height: 3px; border-radius: 2px; background: linear-gradient(90deg, var(--success), var(--accent), var(--warning)); outline: none; cursor: pointer; }
  .tone-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 6px rgba(0,0,0,0.35); cursor: pointer; }
  .tone-lbl { text-align: center; font-size: 0.63rem; color: var(--accent); font-weight: 700; margin-top: 4px; }
  .tools-row { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
  .tool-btn { display: flex; align-items: center; gap: 4px; background: var(--surface2); border: 1px solid var(--border2); color: var(--text2); font-family: 'Inter', sans-serif; font-size: 0.63rem; font-weight: 600; padding: 6px 11px; border-radius: var(--radius-xs); cursor: pointer; touch-action: manipulation; transition: all 0.15s; white-space: nowrap; }
  .tool-btn:hover { border-color: var(--accent); color: var(--accent); }
  .tool-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .seo-tog { display: flex; align-items: center; gap: 6px; }
  .tog { position: relative; width: 30px; height: 17px; background: var(--border2); border-radius: 100px; cursor: pointer; transition: background 0.15s; flex-shrink: 0; }
  .tog.on { background: var(--accent); }
  .tog::after { content: ''; position: absolute; top: 3px; left: 3px; width: 11px; height: 11px; background: #fff; border-radius: 50%; transition: transform 0.15s; }
  .tog.on::after { transform: translateX(13px); }
  .exp-acts { display: flex; gap: 7px; margin-top: 15px; flex-wrap: wrap; }
  .btn-copy { background: var(--accent); color: #fff; font-family: 'Inter', sans-serif; font-size: 0.76rem; font-weight: 700; padding: 11px 17px; border-radius: var(--radius-sm); border: none; cursor: pointer; touch-action: manipulation; flex: 1; text-align: center; min-width: 88px; transition: background 0.15s; }
  .btn-copy:hover { background: var(--accent-h); }
  .btn-dl { background: var(--surface2); color: var(--text); font-family: 'Inter', sans-serif; font-size: 0.76rem; font-weight: 600; padding: 11px 15px; border-radius: var(--radius-sm); border: 1px solid var(--border2); cursor: pointer; touch-action: manipulation; flex: 1; text-align: center; min-width: 88px; transition: border-color 0.15s; }
  .btn-dl:hover { border-color: rgba(124,92,255,0.35); }
  .btn-dl:disabled { opacity: 0.45; cursor: not-allowed; }
  .btn-collapse { background: transparent; color: var(--muted); border: 1px solid var(--border); font-family: 'Inter', sans-serif; font-size: 0.73rem; font-weight: 500; padding: 11px 13px; border-radius: var(--radius-sm); cursor: pointer; touch-action: manipulation; transition: all 0.15s; }
  .btn-collapse:hover { color: var(--text); }
  .btn-delete { background: transparent; color: rgba(239,68,68,0.62); border: 1px solid rgba(239,68,68,0.15); font-family: 'Inter', sans-serif; font-size: 0.73rem; font-weight: 500; padding: 11px 13px; border-radius: var(--radius-sm); cursor: pointer; touch-action: manipulation; transition: all 0.15s; }
  .btn-delete:hover { color: var(--danger); border-color: rgba(239,68,68,0.35); }
  .pkg-note { font-size: 0.57rem; color: var(--muted); margin-top: 8px; line-height: 1.6; }

  .post-wrap { max-width: 580px; margin: 0 auto; padding: 30px 18px 80px; }
  .post-hdr { text-align: center; margin-bottom: 28px; }
  .post-h { font-size: 1.5rem; font-weight: 900; letter-spacing: -0.04em; margin-bottom: 7px; }
  .post-sub { font-size: 0.76rem; color: var(--text2); }
  .p-cards { display: flex; flex-direction: column; gap: 10px; margin-bottom: 22px; }
  .p-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 15px; display: flex; align-items: center; gap: 12px; transition: border-color 0.15s; }
  .p-card.posting { border-color: rgba(124,92,255,0.3); }
  .p-icon { width: 40px; height: 40px; border-radius: 11px; display: flex; align-items: center; justify-content: center; font-size: 1.15rem; flex-shrink: 0; }
  .p-info { flex: 1; }
  .p-name { font-size: 0.86rem; font-weight: 700; margin-bottom: 2px; letter-spacing: -0.01em; }
  .p-desc { font-size: 0.63rem; color: var(--text2); }
  .p-status { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
  .p-badge { font-size: 0.57rem; font-weight: 700; padding: 2px 8px; border-radius: 100px; }
  .p-badge.ready { background: rgba(34,197,94,0.1); color: var(--success); border: 1px solid rgba(34,197,94,0.2); }
  .p-badge.posting { background: rgba(124,92,255,0.1); color: var(--accent); border: 1px solid rgba(124,92,255,0.2); }
  .p-badge.done { background: rgba(34,197,94,0.1); color: var(--success); border: 1px solid rgba(34,197,94,0.2); }
  .p-bar-wrap { width: 65px; height: 3px; background: var(--border); border-radius: 2px; overflow: hidden; }
  .p-bar { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.4s ease; }
  .post-btn { width: 100%; background: var(--accent); color: #fff; font-family: 'Inter', sans-serif; font-size: 0.93rem; font-weight: 800; padding: 15px; border-radius: var(--radius-sm); border: none; cursor: pointer; touch-action: manipulation; transition: background 0.15s; }
  .post-btn:hover { background: var(--accent-h); }
  .post-btn:disabled { opacity: 0.45; cursor: not-allowed; }

  .dash-wrap { max-width: 1000px; margin: 0 auto; padding: 22px 18px 80px; }
  .dash-stats { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; margin-bottom: 20px; }
  @media(min-width:600px){.dash-stats{grid-template-columns:repeat(4,1fr)}}
  .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 15px; }
  .stat-lbl { font-size: 0.57rem; color: var(--muted); font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 6px; }
  .stat-val { font-size: 1.55rem; font-weight: 900; letter-spacing: -0.04em; }
  .stat-val.g { color: var(--success); }
  .stat-val.p { color: var(--accent); }
  .stat-sub { font-size: 0.59rem; color: var(--text2); margin-top: 2px; }
  .dash-sec { font-size: 0.86rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 11px; }
  .insights { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
  .insight { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px 14px; display: flex; align-items: center; gap: 11px; }
  .insight-icon { width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0; }
  .insight-body { flex: 1; }
  .insight-title { font-size: 0.76rem; font-weight: 700; margin-bottom: 2px; }
  .insight-sub { font-size: 0.61rem; color: var(--text2); }
  .insight-btn { font-size: 0.63rem; font-weight: 700; color: var(--accent); background: rgba(124,92,255,0.1); border: 1px solid rgba(124,92,255,0.2); padding: 4px 10px; border-radius: var(--radius-xs); cursor: pointer; white-space: nowrap; touch-action: manipulation; }
  .dash-list { display: flex; flex-direction: column; gap: 8px; }
  .dash-row { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 13px; display: flex; align-items: center; gap: 10px; }
  .dash-thumb { width: 42px; height: 42px; border-radius: 8px; object-fit: cover; background: var(--surface3); flex-shrink: 0; }
  .dash-info { flex: 1; }
  .dash-t { font-size: 0.76rem; font-weight: 700; margin-bottom: 2px; }
  .dash-m { font-size: 0.59rem; color: var(--text2); }
  .dash-price { font-size: 0.98rem; font-weight: 900; letter-spacing: -0.02em; }
  .dash-empty { text-align: center; padding: 34px 20px; color: var(--muted); font-size: 0.76rem; }

  .lightbox { position: fixed; inset: 0; background: rgba(4,4,8,0.97); z-index: 500; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .lb-img { max-width: 100%; max-height: 90vh; border-radius: var(--radius-sm); object-fit: contain; }
  .lb-video { max-width: 100%; max-height: 90vh; border-radius: var(--radius-sm); }
  .lb-close { position: absolute; top: 15px; right: 15px; background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.12); font-size: 0.88rem; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .err-box { background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.2); color: var(--danger); padding: 10px 13px; border-radius: var(--radius-sm); font-size: 0.72rem; margin-top: 12px; line-height: 1.5; }
  .empty-state { text-align: center; padding: 68px 24px; }
  .empty-icon { font-size: 2.6rem; margin-bottom: 13px; }
  .empty-title { font-size: 1.05rem; font-weight: 800; margin-bottom: 7px; letter-spacing: -0.02em; }
  .empty-sub { font-size: 0.76rem; color: var(--text2); margin-bottom: 20px; }
`;

const BBOX_COLORS = [
  {border:"#7c5cff",bg:"rgba(124,92,255,0.18)"},
  {border:"#ec4899",bg:"rgba(236,72,153,0.18)"},
  {border:"#22c55e",bg:"rgba(34,197,94,0.18)"},
  {border:"#f59e0b",bg:"rgba(245,158,11,0.18)"},
  {border:"#3b82f6",bg:"rgba(59,130,246,0.18)"},
  {border:"#ef4444",bg:"rgba(239,68,68,0.18)"},
  {border:"#8b5cf6",bg:"rgba(139,92,246,0.18)"},
  {border:"#10b981",bg:"rgba(16,185,129,0.18)"},
];

const PLATFORMS = [
  {id:"ebay",name:"eBay",icon:"🛒",desc:"Electronics, collectibles, branded items",color:"#e53238"},
  {id:"facebook",name:"Facebook Marketplace",icon:"📘",desc:"Furniture, local pickup, general items",color:"#1877f2"},
  {id:"offerup",name:"OfferUp",icon:"🟠",desc:"Quick local sales, all categories",color:"#ff5a35"},
];

function StepBar({step}) {
  const steps = ["Scan","Review","Crop","Generate"];
  return (
    <div className="step-bar">
      {steps.map((s,i) => {
        const st = i<step?"done":i===step?"active":"pending";
        return (
          <div key={s} className="step-item">
            <div className={`step-dot ${st}`}>{st==="done"?"✓":i+1}</div>
            <div className={`step-text ${st}`}>{s}</div>
            {i<steps.length-1&&<div className="step-arrow">›</div>}
          </div>
        );
      })}
    </div>
  );
}

function compressImage(file) {
  return new Promise(res => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const max=1600; let {width:w,height:h}=img;
        if(w>max||h>max){const r=Math.min(max/w,max/h);w=Math.round(w*r);h=Math.round(h*r);}
        const c=document.createElement("canvas");c.width=w;c.height=h;
        c.getContext("2d").drawImage(img,0,0,w,h);
        const url=c.toDataURL("image/jpeg",0.85);
        res({dataUrl:url,name:file.name,size:(url.length/1024).toFixed(1)+" KB"});
      };
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function cropCanvas(imgEl,box) {
  const{x,y,w,h}=box,p=0.03;
  const sx=Math.max(0,x-w*p),sy=Math.max(0,y-h*p);
  const sw=Math.min(imgEl.naturalWidth-sx,w*(1+p*2));
  const sh=Math.min(imgEl.naturalHeight-sy,h*(1+p*2));
  const sc=2,cc=document.createElement("canvas");
  cc.width=sw*sc;cc.height=sh*sc;
  const cx=cc.getContext("2d");cx.imageSmoothingEnabled=true;cx.imageSmoothingQuality="high";
  cx.drawImage(imgEl,sx,sy,sw,sh,0,0,sw*sc,sh*sc);
  const id=cx.getImageData(0,0,cc.width,cc.height),d=id.data;
  let mnR=255,mxR=0,mnG=255,mxG=0,mnB=255,mxB=0;
  for(let i=0;i<d.length;i+=4){mnR=Math.min(mnR,d[i]);mxR=Math.max(mxR,d[i]);mnG=Math.min(mnG,d[i+1]);mxG=Math.max(mxG,d[i+1]);mnB=Math.min(mnB,d[i+2]);mxB=Math.max(mxB,d[i+2]);}
  for(let i=0;i<d.length;i+=4){d[i]=Math.min(255,((d[i]-mnR)/(mxR-mnR||1))*255);d[i+1]=Math.min(255,((d[i+1]-mnG)/(mxG-mnG||1))*255);d[i+2]=Math.min(255,((d[i+2]-mnB)/(mxB-mnB||1))*255);}
  const s2=new Uint8ClampedArray(d.length),W=cc.width,H=cc.height,st=0.4;
  for(let y2=0;y2<H;y2++)for(let x2=0;x2<W;x2++){const idx=(y2*W+x2)*4;for(let c2=0;c2<3;c2++){let bl=0,ct=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const ny=y2+dy,nx=x2+dx;if(ny>=0&&ny<H&&nx>=0&&nx<W){bl+=d[(ny*W+nx)*4+c2];ct++;}}bl/=ct;s2[idx+c2]=Math.min(255,Math.max(0,d[idx+c2]+st*(d[idx+c2]-bl)));}s2[idx+3]=d[idx+3];}
  cx.putImageData(new ImageData(s2,W,H),0,0);
  const oc=document.createElement("canvas");oc.width=Math.round(sw);oc.height=Math.round(sh);
  const ox=oc.getContext("2d");ox.imageSmoothingEnabled=true;ox.imageSmoothingQuality="high";
  ox.drawImage(cc,0,0,oc.width,oc.height);
  return oc.toDataURL("image/jpeg",0.95);
}

function hiResCrop(imgEl,box) {
  const{x,y,w,h}=box,p=0.03;
  const sx=Math.max(0,x-w*p),sy=Math.max(0,y-h*p);
  const sw=Math.min(imgEl.naturalWidth-sx,w*(1+p*2));
  const sh=Math.min(imgEl.naturalHeight-sy,h*(1+p*2));
  const c=document.createElement("canvas");c.width=Math.round(sw*3);c.height=Math.round(sh*3);
  const ctx=c.getContext("2d");ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
  ctx.drawImage(imgEl,sx,sy,sw,sh,0,0,c.width,c.height);
  return c.toDataURL("image/jpeg",0.99).split(",")[1];
}

function getPos(e) {
  if(e.touches&&e.touches.length>0)return{clientX:e.touches[0].clientX,clientY:e.touches[0].clientY};
  if(e.changedTouches&&e.changedTouches.length>0)return{clientX:e.changedTouches[0].clientX,clientY:e.changedTouches[0].clientY};
  return{clientX:e.clientX,clientY:e.clientY};
}

function toBlob(dataUrl) {
  const[h,d]=dataUrl.split(","),mime=h.match(/:(.*?);/)[1];
  const bin=atob(d),arr=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
  return new Blob([arr],{type:mime});
}

function confColor(s) {
  if(s>=80)return{bg:"rgba(34,197,94,0.12)",color:"#22c55e"};
  if(s>=60)return{bg:"rgba(245,158,11,0.12)",color:"#f59e0b"};
  return{bg:"rgba(239,68,68,0.12)",color:"#ef4444"};
}

function CropEditor({src,box,onChange}) {
  const ref=useRef(),drag=useRef(null),raf=useRef(null);
  const rel=(cx,cy)=>{const r=ref.current.getBoundingClientRect();return{x:(cx-r.left)/r.width,y:(cy-r.top)/r.height};};
  const start=(e,type)=>{
    e.preventDefault();e.stopPropagation();
    const{clientX,clientY}=getPos(e);
    drag.current={type,...rel(clientX,clientY),box:{...box}};
    window.addEventListener("mousemove",move,{passive:false});window.addEventListener("mouseup",stop);
    window.addEventListener("touchmove",move,{passive:false});window.addEventListener("touchend",stop);
  };
  const move=e=>{
    if(!drag.current)return;e.preventDefault();
    const{clientX,clientY}=getPos(e);
    if(raf.current)cancelAnimationFrame(raf.current);
    raf.current=requestAnimationFrame(()=>{
      if(!drag.current||!ref.current)return;
      const r=rel(clientX,clientY),{type,x:sx,y:sy,box:b}=drag.current;
      const dx=r.x-sx,dy=r.y-sy;let{x,y,w,h}=b;const mn=0.06;
      if(type==="move"){x=Math.max(0,Math.min(1-w,x+dx));y=Math.max(0,Math.min(1-h,y+dy));}
      else if(type==="br"){w=Math.max(mn,Math.min(1-x,w+dx));h=Math.max(mn,Math.min(1-y,h+dy));}
      else if(type==="tl"){const nx=Math.max(0,Math.min(x+w-mn,x+dx)),ny=Math.max(0,Math.min(y+h-mn,y+dy));w=w+(x-nx);h=h+(y-ny);x=nx;y=ny;}
      else if(type==="tr"){const ny=Math.max(0,Math.min(y+h-mn,y+dy));w=Math.max(mn,Math.min(1-x,w+dx));h=h+(y-ny);y=ny;}
      else if(type==="bl"){const nx=Math.max(0,Math.min(x+w-mn,x+dx));w=w+(x-nx);x=nx;h=Math.max(mn,Math.min(1-y,h+dy));}
      drag.current.box={x,y,w,h};drag.current.x=r.x;drag.current.y=r.y;
      onChange({x,y,w,h});
    });
  };
  const stop=()=>{
    drag.current=null;if(raf.current)cancelAnimationFrame(raf.current);
    window.removeEventListener("mousemove",move);window.removeEventListener("mouseup",stop);
    window.removeEventListener("touchmove",move);window.removeEventListener("touchend",stop);
  };
  const p=v=>(v*100).toFixed(2)+"%";
  return(
    <div ref={ref} className="crop-editor">
      <img src={src} className="crop-bg" alt="" draggable={false}/>
      <div className="crop-sel" style={{left:p(box.x),top:p(box.y),width:p(box.w),height:p(box.h)}}
        onMouseDown={e=>start(e,"move")} onTouchStart={e=>start(e,"move")}>
        <div className="crop-handle tl" onMouseDown={e=>start(e,"tl")} onTouchStart={e=>start(e,"tl")}/>
        <div className="crop-handle tr" onMouseDown={e=>start(e,"tr")} onTouchStart={e=>start(e,"tr")}/>
        <div className="crop-handle bl" onMouseDown={e=>start(e,"bl")} onTouchStart={e=>start(e,"bl")}/>
        <div className="crop-handle br" onMouseDown={e=>start(e,"br")} onTouchStart={e=>start(e,"br")}/>
      </div>
    </div>
  );
}

export default function App() {
  const[tab,setTab]=useState("scan");
  const[phase,setPhase]=useState("home");
  const[camOn,setCamOn]=useState(false);
  const[captured,setCaptured]=useState(null);
  const[loadStep,setLoadStep]=useState(0);
  const[objects,setObjects]=useState([]);
  const[boxes,setBoxes]=useState([]);
  const[skipped,setSkipped]=useState([]);
  const[previews,setPreviews]=useState([]);
  const[selected,setSelected]=useState([]);
  const[items,setItems]=useState([]);
  const[expanded,setExpanded]=useState(null);
  const[error,setError]=useState(null);
  const[dragOver,setDragOver]=useState(false);
  const[copied,setCopied]=useState(null);
  const[downloading,setDownloading]=useState(null);
  const[lightbox,setLightbox]=useState(null);
  const[tones,setTones]=useState({});
  const[seo,setSeo]=useState({});
  const[rewriting,setRewriting]=useState(null);
  const[postStatus,setPostStatus]=useState({});
  const[postProg,setPostProg]=useState({});
  const[posting,setPosting]=useState(false);
  const[camErr,setCamErr]=useState(null);

  const videoRef=useRef(null),streamRef=useRef(null);
  const camInputRef=useRef(),galleryRef=useRef();
  const photoRefs=useRef({}),vidRefs=useRef({});

  const startCam=useCallback(async()=>{
    setCamErr(null);setCamOn(true);
    await new Promise(r=>setTimeout(r,200));
    const v=videoRef.current;
    if(!v){setCamErr("Camera unavailable. Please upload a photo instead.");setCamOn(false);return;}
    let stream;
    try{
      try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}}});}
      catch{stream=await navigator.mediaDevices.getUserMedia({video:true});}
    }catch(err){
      const msgs={NotAllowedError:"Camera permission denied. Allow access in browser settings.",NotFoundError:"No camera found. Please upload a photo instead.",NotReadableError:"Camera in use by another app."};
      setCamErr(msgs[err.name]||"Camera error. Please upload a photo instead.");setCamOn(false);return;
    }
    streamRef.current=stream;v.srcObject=stream;v.muted=true;
    v.setAttribute("muted","");v.setAttribute("playsinline","");v.setAttribute("webkit-playsinline","");
    try{await v.play();}catch{}
  },[]);

  const stopCam=useCallback(()=>{
    if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop());streamRef.current=null;}
    if(videoRef.current)videoRef.current.srcObject=null;
    setCamOn(false);
  },[]);

  const capture=useCallback(()=>{
    const v=videoRef.current;if(!v||!streamRef.current)return;
    const c=document.createElement("canvas");c.width=v.videoWidth||1280;c.height=v.videoHeight||720;
    c.getContext("2d").drawImage(v,0,0,c.width,c.height);
    const url=c.toDataURL("image/jpeg",0.92);stopCam();
    const img={dataUrl:url,name:"capture.jpg",size:(url.length/1024).toFixed(1)+" KB"};
    setCaptured(img);detect(url);
  },[stopCam]);

  useEffect(()=>{return()=>stopCam();},[stopCam]);

  const handleFile=useCallback(async file=>{
    if(!file||!file.type.startsWith("image/"))return;
    stopCam();const c=await compressImage(file);
    setCaptured(c);setError(null);detect(c.dataUrl);
  },[stopCam]);

  const onDrop=useCallback(e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0]);},[handleFile]);

  const detect=async dataUrl=>{
    setPhase("loading");setLoadStep(1);setError(null);
    try{
      const b64=dataUrl.split(",")[1],mt=dataUrl.split(";")[0].split(":")[1];
      const res=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({imageBase64:b64,mediaType:mt,mode:"detect"})});
      const data=await res.json();if(data.error)throw new Error(data.error);
      setObjects(data.objects);setBoxes(data.objects.map(o=>({x:o.xFrac,y:o.yFrac,w:o.wFrac,h:o.hFrac})));
      setSkipped([]);setSelected(data.objects.map((_,i)=>i));
      setLoadStep(2);setPhase("review");
    }catch(err){setError(err.message);setPhase("home");}
  };

  useEffect(()=>{
    if((phase!=="review"&&phase!=="crop")||!captured)return;
    const img=new Image();
    img.onload=()=>{
      const nw=img.naturalWidth,nh=img.naturalHeight;
      setPreviews(boxes.map(b=>cropCanvas(img,{x:b.x*nw,y:b.y*nh,w:b.w*nw,h:b.h*nh})));
    };
    img.src=captured.dataUrl;
  },[boxes,phase,captured]);

  const generate=async()=>{
    setPhase("loading");setLoadStep(3);if(!captured)return;
    const tmp=new Image();tmp.src=captured.dataUrl;
    await new Promise(r=>{tmp.onload=r;if(tmp.complete)r();});
    const nw=tmp.naturalWidth,nh=tmp.naturalHeight;
    try{
      const active=objects.map((_,i)=>i).filter(i=>!skipped.includes(i)&&selected.includes(i));
      const results=await Promise.all(active.map(async i=>{
        const obj=objects[i],b=boxes[i];
        const px={x:b.x*nw,y:b.y*nh,w:b.w*nw,h:b.h*nh};
        const cd=cropCanvas(tmp,px);
        const res=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({imageBase64:cd.split(",")[1],mediaType:"image/jpeg",mode:"list",label:obj.label,highResBase64:hiResCrop(tmp,px)})});
        const data=await res.json();
        return{id:i,label:obj.label,cropDataUrl:cd,extraPhotos:[],video:null,...(data.error?{title:obj.label,priceSuggested:20,priceMin:10,priceMax:40,listing:"Unable to generate listing.",identifications:[{name:obj.label,confidence:"medium"}],confidenceScore:0,tags:[]}:data)};
      }));
      setLoadStep(4);await new Promise(r=>setTimeout(r,300));
      setItems(results);setPhase("results");
    }catch(err){setError(err.message);setPhase("crop");}
  };

  const rewrite=async id=>{
    const item=items.find(it=>it.id===id);if(!item)return;setRewriting(id);
    try{
      const tv=tones[id]!==undefined?tones[id]:50,tone=tv<33?"fast":tv>66?"profit":"balanced";
      const res=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"rewrite",currentTitle:item.title,currentListing:item.listing,rewriteTone:tone})});
      const data=await res.json();
      if(data.title)updItem(id,"title",data.title);if(data.listing)updItem(id,"listing",data.listing);
    }catch(e){console.error(e);}
    setRewriting(null);
  };

  const simulatePost=async()=>{
    if(!items.length)return;setPosting(true);
    const ns={},np={};PLATFORMS.forEach(p=>{ns[p.id]="posting";np[p.id]=0;});
    setPostStatus(ns);setPostProg(np);
    for(const pl of PLATFORMS){
      for(let i=0;i<=100;i+=10){await new Promise(r=>setTimeout(r,110));setPostProg(prev=>({...prev,[pl.id]:i}));}
      await new Promise(r=>setTimeout(r,180));setPostStatus(prev=>({...prev,[pl.id]:"done"}));
    }
    setPosting(false);
  };

  const addPhotos=(id,files)=>{Array.from(files).filter(f=>f.type.startsWith("image/")).forEach(f=>{const r=new FileReader();r.onload=e=>setItems(prev=>prev.map(it=>it.id===id?{...it,extraPhotos:[...(it.extraPhotos||[]),{dataUrl:e.target.result,name:f.name}]}:it));r.readAsDataURL(f);});};
  const addVideo=(id,f)=>{if(!f||!f.type.startsWith("video/"))return;setItems(prev=>prev.map(it=>it.id===id?{...it,video:{url:URL.createObjectURL(f),name:f.name}}:it));};
  const rmPhoto=(id,pi)=>setItems(prev=>prev.map(it=>it.id===id?{...it,extraPhotos:it.extraPhotos.filter((_,i)=>i!==pi)}:it));
  const rmVideo=id=>setItems(prev=>prev.map(it=>it.id===id?{...it,video:null}:it));
  const delItem=id=>{setItems(prev=>prev.filter(it=>it.id!==id));if(expanded===id)setExpanded(null);};
  const updItem=(id,f,v)=>setItems(prev=>prev.map(it=>it.id===id?{...it,[f]:v}:it));
  const copyListing=item=>{navigator.clipboard.writeText(`${item.title}\n\nPrice: $${item.priceSuggested}\n\n${item.listing}`).then(()=>{setCopied(item.id);setTimeout(()=>setCopied(null),1800);});};
  const toggleSel=i=>setSelected(prev=>prev.includes(i)?prev.filter(x=>x!==i):[...prev,i]);
  const toggleSkip=i=>setSkipped(prev=>prev.includes(i)?prev.filter(x=>x!==i):[...prev,i]);
  const updBox=(i,b)=>setBoxes(prev=>prev.map((bx,idx)=>idx===i?b:bx));
  const reset=()=>{stopCam();setCaptured(null);setItems([]);setPhase("home");setError(null);setExpanded(null);setObjects([]);setBoxes([]);setSkipped([]);setSelected([]);setCamErr(null);};
  const toneLabel=v=>v<33?"⚡ Sell Fast":v>66?"💰 Max Profit":"⚖️ Balanced";
  const total=items.reduce((s,it)=>s+(parseFloat(it.priceSuggested)||0),0);
  const loadSteps=["Uploading","Detecting","Ready","Generating","Done!"];
  const activeCount=selected.filter(i=>!skipped.includes(i)).length;

  const dlPackage=async item=>{
    setDownloading(item.id);
    try{
      const zip=new JSZip(),folder=zip.folder(item.title.replace(/[^a-z0-9]/gi,"_").slice(0,40));
      const txt=[`TITLE: ${item.title}`,`PRICE: $${item.priceSuggested} ($${item.priceMin}-$${item.priceMax})`,item.confidenceScore?`CONFIDENCE: ${item.confidenceScore}%`:"",item.condition?`CONDITION: ${item.condition}`:"",`\nTAGS: ${(item.tags||[]).join(", ")}`,`\nDESCRIPTION:\n${item.listing}`].filter(Boolean).join("\n");
      folder.file("listing.txt",txt);folder.file("photo_main.jpg",toBlob(item.cropDataUrl));
      (item.extraPhotos||[]).forEach((p,i)=>folder.file(`photo_${i+2}.${p.name.split(".").pop()||"jpg"}`,toBlob(p.dataUrl)));
      if(item.video){const vb=await fetch(item.video.url).then(r=>r.blob());folder.file(`video.${item.video.name.split(".").pop()||"mp4"}`,vb);}
      const blob=await zip.generateAsync({type:"blob"});
      const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`${item.title.replace(/[^a-z0-9]/gi,"_").slice(0,40)}.zip`;a.click();
    }catch(e){console.error(e);}
    setDownloading(null);
  };

  const renderCard=item=>{
    const isExp=expanded===item.id,tm=1+(item.extraPhotos?.length||0)+(item.video?1:0);
    const cc=item.confidenceScore?confColor(item.confidenceScore):null,tv=tones[item.id]!==undefined?tones[item.id]:50;
    return(
      <div key={item.id} className={`listing-card${isExp?" exp":""}`} onClick={()=>!isExp&&setExpanded(item.id)}>
        {!isExp?(
          <>
            <div className="lc-img-wrap">
              <img className="lc-img" src={item.cropDataUrl} alt={item.label}/>
              <div className="lc-badge">{item.label}</div>
              {cc&&<div className="lc-conf" style={{background:cc.bg,color:cc.color}}>{item.confidenceScore}%</div>}
              <div className="lc-count">#{item.id+1} · {tm} photo{tm!==1?"s":""}</div>
            </div>
            <div className="lc-body">
              <div className="lc-title">{item.title}</div>
              <div className="lc-tags">
                {item.identifications?.slice(0,2).map((d,i)=><span key={i} className={`lc-tag${i===0?" p":""}`}>{d.name}</span>)}
                {(item.tags||[]).slice(0,2).map((t,i)=><span key={`t${i}`} className="lc-tag">{t}</span>)}
              </div>
              <div className="lc-price-row"><div className="lc-price">${item.priceSuggested}</div><div className="lc-range">${item.priceMin}–${item.priceMax}</div></div>
              <div className="lc-preview">{item.listing}</div>
              <div className="platform-row">{PLATFORMS.map(p=><div key={p.id} className="platform-chip">{p.icon} {p.name.split(" ")[0]}</div>)}</div>
            </div>
            <div className="lc-foot">
              <span className="lc-foot-hint">Tap to edit</span>
              <div className="lc-foot-btns">
                <button className="btn-sm" onClick={e=>{e.stopPropagation();copyListing(item);}}>{copied===item.id?"✓":"Copy"}</button>
                <button className="btn-sm del" onClick={e=>{e.stopPropagation();delItem(item.id);}}>Delete</button>
              </div>
            </div>
          </>
        ):(
          <div className="exp-inner">
            <div>
              <img className="exp-img" src={item.cropDataUrl} alt={item.label} onClick={()=>setLightbox({type:"image",src:item.cropDataUrl})}/>
              <div className="media-sec">
                <div className="media-lbl">Photos & Video ({tm})</div>
                <div className="media-row">
                  {(item.extraPhotos||[]).map((ph,pi)=>(
                    <div className="media-tw" key={pi}>
                      <img className="media-th" src={ph.dataUrl} alt="" onClick={()=>setLightbox({type:"image",src:ph.dataUrl})}/>
                      <button className="media-rm" onClick={()=>rmPhoto(item.id,pi)}>✕</button>
                    </div>
                  ))}
                  {item.video&&(<div className="media-tw"><video className="media-vid" src={item.video.url} muted playsInline onClick={()=>setLightbox({type:"video",src:item.video.url})}/><div className="vid-badge">VID</div><button className="media-rm" onClick={()=>rmVideo(item.id)}>✕</button></div>)}
                </div>
                <div className="add-row">
                  <button className="add-btn" onClick={()=>photoRefs.current[item.id]?.click()}>+ Photos</button>
                  <input ref={el=>photoRefs.current[item.id]=el} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>addPhotos(item.id,e.target.files)}/>
                  {!item.video&&<button className="add-btn" onClick={()=>vidRefs.current[item.id]?.click()}>+ Video</button>}
                  <input ref={el=>vidRefs.current[item.id]=el} type="file" accept="video/*" style={{display:"none"}} onChange={e=>addVideo(item.id,e.target.files[0])}/>
                </div>
              </div>
              <div className="id-sec">
                <div className="id-lbl">AI ID {cc&&<span style={{color:cc.color}}>{item.confidenceScore}%</span>}{item.googleVerified&&<span className="gv-badge">✓ Google</span>}</div>
                {item.identifications?.map((d,i)=>(
                  <div key={i}><div className="id-row"><span className="id-n">{i+1}</span><span className="id-name">{d.name}</span><span className="id-conf">{d.confidence}</span></div>
                  {d.reasoning&&<div className="reason-box">{d.reasoning}</div>}</div>
                ))}
              </div>
              {item.condition&&<div className="meta-row">{item.condition}</div>}
              {item.materials&&<div className="meta-row">Materials: <span>{item.materials}</span></div>}
              {item.estimatedDimensions&&<div className="meta-row">Size: <span>{item.estimatedDimensions}</span></div>}
            </div>
            <div>
              <div className="f-lbl">Title</div>
              <input className="f-input" value={item.title} onChange={e=>updItem(item.id,"title",e.target.value)}/>
              <div className="f-lbl">Price</div>
              <input className="f-input f-price" value={item.priceSuggested} onChange={e=>updItem(item.id,"priceSuggested",e.target.value)}/>
              <div className="f-price-meta">Range: ${item.priceMin} – ${item.priceMax}</div>
              <div style={{marginTop:13}}>
                <div className="f-lbl">Pricing Strategy</div>
                <div className="tone-row"><span>⚡ Sell Fast</span><span>💰 Max Profit</span></div>
                <input type="range" className="tone-slider" min="0" max="100" value={tv} onChange={e=>setTones(prev=>({...prev,[item.id]:parseInt(e.target.value)}))}/>
                <div className="tone-lbl">{toneLabel(tv)}</div>
              </div>
              <div className="f-lbl" style={{marginTop:13}}>
                <span>Description</span>
                <div className="seo-tog"><span style={{fontSize:"0.55rem",color:"var(--muted)"}}>SEO</span><div className={`tog${seo[item.id]?" on":""}`} onClick={()=>setSeo(prev=>({...prev,[item.id]:!prev[item.id]}))}/></div>
              </div>
              <textarea className="f-textarea" value={item.listing} onChange={e=>updItem(item.id,"listing",e.target.value)} rows={6}/>
              <div className="tools-row">
                <button className="tool-btn" onClick={()=>rewrite(item.id)} disabled={rewriting===item.id}>{rewriting===item.id?"Rewriting...":"✨ Rewrite"}</button>
                <button className="tool-btn" onClick={()=>{setSeo(prev=>({...prev,[item.id]:true}));rewrite(item.id);}}>🔍 SEO</button>
              </div>
              <div className="exp-acts">
                <button className="btn-copy" onClick={()=>copyListing(item)}>{copied===item.id?"✓ Copied!":"Copy Listing"}</button>
                <button className="btn-dl" onClick={()=>dlPackage(item)} disabled={downloading===item.id}>{downloading===item.id?"Zipping...":"⬇ Download"}</button>
                <button className="btn-collapse" onClick={()=>setExpanded(null)}>Collapse</button>
                <button className="btn-delete" onClick={()=>delItem(item.id)}>Delete</button>
              </div>
              <div className="pkg-note">Package: photo + extras{item.video?" + video":""} + listing text</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return(
    <>
      <style>{STYLES}</style>
      <input ref={camInputRef} type="file" accept="image/*" capture="environment" style={{position:"absolute",left:"-9999px"}} onChange={e=>handleFile(e.target.files[0])}/>
      <input ref={galleryRef} type="file" accept="image/*" style={{position:"absolute",left:"-9999px"}} onChange={e=>handleFile(e.target.files[0])}/>

      {lightbox&&(
        <div className="lightbox" onClick={()=>setLightbox(null)}>
          <button className="lb-close">✕</button>
          {lightbox.type==="image"?<img className="lb-img" src={lightbox.src} alt="" onClick={e=>e.stopPropagation()}/>:<video className="lb-video" src={lightbox.src} controls autoPlay onClick={e=>e.stopPropagation()}/>}
        </div>
      )}

      <nav className="nav">
        <div className="nav-logo">Flip<span className="acc">ly</span></div>
        <div className="nav-right">
          {["scan","listings","post","dashboard"].map(t=>(
            <button key={t} className={`nav-tab${tab===t?" active":""}`} onClick={()=>setTab(t)}>
              {t==="scan"?"Scan":t==="listings"?`Listings${items.length?` (${items.length})`:""}`:`${t.charAt(0).toUpperCase()+t.slice(1)}`}
            </button>
          ))}
          <div className="nav-badge">BETA</div>
        </div>
      </nav>

      {tab==="scan"&&(
        <>
          <div style={{display:camOn?"block":"none"}}>
            <div className="camera-screen" style={{height:"62vh"}}>
              <video ref={videoRef} autoPlay playsInline muted
                style={{width:"100%",height:"100%",objectFit:"cover",background:"#000",display:"block"}}/>
              <div className="cam-overlay">
                <div className="cam-corner tl"/><div className="cam-corner tr"/>
                <div className="cam-corner bl"/><div className="cam-corner br"/>
                <div className="cam-line"/>
              </div>
              <div className="cam-controls">
                <button className="cam-cancel" onClick={stopCam}>Cancel</button>
                <button className="cam-scan" onClick={capture}>📷 Scan Now</button>
                <button className="cam-gallery" onClick={()=>{stopCam();galleryRef.current.value="";galleryRef.current.click();}}>Gallery</button>
              </div>
            </div>
          </div>

          {phase==="loading"&&(
            <div className="loading-screen">
              <div className="loader"><div className="loader-r1"/><div className="loader-r2"/></div>
              <div className="loading-title">{loadStep===3?"Generating listings...":"Detecting objects..."}</div>
              <div className="loading-sub">{loadStep===3?"Running two-pass AI identification with Google verification":"AI scanning every sellable item in your image"}</div>
              <div className="loading-pills">{loadSteps.map((s,i)=><span key={s} className={`loading-pill${i<loadStep?" done":i===loadStep?" active":""}`}>{i<loadStep?"✓ ":""}{s}</span>)}</div>
            </div>
          )}

          {phase==="review"&&captured&&(
            <>
              <StepBar step={1}/>
              <div className="page">
                <div className="screen-label">Step 2 — Review Items</div>
                <div className="screen-title">{objects.length} Item{objects.length!==1?"s":""} Detected</div>
                <div className="screen-sub">Select the items you want to list. Tap the image or the list to toggle selection.</div>
                <div className="frame-wrap">
                  <img src={captured.dataUrl} className="frame-img" alt=""/>
                  {objects.map((obj,i)=>{
                    const col=BBOX_COLORS[i%BBOX_COLORS.length],isSel=selected.includes(i);
                    return(
                      <div key={i} className={`bbox${isSel?" sel":""}`}
                        style={{left:`${obj.xFrac*100}%`,top:`${obj.yFrac*100}%`,width:`${obj.wFrac*100}%`,height:`${obj.hFrac*100}%`,borderColor:col.border,background:isSel?col.bg:"rgba(0,0,0,0.03)",animationDelay:`${i*0.1}s`}}
                        onClick={()=>toggleSel(i)}>
                        <div className="bbox-lbl" style={{background:col.border}}>{obj.label}</div>
                        <div className="bbox-num" style={{background:col.border}}>{i+1}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="item-list">
                  {objects.map((obj,i)=>(
                    <div key={i} className={`item-row${selected.includes(i)?" sel":""}`} onClick={()=>toggleSel(i)}>
                      {previews[i]?<img className="item-thumb" src={previews[i]} alt=""/>:<div className="item-thumb-ph"/>}
                      <div className="item-info"><div className="item-name">{obj.label}</div><div className="item-sub">#{i+1} · {obj.confidence} confidence</div></div>
                      <div className="item-check">{selected.includes(i)?"✓":""}</div>
                    </div>
                  ))}
                </div>
                <div className="action-bar">
                  <div className="action-bar-info"><strong>{selected.length} item{selected.length!==1?"s":""} selected.</strong> Next, adjust the crop for each item before generating listings.</div>
                  <div className="action-bar-btns">
                    <button className="btn-secondary" onClick={reset}>Re-Scan</button>
                    <button className="btn-primary" onClick={()=>setPhase("crop")} disabled={selected.length===0}>Next: Crop Items →</button>
                  </div>
                </div>
                {error&&<div className="err-box">⚠ {error}</div>}
              </div>
            </>
          )}

          {phase==="crop"&&captured&&(
            <>
              <StepBar step={2}/>
              <div className="page">
                <div className="screen-label">Step 3 — Adjust Your Items</div>
                <div className="screen-title">Crop & Fine-Tune</div>
                <div className="screen-sub">Drag the handles to tighten each crop. Skip items you don't want listed.</div>
                <div className="crop-grid">
                  {objects.filter((_,i)=>selected.includes(i)).map(obj=>{
                    const i=objects.indexOf(obj),col=BBOX_COLORS[i%BBOX_COLORS.length];
                    return(
                      <div key={i} className="crop-card" style={{opacity:skipped.includes(i)?0.4:1}}>
                        <div className="crop-card-head">
                          <div className="crop-card-name" style={{color:col.border}}>{obj.label}</div>
                          <div className="crop-card-num">#{i+1}</div>
                        </div>
                        <CropEditor src={captured.dataUrl} box={boxes[i]||{x:obj.xFrac,y:obj.yFrac,w:obj.wFrac,h:obj.hFrac}} onChange={b=>updBox(i,b)}/>
                        {previews[i]&&<><div className="crop-prev-lbl">Preview</div><img className="crop-prev-img" src={previews[i]} alt=""/></>}
                        <div className="crop-card-foot">
                          <button className={`skip-btn${skipped.includes(i)?" skipped":""}`} onClick={()=>toggleSkip(i)}>{skipped.includes(i)?"✕ Skipped":"Skip Item"}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="gen-cta">
                  <div className="gen-cta-title">Crops look good?</div>
                  <div className="gen-cta-sub">AI will identify each item, suggest a realistic price, and write a full listing ready to post.</div>
                  <div className="gen-cta-btns">
                    <button className="btn-ghost" onClick={()=>setPhase("review")}>← Back to Review</button>
                    <button className="btn-primary" onClick={generate} disabled={activeCount===0}>
                      ✨ Generate {activeCount} Listing{activeCount!==1?"s":""}
                    </button>
                  </div>
                </div>
                {error&&<div className="err-box">⚠ {error}</div>}
              </div>
            </>
          )}

          {phase==="results"&&items.length>0&&(
            <>
              <StepBar step={3}/>
              <div className="results-wrap">
                <div className="results-hdr">
                  <div><div className="results-h">{items.length} Listing{items.length!==1?"s":""} Ready</div><div className="results-sub">Tap any card to expand, edit and download</div></div>
                  <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                    <button className="btn-ghost" onClick={reset}>New Scan</button>
                    <button className="btn-primary" onClick={()=>setTab("post")}>Post All →</button>
                  </div>
                </div>
                <div className="listings-grid">{items.map(item=>renderCard(item))}</div>
              </div>
            </>
          )}

          {phase==="home"&&!camOn&&(
            <>
              <div className="home-hero">
                <div className="home-badge"><div className="home-badge-dot"/>AI-Powered Resale Lister</div>
                <h1 className="home-h1">Scan once.<br/><span className="hl">List everything.</span></h1>
                <p className="home-sub">Point your camera at any room, closet or shelf. AI detects every item, crops them individually, and writes ready-to-post listings.</p>
              </div>
              <div className="page" style={{paddingTop:0}}>
                <div className={`upload-card${dragOver?" drag":""}`} onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={onDrop}>
                  <div className="upload-icon">📷</div>
                  <div className="upload-title">Start Scanning</div>
                  <div className="upload-sub">Use the live camera or upload a photo. Works best with rooms, closets and shelves.</div>
                  <div className="upload-btns">
                    <button className="btn-primary" onClick={startCam}>📸 Open Camera</button>
                    <button className="btn-secondary" onClick={()=>{galleryRef.current.value="";galleryRef.current.click();}}>🖼 Upload Photo</button>
                  </div>
                  <div className="upload-hint">Drag and drop also works on desktop</div>
                </div>
                {camErr&&<div className="cam-err">⚠ {camErr}</div>}
                {error&&<div className="err-box">⚠ {error}</div>}
              </div>
            </>
          )}
        </>
      )}

      {tab==="listings"&&(
        <div className="results-wrap">
          {items.length===0?(
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <div className="empty-title">No listings yet</div>
              <div className="empty-sub">Scan an image to create your first listing</div>
              <button className="btn-primary" onClick={()=>setTab("scan")}>Start Scanning →</button>
            </div>
          ):(
            <>
              <div className="results-hdr">
                <div><div className="results-h">{items.length} Active Listing{items.length!==1?"s":""}</div><div className="results-sub">Est. total: ${total.toFixed(0)}</div></div>
                <button className="btn-primary" onClick={()=>{setTab("scan");reset();}}>+ New Scan</button>
              </div>
              <div className="listings-grid">{items.map(item=>renderCard(item))}</div>
            </>
          )}
        </div>
      )}

      {tab==="post"&&(
        <div className="post-wrap">
          <div className="post-hdr"><div className="post-h">Post Listings</div><div className="post-sub">{items.length} listing{items.length!==1?"s":""} ready to post</div></div>
          {items.length===0?(
            <div className="empty-state">
              <div className="empty-icon">🚀</div>
              <div className="empty-title">Nothing to post yet</div>
              <div className="empty-sub">Scan some items first</div>
              <button className="btn-primary" onClick={()=>setTab("scan")}>Go to Scanner →</button>
            </div>
          ):(
            <>
              <div className="p-cards">
                {PLATFORMS.map(p=>{
                  const st=postStatus[p.id]||"ready",pr=postProg[p.id]||0;
                  return(
                    <div key={p.id} className={`p-card${st==="posting"?" posting":""}`}>
                      <div className="p-icon" style={{background:`${p.color}18`}}>{p.icon}</div>
                      <div className="p-info">
                        <div className="p-name">{p.name}</div>
                        <div className="p-desc">{p.desc}</div>
                        {st==="posting"&&<div className="p-bar-wrap" style={{marginTop:"7px",width:"100%"}}><div className="p-bar" style={{width:`${pr}%`}}/></div>}
                      </div>
                      <div className="p-status">
                        <div className={`p-badge ${st}`}>{st==="ready"?"Ready":st==="posting"?"Posting...":"✓ Done"}</div>
                        {st==="ready"&&<div style={{fontSize:"0.57rem",color:"var(--muted)"}}>{items.length} items</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button className="post-btn" onClick={simulatePost} disabled={posting||Object.values(postStatus).every(s=>s==="done")}>
                {posting?"Posting...":Object.values(postStatus).every(s=>s==="done")?"✓ All Posted!":"🚀 Post All "+items.length+" Listings"}
              </button>
            </>
          )}
        </div>
      )}

      {tab==="dashboard"&&(
        <div className="dash-wrap">
          <div style={{marginBottom:20}}><div style={{fontSize:"1.25rem",fontWeight:900,letterSpacing:"-0.03em"}}>Dashboard</div><div style={{fontSize:"0.68rem",color:"var(--text2)",marginTop:3}}>Your reselling activity</div></div>
          <div className="dash-stats">
            <div className="stat-card"><div className="stat-lbl">Est. Value</div><div className="stat-val g">${total.toFixed(0)}</div><div className="stat-sub">active listings</div></div>
            <div className="stat-card"><div className="stat-lbl">Active</div><div className="stat-val p">{items.length}</div><div className="stat-sub">listings ready</div></div>
            <div className="stat-card"><div className="stat-lbl">Avg Price</div><div className="stat-val p">${items.length?(total/items.length).toFixed(0):0}</div><div className="stat-sub">per listing</div></div>
            <div className="stat-card"><div className="stat-lbl">Platforms</div><div className="stat-val">{PLATFORMS.length}</div><div className="stat-sub">marketplaces</div></div>
          </div>
          <div className="dash-sec">AI Insights</div>
          <div className="insights">
            {items.length===0?(
              <div className="insight"><div className="insight-icon" style={{background:"rgba(124,92,255,0.1)"}}>🤖</div><div className="insight-body"><div className="insight-title">Scan items to get personalized insights</div><div className="insight-sub">AI recommendations appear after you create listings</div></div></div>
            ):(
              <>
                <div className="insight"><div className="insight-icon" style={{background:"rgba(245,158,11,0.1)"}}>⚡</div><div className="insight-body"><div className="insight-title">Price 10-20% below market to sell 3x faster</div><div className="insight-sub">Competitive prices get significantly more inquiries</div></div><button className="insight-btn" onClick={()=>setTab("listings")}>Review</button></div>
                <div className="insight"><div className="insight-icon" style={{background:"rgba(34,197,94,0.1)"}}>📸</div><div className="insight-body"><div className="insight-title">Add 3+ photos to boost views by 40%</div><div className="insight-sub">More photos means more buyer confidence</div></div><button className="insight-btn" onClick={()=>setTab("listings")}>Add Photos</button></div>
                <div className="insight"><div className="insight-icon" style={{background:"rgba(124,92,255,0.1)"}}>🚀</div><div className="insight-body"><div className="insight-title">Post to all 3 platforms for maximum reach</div><div className="insight-sub">Multi-platform listings sell faster</div></div><button className="insight-btn" onClick={()=>setTab("post")}>Post Now</button></div>
              </>
            )}
          </div>
          <div className="dash-sec">Active Listings</div>
          <div className="dash-list">
            {items.length===0?<div className="dash-empty">No listings yet</div>:items.map(item=>(
              <div key={item.id} className="dash-row">
                <img className="dash-thumb" src={item.cropDataUrl} alt={item.label}/>
                <div className="dash-info"><div className="dash-t">{item.title}</div><div className="dash-m">{item.label}</div></div>
                <div className="dash-price">${item.priceSuggested}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

