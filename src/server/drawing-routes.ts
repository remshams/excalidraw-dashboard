import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type {
	CreateDrawingRequest,
	UpdateDrawingRequest,
} from "#shared/drawings.ts";
import type { DrawingTagsRequest } from "#shared/tags.ts";
import type { DrawingStore } from "./drawing-store.ts";
import { type Invalid, readJson } from "./request.ts";

/** Previews are small images; a real one stays far below this. */
const MAX_PREVIEW_BYTES = 2 * 1024 * 1024;

/** The tag IDs from a `PUT /drawings/:id/tags` body, or why it is invalid. */
function parseDrawingTagsRequest(body: unknown): DrawingTagsRequest | Invalid {
	const { tagIds } = (body ?? {}) as Partial<Record<string, unknown>>;
	const valid =
		Array.isArray(tagIds) && tagIds.every((id) => typeof id === "string");
	return valid
		? { tagIds }
		: { invalid: "Send the tags as JSON with an array of tag IDs" };
}

/**
 * The HTTP routes of the drawing aggregate, mounted at `/api/drawings`: the
 * drawing with its scene, its preview and its set of tag IDs. Scenes have no
 * body limit, because scenes with embedded images can be large.
 */
export function drawingRoutes(store: DrawingStore) {
	return new Hono()
		.get("/", (c) => c.json(store.list()))
		.post("/", async (c) => {
			const body = await c.req.json<CreateDrawingRequest>();
			const name = body.name?.trim() || "Untitled";
			return c.json(store.create(name), 201);
		})
		.get("/:id", (c) => {
			const drawing = store.get(c.req.param("id"));
			return drawing ? c.json(drawing) : c.notFound();
		})
		.put("/:id", async (c) => {
			const body = await c.req.json<UpdateDrawingRequest>();
			const drawing = store.update(c.req.param("id"), {
				name: body.name?.trim() || undefined,
				scene: body.scene,
			});
			return drawing ? c.json(drawing) : c.notFound();
		})
		.delete("/:id", (c) =>
			store.delete(c.req.param("id")) ? c.body(null, 204) : c.notFound(),
		)
		.get("/:id/preview", (c) => {
			const preview = store.getPreview(c.req.param("id"));
			if (!preview) return c.notFound();
			// Clients must version the URL with previewUpdatedAt; otherwise a browser keeps the old image (ADR 0001).
			return c.body(new Uint8Array(preview), 200, {
				"Content-Type": "image/png",
				"Cache-Control": "private, max-age=31536000, immutable",
			});
		})
		.put(
			"/:id/preview",
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
		.delete("/:id/preview", (c) => {
			const drawing = store.setPreview(c.req.param("id"), null);
			return drawing ? c.json(drawing) : c.notFound();
		})
		.put("/:id/tags", async (c) => {
			const request = parseDrawingTagsRequest(await readJson(c));
			if ("invalid" in request) return c.text(request.invalid, 400);
			const drawing = store.setTags(c.req.param("id"), request.tagIds);
			if (drawing === "unknown-tag") {
				return c.text("A tag ID names no tag", 400);
			}
			return drawing ? c.json(drawing) : c.notFound();
		});
}
