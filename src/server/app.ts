import { readFileSync } from "node:fs";
import { join } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { drawingRoutes } from "./drawing-routes.ts";
import type { DrawingStore } from "./drawing-store.ts";
import { tagRoutes } from "./tag-routes.ts";
import type { TagStore } from "./tag-store.ts";

type Stores = { drawings: DrawingStore; tags: TagStore };

type AppOptions = {
	/** Directory of the Vite build. When set, the app also serves the client. */
	staticDir?: string;
};

/** Mounts the HTTP API of each aggregate under `/api` and, if asked, serves the client. */
export function createApp(
	{ drawings, tags }: Stores,
	options: AppOptions = {},
) {
	const api = new Hono()
		.route("/drawings", drawingRoutes(drawings))
		.route("/tags", tagRoutes(tags))
		// Without this, the client's fallback below would answer an unknown API path with index.html.
		.all("*", (c) => c.notFound());

	const app = new Hono().route("/api", api);

	if (options.staticDir) {
		const indexHtml = readFileSync(
			join(options.staticDir, "index.html"),
			"utf8",
		);
		app.use("/*", serveStatic({ root: options.staticDir }));
		// The client reads the open drawing from the path, such as /drawings/<id>.
		app.get("*", (c) => c.html(indexHtml));
	}

	return app;
}
