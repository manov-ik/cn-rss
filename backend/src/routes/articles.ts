import { Hono } from "hono";
import { db } from "../db";
import { articles, feeds } from "../db/schema";
import { eq, and, desc, count, sql, inArray } from "drizzle-orm";

export const articlesRouter = new Hono();

// GET /api/articles?feed_uuid=&folder_uuid=&read_status=&starred=&limit=50&offset=0
articlesRouter.get("/", async (c) => {
  const {
    feed_uuid,
    folder_uuid,
    read_status,
    starred,
    limit = "50",
    offset = "0",
  } = c.req.query();

  const conditions = [];

  if (feed_uuid) {
    conditions.push(eq(articles.feedUuid, feed_uuid));
  }

  if (folder_uuid) {
    // Fetch feed UUIDs in this folder first
    const folderFeeds = await db
      .select({ uuid: feeds.uuid })
      .from(feeds)
      .where(eq(feeds.folderUuid, folder_uuid));
    const uuids = folderFeeds.map((f) => f.uuid);
    if (uuids.length === 0) return c.json([]);
    conditions.push(inArray(articles.feedUuid, uuids));
  }

  if (read_status) {
    conditions.push(eq(articles.readStatus, parseInt(read_status)));
  }

  if (starred) {
    conditions.push(eq(articles.starred, parseInt(starred)));
  }

  const rows = await db
    .select()
    .from(articles)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(articles.publishedAt))
    .limit(parseInt(limit))
    .offset(parseInt(offset));

  return c.json(rows);
});

// GET /api/articles/unread-total
articlesRouter.get("/unread-total", async (c) => {
  const rows = await db
    .select({
      feedUuid: articles.feedUuid,
      count: count().as("count"),
    })
    .from(articles)
    .where(eq(articles.readStatus, 1))
    .groupBy(articles.feedUuid);

  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.feedUuid] = Number(row.count);
  }

  return c.json(result);
});

// GET /api/collection-metas  (starred count, today count, all unread count)
articlesRouter.get("/collection-metas", async (c) => {
  const [starredResult] = await db
    .select({ count: count() })
    .from(articles)
    .where(eq(articles.starred, 1));

  const [unreadResult] = await db
    .select({ count: count() })
    .from(articles)
    .where(eq(articles.readStatus, 1));

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [todayResult] = await db
    .select({ count: count() })
    .from(articles)
    .where(
      and(
        eq(articles.readStatus, 1),
        sql`${articles.publishedAt} >= ${todayStart.toISOString()}`
      )
    );

  return c.json({
    starred: Number(starredResult?.count ?? 0),
    unread: Number(unreadResult?.count ?? 0),
    today: Number(todayResult?.count ?? 0),
  });
});

// GET /api/articles/:uuid
articlesRouter.get("/:uuid", async (c) => {
  const { uuid } = c.req.param();
  const [row] = await db
    .select()
    .from(articles)
    .where(eq(articles.uuid, uuid))
    .limit(1);

  if (!row) return c.json({ error: "Article not found" }, 404);
  return c.json(row);
});

// POST /api/articles/:uuid/read  { read_status: 1|2 }
articlesRouter.post("/:uuid/read", async (c) => {
  const { uuid } = c.req.param();
  const { read_status } = await c.req.json<{ read_status: number }>();

  await db
    .update(articles)
    .set({ readStatus: read_status })
    .where(eq(articles.uuid, uuid));

  return c.json({ ok: true });
});

// POST /api/articles/:uuid/star  { starred: 1|0 }
articlesRouter.post("/:uuid/star", async (c) => {
  const { uuid } = c.req.param();
  const { starred } = await c.req.json<{ starred: number }>();

  await db
    .update(articles)
    .set({ starred })
    .where(eq(articles.uuid, uuid));

  return c.json({ ok: true });
});

// POST /api/mark-all-as-read  { uuid?, isToday?, isAll? }
articlesRouter.post("/mark-all-as-read", async (c) => {
  const body = await c.req.json<{
    uuid?: string;
    isToday?: boolean;
    isAll?: boolean;
  }>();

  const conditions = [];

  if (body.uuid) {
    // Could be a feed UUID or folder UUID — try feed first
    conditions.push(eq(articles.feedUuid, body.uuid));
  }

  if (body.isToday) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    conditions.push(
      sql`${articles.publishedAt} >= ${todayStart.toISOString()}`
    );
  }

  await db
    .update(articles)
    .set({ readStatus: 2 })
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return c.json({ ok: true });
});

// GET /api/article-proxy?url=  — fetch raw HTML of an article page
articlesRouter.get("/article-proxy", async (c) => {
  const url = c.req.query("url");
  if (!url) return c.json({ error: "url is required" }, 400);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; RSSReader/1.0; +https://github.com/cn-rss)",
      },
    });
    const html = await res.text();
    return c.text(html);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// GET /api/image-proxy?url=  — proxy an image to avoid CORS issues
articlesRouter.get("/image-proxy", async (c) => {
  const url = c.req.query("url");
  if (!url) return c.json({ error: "url is required" }, 400);

  try {
    const res = await fetch(url as string);
    const buf = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    return new Response(buf, {
      headers: { "Content-Type": contentType },
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});
