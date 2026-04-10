import { Hono } from "hono";
import { db } from "../db";
import { feeds, folders } from "../db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { parseOpml, generateOpml } from "../services/opml";
import { fetchAndParseFeed, upsertArticles } from "../services/rss";

export const opmlRouter = new Hono();

// POST /api/export_opml
opmlRouter.post("/export_opml", async (c) => {
  const xml = await generateOpml();
  return c.text(xml, 200, { "Content-Type": "application/xml" });
});

// POST /api/import_opml  { opmlContent: string }
opmlRouter.post("/import_opml", async (c) => {
  const { opmlContent } = await c.req.json<{ opmlContent: string }>();
  if (!opmlContent)
    return c.json({ error: "opmlContent is required" }, 400);

  const parsed = parseOpml(opmlContent);

  let folder_count = 0;
  let feed_count = 0;
  let failed_count = 0;
  const errors: string[] = [];

  // Create folders + subscribe to their feeds
  for (const folder of parsed.folders) {
    const folderUuid = randomUUID();
    await db
      .insert(folders)
      .values({ uuid: folderUuid, name: folder.name, sort: 0 })
      .onConflictDoNothing();
    folder_count++;

    for (const feedItem of folder.feeds) {
      try {
        const [existing] = await db
          .select()
          .from(feeds)
          .where(eq(feeds.url, feedItem.url))
          .limit(1);

        if (!existing) {
          const feedData = await fetchAndParseFeed(feedItem.url);
          const feedUuid = randomUUID();
          await db.insert(feeds).values({
            uuid: feedUuid,
            title: feedData.title || feedItem.title,
            url: feedItem.url,
            description: feedData.description,
            logo: feedData.logo,
            feedType: feedData.feedType,
            folderUuid,
            sort: 0,
            lastSyncDate: new Date(),
          });
          await upsertArticles(feedUuid, feedData.items);
        } else {
          // Already subscribed — just assign to this folder
          await db
            .update(feeds)
            .set({ folderUuid })
            .where(eq(feeds.uuid, existing.uuid));
        }
        feed_count++;
      } catch (err: any) {
        failed_count++;
        errors.push(`${feedItem.url}: ${err.message}`);
      }
    }
  }

  // Subscribe to root-level feeds
  for (const feedItem of parsed.rootFeeds) {
    try {
      const [existing] = await db
        .select()
        .from(feeds)
        .where(eq(feeds.url, feedItem.url))
        .limit(1);

      if (!existing) {
        const feedData = await fetchAndParseFeed(feedItem.url);
        const feedUuid = randomUUID();
        await db.insert(feeds).values({
          uuid: feedUuid,
          title: feedData.title || feedItem.title,
          url: feedItem.url,
          description: feedData.description,
          logo: feedData.logo,
          feedType: feedData.feedType,
          sort: 0,
          lastSyncDate: new Date(),
        });
        await upsertArticles(feedUuid, feedData.items);
      }
      feed_count++;
    } catch (err: any) {
      failed_count++;
      errors.push(`${feedItem.url}: ${err.message}`);
    }
  }

  return c.json({ folder_count, feed_count, failed_count, errors });
});
