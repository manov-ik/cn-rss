import { Hono } from "hono";
import { db } from "../db";
import { userConfig } from "../db/schema";
import { eq } from "drizzle-orm";

export const settingsRouter = new Hono();

// GET /api/user-config
settingsRouter.get("/user-config", async (c) => {
  let [config] = await db.select().from(userConfig).where(eq(userConfig.id, 1)).limit(1);

  if (!config) {
    // Seed default config row
    await db.insert(userConfig).values({ id: 1, theme: "system", syncInterval: 15, layoutPrefs: "{}" });
    [config] = await db.select().from(userConfig).where(eq(userConfig.id, 1)).limit(1);
  }

  return c.json({
    ...config,
    layout_prefs: JSON.parse(config.layoutPrefs ?? "{}"),
  });
});

// POST /api/user-config
settingsRouter.post("/user-config", async (c) => {
  const body = await c.req.json<{
    theme?: string;
    sync_interval?: number;
    layout_prefs?: Record<string, unknown>;
  }>();

  const updates: Partial<typeof userConfig.$inferInsert> = {};
  if (body.theme !== undefined) updates.theme = body.theme;
  if (body.sync_interval !== undefined) updates.syncInterval = body.sync_interval;
  if (body.layout_prefs !== undefined)
    updates.layoutPrefs = JSON.stringify(body.layout_prefs);

  // Upsert: insert if row doesn't exist, otherwise update
  const [existing] = await db.select().from(userConfig).where(eq(userConfig.id, 1)).limit(1);
  if (existing) {
    await db.update(userConfig).set(updates).where(eq(userConfig.id, 1));
  } else {
    await db.insert(userConfig).values({ id: 1, ...updates });
  }

  const [updated] = await db.select().from(userConfig).where(eq(userConfig.id, 1)).limit(1);
  return c.json(updated);
});
