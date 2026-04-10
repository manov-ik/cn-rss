import { db } from "../db";
import { feeds, folders } from "../db/schema";
import { eq } from "drizzle-orm";

export interface OpmlImportResult {
  folder_count: number;
  feed_count: number;
  failed_count: number;
  errors: string[];
}

/** Parse a raw OPML XML string into feeds & folders */
export function parseOpml(opmlContent: string): {
  folders: { name: string; feeds: { title: string; url: string }[] }[];
  rootFeeds: { title: string; url: string }[];
} {
  // Simple regex-based parser for OPML — works for all standard OPML files
  const folderRegex =
    /<outline\s+[^>]*text="([^"]+)"[^>]*(?!\/)>([\s\S]*?)<\/outline>/g;
  const feedRegex =
    /<outline\s+[^>]*type="rss"[^>]*xmlUrl="([^"]+)"[^>]*(?:title="([^"]*)")?[^>]*\/?>/g;

  const parsedFolders: {
    name: string;
    feeds: { title: string; url: string }[];
  }[] = [];
  const rootFeeds: { title: string; url: string }[] = [];

  // Strip the body wrapper to work with outline elements
  const bodyMatch = opmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : opmlContent;

  let folderMatch: RegExpExecArray | null;
  while ((folderMatch = folderRegex.exec(body)) !== null) {
    const folderName = folderMatch[1];
    const folderContent = folderMatch[2];
    const folderFeeds: { title: string; url: string }[] = [];

    let feedMatch: RegExpExecArray | null;
    const innerFeedRegex =
      /<outline\s+[^>]*xmlUrl="([^"]+)"[^>]*(?:title="([^"]*)")?[^>]*\/?>/g;
    while ((feedMatch = innerFeedRegex.exec(folderContent)) !== null) {
      folderFeeds.push({
        url: feedMatch[1],
        title: feedMatch[2] || feedMatch[1],
      });
    }

    if (folderFeeds.length > 0) {
      parsedFolders.push({ name: folderName, feeds: folderFeeds });
    }
  }

  // Get root-level feeds (not inside a folder)
  let rootMatch: RegExpExecArray | null;
  // Remove folder blocks first
  const stripped = body.replace(folderRegex, "");
  while ((rootMatch = feedRegex.exec(stripped)) !== null) {
    rootFeeds.push({ url: rootMatch[1], title: rootMatch[2] || rootMatch[1] });
  }

  return { folders: parsedFolders, rootFeeds };
}

/** Generate an OPML XML string from the user's current feeds & folders */
export async function generateOpml(): Promise<string> {
  const allFolders = await db.select().from(folders);
  const allFeeds = await db.select().from(feeds);

  const folderMap = new Map(allFolders.map((f) => [f.uuid, f]));

  const feedsByFolder = new Map<string | null, typeof allFeeds>(
    [[null, []]] as [string | null, typeof allFeeds][]
  );
  allFolders.forEach((f) => feedsByFolder.set(f.uuid, []));

  for (const feed of allFeeds) {
    const key = feed.folderUuid ?? null;
    if (!feedsByFolder.has(key)) feedsByFolder.set(key, []);
    feedsByFolder.get(key)!.push(feed);
  }

  const feedToOutline = (f: (typeof allFeeds)[0]) =>
    `      <outline type="rss" text="${escapeXml(f.title ?? "")}" title="${escapeXml(f.title ?? "")}" xmlUrl="${escapeXml(f.url)}" htmlUrl="${escapeXml(f.url)}" />`;

  const folderBlocks = allFolders
    .map((folder) => {
      const folderFeeds = feedsByFolder.get(folder.uuid) ?? [];
      return `    <outline text="${escapeXml(folder.name)}" title="${escapeXml(folder.name)}">\n${folderFeeds.map(feedToOutline).join("\n")}\n    </outline>`;
    })
    .join("\n");

  const rootFeedBlocks = (feedsByFolder.get(null) ?? [])
    .map(feedToOutline)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
  <head>
    <title>RSS Subscriptions</title>
  </head>
  <body>
${folderBlocks}
${rootFeedBlocks}
  </body>
</opml>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
