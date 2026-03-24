// ─── Supabase Browser Client ─────────────────────────────────────────────────
// Used in Client Components ("use client") and pages running in the browser.
// The anon key is safe to expose — Row Level Security on Supabase controls access.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[FLIPR] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
    "Add them to your .env.local file."
  );
}

// Singleton so we don't create multiple clients across hot-reloads
let _client = null;

export function getSupabase() {
  if (!_client) {
    _client = createClient(supabaseUrl || "", supabaseAnonKey || "", {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return _client;
}

export const supabase = getSupabase();

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/auth";
}

// ─── Storage helpers ─────────────────────────────────────────────────────────

/**
 * Upload a base64 data URL to Supabase Storage.
 * Returns the public URL of the uploaded file.
 */
export async function uploadBase64Image(bucket, path, base64DataUrl) {
  // Strip the data URL prefix (e.g. "data:image/jpeg;base64,")
  const [header, data] = base64DataUrl.split(",");
  const mimeMatch = header.match(/data:([^;]+);base64/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";

  // Convert base64 to Blob
  const byteCharacters = atob(data);
  const byteArray = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i);
  }
  const blob = new Blob([byteArray], { type: mimeType });

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: mimeType, upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  return urlData.publicUrl;
}
