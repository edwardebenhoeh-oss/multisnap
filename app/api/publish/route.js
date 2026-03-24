// ─── Publish Listings API ─────────────────────────────────────────────────────
// POST /api/publish
//
// Receives: scan image, detected objects, and AI-generated listings
// Does:
//   1. Uploads scan image → Supabase Storage (scans bucket)
//   2. Uploads each crop image → Supabase Storage (crops bucket)
//   3. Creates scan record in DB
//   4. Creates scan_detection records
//   5. Creates listing records (tracking AI vs user edits)
//   6. Returns published listing IDs + URLs
// ─────────────────────────────────────────────────────────────────────────────

export const maxDuration = 60;

import { getSupabaseServer, uploadBase64ToStorage } from "../../lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const {
    scanImageBase64,      // base64 string (no data URL prefix)
    scanImageMime,        // e.g. "image/jpeg"
    detectedObjects,      // array of { label, xFrac, yFrac, wFrac, hFrac, confidence }
    items,                // array of listing items (see structure below)
    userToken,            // Supabase auth JWT from browser
  } = body;

  // ── Auth: verify the user token ─────────────────────────────────────────────
  if (!userToken) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  // Use anon client to verify the token
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
  const { data: { user }, error: authError } = await anonClient.auth.getUser(userToken);
  if (authError || !user) {
    return Response.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  // ── Service role client for DB + Storage writes ──────────────────────────────
  const supabase = getSupabaseServer();
  const userId = user.id;
  const timestamp = Date.now();

  try {
    // ── 1. Upload scan image ──────────────────────────────────────────────────
    let scanImageUrl = null;
    if (scanImageBase64) {
      const scanPath = `${userId}/${timestamp}/scan.jpg`;
      scanImageUrl = await uploadBase64ToStorage(
        supabase, "scans", scanPath, scanImageBase64, scanImageMime || "image/jpeg"
      );
    }

    // ── 2. Create scan record ─────────────────────────────────────────────────
    const { data: scan, error: scanError } = await supabase
      .from("scans")
      .insert({
        user_id: userId,
        original_image_url: scanImageUrl || "",
        detected_objects: detectedObjects || [],
        item_count: items?.length || 0,
      })
      .select()
      .single();

    if (scanError) throw new Error(`Failed to create scan: ${scanError.message}`);

    // ── 3. Upload crops + create listings ────────────────────────────────────
    const publishedListings = [];

    for (let i = 0; i < (items || []).length; i++) {
      const item = items[i];
      const detection = detectedObjects?.[i] || {};

      // Upload crop image
      let cropUrl = null;
      if (item.cropBase64) {
        const cropPath = `${userId}/${timestamp}/item_${i}.jpg`;
        try {
          cropUrl = await uploadBase64ToStorage(
            supabase, "crops", cropPath, item.cropBase64, "image/jpeg"
          );
        } catch (cropErr) {
          console.error(`[Publish] Crop upload failed for item ${i}:`, cropErr.message);
          // Non-fatal: continue without crop image
        }
      }

      // Create scan_detection record
      const { data: detectionRecord } = await supabase
        .from("scan_detections")
        .insert({
          scan_id: scan.id,
          label: detection.label || item.label,
          confidence: detection.confidence,
          bbox_x: detection.xFrac,
          bbox_y: detection.yFrac,
          bbox_w: detection.wFrac,
          bbox_h: detection.hFrac,
          crop_image_url: cropUrl,
        })
        .select()
        .single();

      // Determine which fields the user edited vs AI-generated
      const titleEdited = item.title !== item.aiTitle;
      const descriptionEdited = item.description !== item.aiDescription;
      const priceEdited = Number(item.price) !== Number(item.aiPrice);
      const categoryEdited = Boolean(item.categoryEdited);

      // Create listing record
      const { data: listing, error: listingError } = await supabase
        .from("listings")
        .insert({
          user_id: userId,
          scan_id: scan.id,
          detection_id: detectionRecord?.id || null,

          // AI-generated originals
          ai_title: item.aiTitle || item.title,
          ai_description: item.aiDescription || item.description,
          ai_price: item.aiPrice || item.priceSuggested,
          ai_price_min: item.priceMin,
          ai_price_max: item.priceMax,
          ai_category: item.aiCategory || item.category,
          ai_condition: item.aiCondition || item.condition,
          ai_tags: item.tags || [],
          ai_confidence: item.confidenceScore || null,

          // Live values (may equal AI or user-edited)
          title: item.title,
          description: item.description || item.listing,
          price: item.price || item.priceSuggested,
          category: item.category,
          condition: item.condition,
          tags: item.tags || [],

          // Edit tracking
          title_edited: titleEdited,
          description_edited: descriptionEdited,
          price_edited: priceEdited,
          category_edited: categoryEdited,

          // Image
          primary_image_url: cropUrl,

          // Publish immediately
          status: "published",
          published_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (listingError) {
        console.error(`[Publish] Listing insert failed for item ${i}:`, listingError.message);
        continue; // Don't fail the whole batch
      }

      // Link detection → listing
      if (detectionRecord?.id) {
        await supabase
          .from("scan_detections")
          .update({ listing_id: listing.id })
          .eq("id", detectionRecord.id);
      }

      // Update profile listing count
      await supabase.rpc("increment_listing_count", { uid: userId }).catch(() => {});

      publishedListings.push({
        id: listing.id,
        title: listing.title,
        price: listing.price,
        imageUrl: cropUrl,
        url: `/listing/${listing.id}`,
      });
    }

    return Response.json({
      success: true,
      scanId: scan.id,
      publishedCount: publishedListings.length,
      listings: publishedListings,
    });

  } catch (err) {
    console.error("[Publish API] Error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
