// ─── Feed API ─────────────────────────────────────────────────────────────────
// GET /api/feed
// Returns published listings for the discovery feed.
// Supports cursor-based pagination, category filtering, and search.
// ─────────────────────────────────────────────────────────────────────────────

import { getSupabaseServer } from "../../lib/supabaseServer";

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const limit   = Math.min(parseInt(searchParams.get("limit")  || "20"), 50);
  const cursor  = searchParams.get("cursor") || null;   // ISO timestamp for pagination
  const category = searchParams.get("category") || null;
  const query   = searchParams.get("q") || null;
  const userId  = searchParams.get("userId") || null;   // filter by seller

  const supabase = getSupabaseServer();

  try {
    let dbQuery = supabase
      .from("listings")
      .select(`
        id,
        title,
        description,
        price,
        category,
        condition,
        primary_image_url,
        view_count,
        save_count,
        message_count,
        published_at,
        location,
        user_id,
        profiles (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit + 1); // fetch one extra to determine if there's a next page

    // Cursor pagination
    if (cursor) {
      dbQuery = dbQuery.lt("published_at", cursor);
    }

    // Category filter
    if (category) {
      dbQuery = dbQuery.ilike("category", `%${category}%`);
    }

    // Seller filter
    if (userId) {
      dbQuery = dbQuery.eq("user_id", userId);
    }

    // Full-text search (simple ILIKE for MVP)
    if (query) {
      dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    }

    const { data, error } = await dbQuery;

    if (error) throw new Error(error.message);

    const hasMore = data.length > limit;
    const listings = hasMore ? data.slice(0, limit) : data;
    const nextCursor = hasMore ? listings[listings.length - 1]?.published_at : null;

    return Response.json({
      listings,
      nextCursor,
      hasMore,
    });

  } catch (err) {
    console.error("[Feed API]", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
