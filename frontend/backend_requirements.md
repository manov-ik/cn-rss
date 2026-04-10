# Complete Backend Architecture & API Specification (Lettura Web)

This document outlines everything you need to build a robust, serverless backend for your RSS reader on a free-tier stack (Vercel/Next.js routes + Neon serverless Postgres).

## 1. Database Schema Concepts (Neon DB)

To make a clean and scalable RSS reader, your Postgres tables should look something like this:

- **Users Table**: Powered seamlessly by an Auth provider (e.g., Clerk Auth).
- **Feeds Table**: `id`, `url`, `title`, `description`, `logo_url`, `last_sync_date`. (This is a global table. If 10 users subscribe to The Verge, you only fetch it once!).
- **User_Subscriptions Table**: `user_id`, `feed_id`, `folder_id`, `custom_name`. (Maps a user to a global feed).
- **Articles Table**: `id`, `feed_id`, `title`, `content_html`, `link`, `author`, `published_at`.
- **User_Article_Interactions Table**: `user_id`, `article_id`, `is_read`, `is_starred`. (Keeps track of read/unread state per user).
- **Folders Table**: `id`, `user_id`, `name`, `sort_order`.
- **User_Settings Table**: `user_id`, `theme`, `sync_interval`, `layout_preferences`.

---

## 2. The Core API Endpoints (Vercel Serverless Functions)

Based entirely on your frontend's `dataAgent.ts`, here is the A-to-Z list of endpoints you need to build:

### 🔐 Authentication

_All standard API routes should expect a JWT Session Token in the `Authorization: Bearer <token>` header (handled by Clerk or Supabase)._

### 📂 Folders & Navigation

- `GET /api/folders` - Return array of the user's folders.
- `POST /api/folders` - Create a new folder (Body: `{ name }`).
- `PUT /api/folders/:uuid` - Update folder name.
- `DELETE /api/folders/:uuid` - Delete a folder.
- `POST /api/feeds/move` - Move a feed into a folder (Body: `{ channelUuid, folderUuid, sort }`).

### 📡 Feeds (Subscriptions)

- `GET /api/feeds` - List all feeds the user is subscribed to (joined with folder data).
- `POST /api/feeds/subscribe` - Subscribe to a new feed. The backend must fetch the URL, parse the XML to check if it's valid, save the global feed, and map it to the user.
- `DELETE /api/feeds/:uuid` - Unsubscribe from a feed.
- `POST /api/feeds/:uuid/sync` - Force a manual background fetch for a specific feed to look for new articles.

### 📰 Articles & Reading

- `GET /api/articles?feed_uuid=xxx&limit=50&offset=0` - Fetch articles. Should support filtering by `feed_uuid`, `folder_uuid`, or status (unread/starred).
- `GET /api/articles/:uuid` - Get the full HTML content of a single article (for the `ArticleDetail` component).
- `GET /api/articles/unread-total` - Returns an object mapping feed UUIDs to their unread count.
- `POST /api/articles/:uuid/read` - Update read status (Body: `{ read_status: 1 | 2 }`).
- `POST /api/articles/:uuid/star` - Update favorite status (Body: `{ starred: 1 | 0 }`).
- `POST /api/articles/mark-all-read` - Mark all articles in a feed or folder as read (Body: `{ uuid, isToday, isAll }`).

### ⚙️ Settings & Data Export

- `GET /api/user-config` - Get UI preferences.
- `POST /api/user-config` - Save UI preferences (theme, layout).
- `POST /api/opml/import` - Upload an OPML file string. Backend parses the XML array and subscribes the user to all feeds found inside.
- `GET /api/opml/export` - Backend returns the user's folders and feeds generated as a raw OPML XML string.

---

## 3. The User-Driven RSS Sync Engine (Cost-Effective Approach)

Instead of running automated background cron jobs (which can consume free-tier Vercel compute limitlessly), you can rely entirely on the manual **Sync button** in the UI. This is an incredibly smart, cost-effective architecture for free tiers!

- **The Trigger**: The user clicks the native "Sync" button (or opens the app). The frontend hits `POST /api/feeds/sync`.
- **The Logic (15-Minute Rule)**:
  1. The backend looks at the `last_sync_date` on the global `Feeds` table for the user's subscribed feeds.
  2. **If `< 15 minutes`**: The backend skips external fetching and instantly returns the articles currently existing in your Neon DB.
  3. **If `> 15 minutes` (or forced)**: The backend fetches the live XML, parses it, and inserts new articles into the Neon DB. It then updates `last_sync_date = NOW()`.
- **Zero Duplicate Guarantee**:
  - Since multiple users might subscribe to the same feed (e.g., The Verge), having a unique constraint in your Postgres table over `(feed_id, guid)` or `(feed_id, link)` is mandatory.
  - When saving articles, you use a standard Postgres Upsert: `INSERT INTO Articles (...) ON CONFLICT (feed_id, guid) DO NOTHING`. This safely ensures duplicates are physically blocked at the database level!

---

## 4. Podcast Integration (Future Proofing)

Since podcasts are RSS feeds with `<enclosure url="audio.mp3" type="audio/mpeg">` tags, your backend handles them almost identically to text articles!

- **Database**: When parsing the RSS XML, if the backend detects an `<enclosure>` with an audio type, save the audio URL to an `audio_url` column in your `Articles` table.
- **Playback Progress**: You will want users to pause a podcast and resume it on their phone later.
  - Add Endpoint: `POST /api/podcasts/progress` (Body: `{ article_id, current_time_seconds }`). Your UI calls this via debounced HTTP requests every 10 seconds while audio plays.
  - Add Endpoint: `GET /api/podcasts/progress/:article_id` to fetch the timestamp so the frontend player jumps to the right `<audio src=".." currentTime={time} />` spot.
- **Storage**: You do **not** need to host the heavy MP3 files yourself! The `audio_url` from the RSS feed points to the creator's server. Your frontend `<audio>` player will just stream it directly from them for free!
