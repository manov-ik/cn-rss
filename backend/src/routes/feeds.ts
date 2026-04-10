import { Hono } from "hono";
import { db } from "../db";
import { feeds, folders, articles } from "../db/schema";
import { eq, asc } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  fetchAndParseFeed,
  upsertArticles,
  syncFeedByUuid,
} from "../services/rss";

export const feedsRouter = new Hono();

// GET /api/feeds  — all feeds with optional filter
feedsRouter.get("/feeds", async (c) => {
  const rows = await db.select().from(feeds).orderBy(asc(feeds.sort));
  return c.json(rows);
});

// GET /api/subscribes  — same as /feeds, aliased for dataAgent compat
feedsRouter.get("/subscribes", async (c) => {
  const rows = await db
    .select({
      uuid: feeds.uuid,
      title: feeds.title,
      url: feeds.url,
      description: feeds.description,
      logo: feeds.logo,
      feedType: feeds.feedType,
      folderUuid: feeds.folderUuid,
      sort: feeds.sort,
      lastSyncDate: feeds.lastSyncDate,
    })
    .from(feeds)
    .orderBy(asc(feeds.sort));

  return c.json(rows);
});

// POST /api/fetch_feed  { url } — preview a feed without saving
feedsRouter.post("/fetch_feed", async (c) => {
  const { url } = await c.req.json<{ url: string }>();
  if (!url) return c.json({ error: "url is required" }, 400);

  try {
    const parsed = await fetchAndParseFeed(url);
    return c.json([parsed, "ok"]);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// POST /api/add_feed  { url } — subscribe to a feed
feedsRouter.post("/add_feed", async (c) => {
  const { url } = await c.req.json<{ url: string }>();
  if (!url) return c.json({ error: "url is required" }, 400);

  // Check if already subscribed
  const [existing] = await db
    .select()
    .from(feeds)
    .where(eq(feeds.url, url))
    .limit(1);
  if (existing) return c.json([existing, 0, "already subscribed"]);

  try {
    const parsed = await fetchAndParseFeed(url);
    const uuid = randomUUID();

    await db.insert(feeds).values({
      uuid,
      title: parsed.title,
      url,
      description: parsed.description,
      logo: parsed.logo,
      feedType: parsed.feedType,
      sort: 0,
      lastSyncDate: new Date(),
    });

    await upsertArticles(uuid, parsed.items);

    const [newFeed] = await db
      .select()
      .from(feeds)
      .where(eq(feeds.uuid, uuid))
      .limit(1);
    return c.json([newFeed, 1, "ok"], 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// DELETE /api/feeds/:uuid
feedsRouter.delete("/feeds/:uuid", async (c) => {
  const { uuid } = c.req.param();
  await db.delete(feeds).where(eq(feeds.uuid, uuid));
  return c.json({ ok: true });
});

// GET /api/feeds/:uuid/sync
feedsRouter.get("/feeds/:uuid/sync", async (c) => {
  const { uuid } = c.req.param();
  const force = c.req.query("force") === "true";

  try {
    const result = await syncFeedByUuid(uuid, force);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message }, 404);
  }
});

// POST /api/move_channel_into_folder  { channelUuid, folderUuid, sort }
feedsRouter.post("/move_channel_into_folder", async (c) => {
  const { channelUuid, folderUuid, sort } = await c.req.json<{
    channelUuid: string;
    folderUuid: string;
    sort: number;
  }>();

  await db
    .update(feeds)
    .set({ folderUuid: folderUuid || null, sort: sort ?? 0 })
    .where(eq(feeds.uuid, channelUuid));

  return c.json({ ok: true });
});

// POST /api/update-feed-sort  — array of { uuid, sort, folder_uuid }
feedsRouter.post("/update-feed-sort", async (c) => {
  const sorts =
    await c.req.json<
      { uuid: string; sort: number; folder_uuid: string; item_type: string }[]
    >();

  for (const item of sorts) {
    if (item.item_type === "folder") {
      await db
        .update(folders)
        .set({ sort: item.sort })
        .where(eq(folders.uuid, item.uuid));
    } else {
      await db
        .update(feeds)
        .set({ sort: item.sort, folderUuid: item.folder_uuid || null })
        .where(eq(feeds.uuid, item.uuid));
    }
  }

  return c.json({ ok: true });
});

// POST /api/update_icon  { uuid, url }
feedsRouter.post("/update_icon", async (c) => {
  const { uuid, url } = await c.req.json<{ uuid: string; url: string }>();
  await db.update(feeds).set({ logo: url }).where(eq(feeds.uuid, uuid));
  return c.json({ ok: true });
});
