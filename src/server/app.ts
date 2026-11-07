import { readFileSync } from "node:fs";
import { join } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import { type Context, Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type {
	CreateDrawingRequest,
	UpdateDrawingRequest,
} from "../shared/drawings.ts";
import {
	type DrawingTagsRequest,
	isTagColor,
	MAX_TAG_LABEL_LENGTH,
	type TagRequest,
	tagLabelProblem,
} from "../shared/tags.ts";
import type { DrawingStore } from "./drawing-store.ts";
import type { TagStore } from "./tag-store.ts";

/** Previews are small images; a real one stays far below this. */
const MAX_PREVIEW_BYTES = 2 * 1024 * 1024;

type Invalid = { invalid: string };

/** The JSON body, or undefined if it isn't valid JSON. */
const readJson = (c: Context): Promise<unknown> =>
	c.req.json().catch(() => undefined);

const LABEL_PROBLEMS = {
	empty: "A tag needs a label",
	"too-long": `A tag label has at most ${MAX_TAG_LABEL_LENGTH} characters`,
};

function parseTagRequest(body: unknown): TagRequest | Invalid {
	const { label, color } = (body ?? {}) as Partial<Record<string, unknown>>;
	if (typeof label !== "string") {
		return { invalid: "Send the tag as JSON with a label and a color" };
	}
	const problem = tagLabelProblem(label);
	if (problem) return { invalid: LABEL_PROBLEMS[problem] };
	if (!isTagColor(color)) return { invalid: "Unknown tag colour" };
	return { label, color };
}

function parseDrawingTagsRequest(body: unknown): DrawingTagsRequest | Invalid {
	const { tagIds } = (body ?? {}) as Partial<Record<string, unknown>>;
	const valid =
		Array.isArray(tagIds) && tagIds.every((id) => typeof id === "string");
	return valid
		? { tagIds }
		: { invalid: "Send the tags as JSON with an array of tag IDs" };
}

const labelTaken = (c: Context, { label }: TagRequest) =>
	c.text(`A tag named "${label.trim()}" already exists`, 409);

type Stores = { drawings: DrawingStore; tags: TagStore };

type AppOptions = {
	/** Directory of the Vite build. When set, the app also serves the client. */
	staticDir?: string;
};

export function createApp(
	{ drawings: store, tags }: Stores,
	options: AppOptions = {},
) {
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
			// Clients must version the URL with previewUpdatedAt; otherwise a browser keeps the old image (ADR 0001).
			return c.body(new Uint8Array(preview), 200, {
				"Content-Type": "image/png",
				"Cache-Control": "private, max-age=31536000, immutable",
			});
		})
		.put(
			"/drawings/:id/preview",
			bodyLimit({ maxSize: MAX_PREVIEW_BYTES }),
			async (c) => {
				// Media types are case-insensitive and may carry parameters.
				const mediaType = c.req
					.header("Content-Type")
					?.split(";")[0]
					.trim()
					.toLowerCase();
				if (mediaType !== "image/png") {
					return c.text("Previews must be PNG images", 415);
				}
				const preview = new Uint8Array(await c.req.arrayBuffer());
				const drawing = store.setPreview(c.req.param("id"), preview);
				return drawing ? c.json(drawing) : c.notFound();
			},
		)
		.delete("/drawings/:id/preview", (c) => {
			const drawing = store.setPreview(c.req.param("id"), null);
			return drawing ? c.json(drawing) : c.notFound();
		})
		.put("/drawings/:id/tags", async (c) => {
			const request = parseDrawingTagsRequest(await readJson(c));
			if ("invalid" in request) return c.text(request.invalid, 400);
			const drawing = store.setTags(c.req.param("id"), request.tagIds);
			if (drawing === "unknown-tag") {
				return c.text("A tag ID names no tag", 400);
			}
			return drawing ? c.json(drawing) : c.notFound();
		})
		.get("/tags", (c) => c.json(tags.list()))
		.post("/tags", async (c) => {
			const request = parseTagRequest(await readJson(c));
			if ("invalid" in request) return c.text(request.invalid, 400);
			const tag = tags.create(request);
			return tag === "label-taken" ? labelTaken(c, request) : c.json(tag, 201);
		})
		.put("/tags/:id", async (c) => {
			const request = parseTagRequest(await readJson(c));
			if ("invalid" in request) return c.text(request.invalid, 400);
			const tag = tags.update(c.req.param("id"), request);
			if (tag === "label-taken") return labelTaken(c, request);
			return tag ? c.json(tag) : c.notFound();
		})
		.delete("/tags/:id", (c) =>
			tags.delete(c.req.param("id")) ? c.body(null, 204) : c.notFound(),
		)
		// Without this, the client's fallback below would answer an unknown API path with index.html.
		.all("*", (c) => c.notFound());

	// Scenes with embedded images can be large; Hono applies no body limit by default.
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
