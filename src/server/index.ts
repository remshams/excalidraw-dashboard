import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { openDrawingStore } from "./drawing-store.ts";

const port = Number(process.env.PORT ?? 3001);
const dataDir = process.env.DATA_DIR ?? join(process.cwd(), "data");
mkdirSync(dataDir, { recursive: true });

const store = openDrawingStore(join(dataDir, "drawings.db"));
const app = createApp(store, {
	staticDir: process.env.NODE_ENV === "production" ? "./dist" : undefined,
});

serve({ fetch: app.fetch, port }, (info) => {
	console.log(`Server listening on http://localhost:${info.port}`);
});
