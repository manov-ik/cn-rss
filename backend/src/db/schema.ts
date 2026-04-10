import {
  pgTable,
  text,
  integer,
  timestamp,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Folders ────────────────────────────────────────────────────────────────
export const folders = pgTable("folders", {
  uuid: text("uuid").primaryKey(),
  name: text("name").notNull(),
  sort: integer("sort").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Feeds ──────────────────────────────────────────────────────────────────
export const feeds = pgTable("feeds", {
  uuid: text("uuid").primaryKey(),
  title: text("title"),
  url: text("url").notNull().unique(),
  description: text("description"),
  logo: text("logo"),
  feedType: text("feed_type").default("rss"), // rss | atom | podcast
  folderUuid: text("folder_uuid").references(() => folders.uuid, {
    onDelete: "set null",
  }),
  sort: integer("sort").default(0),
  lastSyncDate: timestamp("last_sync_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Articles ────────────────────────────────────────────────────────────────
export const articles = pgTable(
  "articles",
  {
    uuid: text("uuid").primaryKey(),
    feedUuid: text("feed_uuid")
      .notNull()
      .references(() => feeds.uuid, { onDelete: "cascade" }),
    title: text("title"),
    content: text("content"),
    link: text("link"),
    author: text("author"),
    guid: text("guid").notNull(),
    publishedAt: timestamp("published_at"),
    audioUrl: text("audio_url"),           // for podcast enclosures
    readStatus: integer("read_status").default(1), // 1=unread 2=read
    starred: integer("starred").default(0),         // 0=no 1=yes
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    // Zero-duplicate guarantee via unique constraint
    feedGuidUniq: uniqueIndex("articles_feed_guid_uniq").on(t.feedUuid, t.guid),
  })
);

// ─── User Config (single-row settings table) ─────────────────────────────────
export const userConfig = pgTable("user_config", {
  id: integer("id").primaryKey().default(1),
  theme: text("theme").default("system"),
  syncInterval: integer("sync_interval").default(15),
  layoutPrefs: text("layout_prefs").default("{}"), // JSON string
});

export type Feed = typeof feeds.$inferSelect;
export type NewFeed = typeof feeds.$inferInsert;
export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;
export type UserConfig = typeof userConfig.$inferSelect;
