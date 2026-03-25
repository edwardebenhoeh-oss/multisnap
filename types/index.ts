// ─────────────────────────────────────────────────────────────────────────────
// MultiSnap — Shared TypeScript types
// ─────────────────────────────────────────────────────────────────────────────

/** Raw detection output from the AI — bounding box in image-fraction coordinates (0–1). */
export interface DetectedObject {
  label: string;
  xFrac: number;
  yFrac: number;
  wFrac: number;
  hFrac: number;
  confidence: 'high' | 'medium' | 'low';
}

/** One AI identification hypothesis (name + confidence + reasoning). */
export interface Identification {
  name: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning?: string;
}

/** A bounding box in pixel coordinates (used for canvas operations). */
export interface PixelBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Full state for one detected item — spans detection, listing generation,
 * user edits, and attached media.
 */
export interface ItemResult {
  /** Stable client-side ID (e.g. "item-0"). */
  id: string;

  // ── Detection ──────────────────────────────────────────────────────────────
  detection: DetectedObject;
  cropDataUrl: string;         // JPEG data-URL of the auto-cropped item

  // ── User-editable fields (pre-populated from AI but always overridable) ───
  editedTitle: string;
  editedPrice: string;
  editedCondition: string;
  editedNotes: string;

  // ── AI-generated listing data (filled after generateListings()) ──────────
  title: string;
  listing: string;
  priceMin: number;
  priceMax: number;
  priceSuggested: number;
  condition: string;
  materials?: string;
  estimatedDimensions?: string;
  brandMarkings?: string;
  identifications: Identification[];
  confidenceScore: number;
  aiValidated: boolean;

  // ── Extra media ────────────────────────────────────────────────────────────
  extraPhotos: { dataUrl: string; name: string }[];
  video: { url: string; name: string } | null;

  // ── Per-item generation state ──────────────────────────────────────────────
  isGenerating: boolean;
  isGenerated: boolean;
  hasError: boolean;
}

/** Top-level scan-flow phase. */
export type ScanPhase =
  | 'upload'      // Landing page — no image yet
  | 'preview'     // Image selected, ready to scan
  | 'detecting'   // Running detection API call
  | 'review'      // Bboxes shown on image; user reviews before generating
  | 'generating'  // Listing generation running per-item
  | 'results';    // All listings done; full edit mode

/** Compressed image with metadata. */
export interface CompressedImage {
  dataUrl: string;
  name: string;
  size: string;         // human-readable e.g. "342.1 KB"
  naturalWidth: number;
  naturalHeight: number;
}

/** Colour assigned to an item's bounding box and card accent. */
export const BBOX_COLORS = [
  '#6c63ff', // purple
  '#a855f7', // violet
  '#4ade80', // green
  '#fbbf24', // amber
  '#f87171', // red
  '#60a5fa', // blue
  '#fb923c', // orange
  '#34d399', // emerald
  '#f472b6', // pink
] as const;

export const CONDITION_OPTIONS = [
  'New',
  'Like New',
  'Good',
  'Fair',
  'Poor',
] as const;
