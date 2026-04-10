import Parser from "rss-parser";
import { db } from "../db";
import { feeds, articles } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

const parser = new Parser({
  customFields: {
    item: [
      ["enclosure", "enclosure"],
      ["media:content", "mediaContent"],
    ],
  },
});

export interface ParsedFeed {
  title: string;
  description: string;
  link: string;
  logo: string;
  feedType: string;
  items: ParsedItem[];
}

export interface ParsedItem {
  guid: string;
  title: string;
  content: string;
  link: string;
  author: string;
  publishedAt: Date | null;
  audioUrl: string | null;
}

/** Fetch + parse a remote RSS/Atom URL without saving to DB */
export async function fetchAndParseFeed(url: string): Promise<ParsedFeed> {
  const feed = await parser.parseURL(url);

  const items = (feed.items || []).map((item) => {
    const audioUrl =
      (item as any).enclosure?.url &&
      (item as any).enclosure?.type?.startsWith("audio")
        ? (item as any).enclosure.url
        : null;

    const anyItem = item as any;
    return {
      guid: anyItem.guid || anyItem.link || anyItem.title || randomUUID(),
      title: anyItem.title ?? "",
      content: anyItem.content ?? anyItem.summary ?? anyItem["content:encoded"] ?? "",
      link: anyItem.link ?? "",
      author: anyItem.creator ?? anyItem.author ?? "",
      publishedAt: anyItem.pubDate ? new Date(anyItem.pubDate) : null,
      audioUrl,
    } as ParsedItem;
  });

  return {
    title: feed.title ?? "Untitled Feed",
    description: feed.description ?? "",
    link: feed.link ?? url,
    logo: (feed.image as any)?.url ?? feed.itunes?.image ?? "",
    feedType: items.some((i) => i.audioUrl) ? "podcast" : "rss",
    items,
  };
}

/** Upsert articles for a given feedUuid. Uses ON CONFLICT DO NOTHING via Drizzle. */
export async function upsertArticles(
  feedUuid: string,
  items: ParsedItem[]
): Promise<number> {
  if (items.length === 0) return 0;

  const rows = items.map((item) => ({
    uuid: randomUUID(),
    feedUuid,
    title: item.title,
    content: item.content,
    link: item.link,
    author: item.author,
    guid: item.guid,
    publishedAt: item.publishedAt,
    audioUrl: item.audioUrl,
    readStatus: 1,
    starred: 0,
  }));

  // ON CONFLICT (feed_uuid, guid) DO NOTHING
  await db
    .insert(articles)
    .values(rows)
    .onConflictDoNothing();

  return rows.length;
}

const SYNC_THRESHOLD_MINUTES = 15;

/** Main sync function: respects 15-min cooldown unless forced. */
export async function syncFeedByUuid(
  feedUuid: string,
  force = false
): Promise<{ synced: boolean; newArticles: number }> {
  const [feed] = await db
    .select()
    .from(feeds)
    .where(eq(feeds.uuid, feedUuid))
    .limit(1);

  if (!feed) throw new Error(`Feed not found: ${feedUuid}`);

  const now = new Date();
  const lastSync = feed.lastSyncDate ? new Date(feed.lastSyncDate) : null;
  const minutesSinceSync = lastSync
    ? (now.getTime() - lastSync.getTime()) / 60000
    : Infinity;

  if (!force && minutesSinceSync < SYNC_THRESHOLD_MINUTES) {
    return { synced: false, newArticles: 0 };
  }

  const parsed = await fetchAndParseFeed(feed.url);
  const newArticles = await upsertArticles(feedUuid, parsed.items);

  await db
    .update(feeds)
    .set({ lastSyncDate: now })
    .where(eq(feeds.uuid, feedUuid));

  return { synced: true, newArticles };
}
