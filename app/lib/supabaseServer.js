// ─── Supabase Server Client ───────────────────────────────────────────────────
// Used ONLY in API routes (route.js) and Server Components.
// Uses the service role key — NEVER expose this to the browser.

import { createClient } from "@supabase/supabase-js";

export function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables."
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

/**
 * Upload a Buffer or Uint8Array to Supabase Storage from a server route.
 * Returns the public URL.
 */
export async function uploadBufferToStorage(supabase, bucket, path, buffer, mimeType = "image/jpeg") {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { contentType: mimeType, upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload a base64 string (no data URL prefix) from a server route.
 */
export async function uploadBase64ToStorage(supabase, bucket, path, base64String, mimeType = "image/jpeg") {
  const buffer = Buffer.from(base64String, "base64");
  return uploadBufferToStorage(supabase, bucket, path, buffer, mimeType);
}
