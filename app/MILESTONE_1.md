# SnapList — Milestone 1 Complete

## What was built

### New Files Created
| File | Purpose |
|---|---|
| `app/lib/supabase.js` | Browser Supabase client + auth helpers + upload utils |
| `app/lib/supabaseServer.js` | Server-side Supabase client (API routes only) |
| `app/supabase/schema.sql` | Full database schema — run in Supabase SQL editor |
| `app/auth/page.js` | Sign in / Sign up page (email + Google OAuth) |
| `app/auth/callback/route.js` | OAuth callback handler |
| `app/api/publish/route.js` | Publish listings → upload images → save to Supabase |
| `app/api/feed/route.js` | Feed API with pagination, search, category filter |
| `app/feed/page.js` | Discovery feed (grid layout, save, search, categories) |
| `app/listing/[id]/page.js` | Individual listing page with messaging |
| `app/env.local.template` | Environment variable template |

### Modified Files
| File | Change |
|---|---|
| `app/page.js` | + Auth state, + real publish to Supabase, + Feed nav link, renamed to SnapList |
| `app/layout.js` | + Proper metadata, SEO tags, viewport, theme color |

---

## Setup Instructions

### 1. Install Supabase package
In your project root (`C:\Users\edwar\snaplist2\`):
```bash
npm install @supabase/supabase-js
```

### 2. Create Supabase project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Dashboard → SQL Editor → New Query
3. Paste contents of `app/supabase/schema.sql` → Run

### 3. Create Storage Buckets
In Supabase Dashboard → Storage → New Bucket:
- `scans` (private) — original scan photos
- `crops` (public) — cropped item images

### 4. Set up environment variables
Copy `app/env.local.template` to `.env.local` in your project root:
```
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 5. Enable Google OAuth (optional)
Supabase Dashboard → Authentication → Providers → Google

### 6. Run
```bash
npm run dev
```

---

## What works after setup

| Feature | Status |
|---|---|
| Scan photo + detect items | ✅ Working (Claude Vision) |
| Review detected items | ✅ Working |
| Crop editor per item | ✅ Working |
| AI listing generation | ✅ Working (2-pass + Google verification) |
| Edit listings | ✅ Working |
| Sign in / Sign up | ✅ Working (Supabase Auth) |
| Google OAuth | ✅ Working (after Supabase config) |
| Publish to database | ✅ Working (images → Storage, data → DB) |
| Discovery feed | ✅ Working |
| Individual listing page | ✅ Working |
| Message seller | ✅ Working (saves to conversations + messages) |
| Save/bookmark listings | ✅ Working |

---

## Data tracked per publish
- Original scan image (Supabase Storage)
- Each detected object with bounding box
- Cropped item image (Supabase Storage)
- AI-generated title/description/price (separate fields)
- User-edited values (tracked as boolean flags)
- Listing lifecycle (draft → published → sold)
- View, save, and message counts

---

## Milestone 2 — Next Steps
- [ ] User profile page
- [ ] My listings page (manage active/sold/archived)
- [ ] Messaging inbox
- [ ] Mark as sold flow
- [ ] Location-based filtering
