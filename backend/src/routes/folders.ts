import { Hono } from "hono";
import { db } from "../db";
import { folders } from "../db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export const foldersRouter = new Hono();

// GET /api/folders
foldersRouter.get("/", async (c) => {
  const rows = await db.select().from(folders).orderBy(folders.sort);
  return c.json(rows);
});

// POST /api/folders  { name }
foldersRouter.post("/", async (c) => {
  const { name } = await c.req.json<{ name: string }>();
  if (!name) return c.json({ error: "name is required" }, 400);

  const uuid = randomUUID();
  await db.insert(folders).values({ uuid, name, sort: 0 });
  const [row] = await db.select().from(folders).where(eq(folders.uuid, uuid));
  return c.json(row, 201);
});

// PUT /api/folders/:uuid  { name }
foldersRouter.put("/:uuid", async (c) => {
  const { uuid } = c.req.param();
  const { name } = await c.req.json<{ name: string }>();
  if (!name) return c.json({ error: "name is required" }, 400);

  await db.update(folders).set({ name }).where(eq(folders.uuid, uuid));
  const [row] = await db.select().from(folders).where(eq(folders.uuid, uuid));
  if (!row) return c.json({ error: "Folder not found" }, 404);
  return c.json(row);
});

// DELETE /api/folders/:uuid
foldersRouter.delete("/:uuid", async (c) => {
  const { uuid } = c.req.param();
  await db.delete(folders).where(eq(folders.uuid, uuid));
  return c.json({ ok: true });
});
