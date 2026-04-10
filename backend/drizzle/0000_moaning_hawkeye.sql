CREATE TABLE "articles" (
	"uuid" text PRIMARY KEY NOT NULL,
	"feed_uuid" text NOT NULL,
	"title" text,
	"content" text,
	"link" text,
	"author" text,
	"guid" text NOT NULL,
	"published_at" timestamp,
	"audio_url" text,
	"read_status" integer DEFAULT 1,
	"starred" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feeds" (
	"uuid" text PRIMARY KEY NOT NULL,
	"title" text,
	"url" text NOT NULL,
	"description" text,
	"logo" text,
	"feed_type" text DEFAULT 'rss',
	"folder_uuid" text,
	"sort" integer DEFAULT 0,
	"last_sync_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "feeds_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "folders" (
	"uuid" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_config" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"theme" text DEFAULT 'system',
	"sync_interval" integer DEFAULT 15,
	"layout_prefs" text DEFAULT '{}'
);
--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_feed_uuid_feeds_uuid_fk" FOREIGN KEY ("feed_uuid") REFERENCES "public"."feeds"("uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feeds" ADD CONSTRAINT "feeds_folder_uuid_folders_uuid_fk" FOREIGN KEY ("folder_uuid") REFERENCES "public"."folders"("uuid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "articles_feed_guid_uniq" ON "articles" USING btree ("feed_uuid","guid");