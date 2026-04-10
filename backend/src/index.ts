import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { foldersRouter } from "./routes/folders";
import { feedsRouter } from "./routes/feeds";
import { articlesRouter } from "./routes/articles";
import { settingsRouter } from "./routes/settings";
import { opmlRouter } from "./routes/opml";

const app = new Hono();

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://localhost:4173"],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get("/", (c) => c.json({ status: "ok", service: "cn-rss backend" }));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.route("/api/folders", foldersRouter);
app.route("/api", feedsRouter);        // feeds, add_feed, fetch_feed, move, sort, icon
app.route("/api/articles", articlesRouter);
app.route("/api", settingsRouter);     // /api/user-config GET + POST
app.route("/api", opmlRouter);         // /api/export_opml, /api/import_opml

// ─── Start ───────────────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT ?? "3001", 10);

serve({ fetch: app.fetch, port }, () => {
  console.log(`🚀 cn-rss backend running at http://localhost:${port}`);
});



