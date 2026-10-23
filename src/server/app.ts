import { readFileSync } from "node:fs";
import { join } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import type {
	CreateDrawingRequest,
	UpdateDrawingRequest,
} from "../shared/types.ts";
import type { DrawingStore } from "./drawing-store.ts";

type AppOptions = {
	/** Directory of the Vite build. When set, the app also serves the client. */
	staticDir?: string;
};

export function createApp(store: DrawingStore, options: AppOptions = {}) {
	const api = new Hono()
		.get("/drawings", (c) => c.json(store.list()))
		.post("/drawings", async (c) => {
			const body = await c.req.json<CreateDrawingRequest>();
			const name = body.name?.trim() || "Untitled";
			return c.json(store.create(name), 201);
		})
		.get("/drawings/:id", (c) => {
			const drawing = store.get(c.req.param("id"));
			return drawing ? c.json(drawing) : c.notFound();
		})
		.put("/drawings/:id", async (c) => {
			const body = await c.req.json<UpdateDrawingRequest>();
			const drawing = store.update(c.req.param("id"), {
				name: body.name?.trim() || undefined,
				scene: body.scene,
			});
			return drawing ? c.json(drawing) : c.notFound();
		})
		.delete("/drawings/:id", (c) =>
			store.delete(c.req.param("id")) ? c.body(null, 204) : c.notFound(),
		)
		.get("/drawings/:id/preview", (c) => {
			const preview = store.getPreview(c.req.param("id"));
			if (!preview) return c.notFound();
			// Clients add the drawing's updatedAt to the URL, so a cached copy stays valid.
			return c.body(new Uint8Array(preview), 200, {
				"Content-Type": "image/png",
				"Cache-Control": "private, max-age=31536000, immutable",
			});
		})
		.put("/drawings/:id/preview", async (c) => {
			if (c.req.header("Content-Type") !== "image/png") {
				return c.text("Previews must be PNG images", 415);
			}
			const preview = new Uint8Array(await c.req.arrayBuffer());
			const drawing = store.setPreview(c.req.param("id"), preview);
			return drawing ? c.json(drawing) : c.notFound();
		})
		.delete("/drawings/:id/preview", (c) => {
			const drawing = store.setPreview(c.req.param("id"), null);
			return drawing ? c.json(drawing) : c.notFound();
		});

	// Scenes with embedded images can be large; Hono applies no body limit by default.
	const app = new Hono().route("/api", api);

	if (options.staticDir) {
		const indexHtml = readFileSync(
			join(options.staticDir, "index.html"),
			"utf8",
		);
		app.use("/*", serveStatic({ root: options.staticDir }));
		app.get("*", (c) => c.html(indexHtml));
	}

	return app;
}
