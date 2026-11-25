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

const isObject = (body: unknown): body is Record<string, unknown> =>
	typeof body === "object" && body !== null && !Array.isArray(body);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isOptionalText = (value: unknown): value is string | undefined =>
	value === undefined || typeof value === "string";

/** The ID, name and scene of a `POST /drawings` body, or why it is invalid. */
function parseCreateDrawingRequest(
	body: unknown,
): CreateDrawingRequest | Invalid {
	if (!isObject(body)) return { invalid: "Send the drawing as a JSON object" };
	const { id, name, scene } = body;
	if (id !== undefined && (typeof id !== "string" || !UUID.test(id))) {
		return { invalid: "The ID must be a UUID" };
	}
	if (!isOptionalText(name)) return { invalid: "The name must be text" };
	if (!isOptionalText(scene)) return { invalid: "The scene must be text" };
	return { id, name, scene };
}

/** The changes of a `PUT /drawings/:id` body, or why it is invalid. */
function parseUpdateDrawingRequest(
	body: unknown,
): UpdateDrawingRequest | Invalid {
	if (!isObject(body)) {
		return { invalid: "Send the changes as a JSON object" };
	}
	const { name, scene } = body;
	if (name !== undefined && typeof name !== "string") {
		return { invalid: "The name must be text" };
	}
	if (scene !== undefined && typeof scene !== "string") {
		return { invalid: "The scene must be text" };
	}
	return { name, scene };
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
			const request = parseCreateDrawingRequest(await readJson(c));
			if ("invalid" in request) return c.text(request.invalid, 400);
			const drawing = store.create({
				id: request.id,
				name: request.name?.trim() || null,
				scene: request.scene,
			});
			if (drawing === "id-taken") {
				return c.text("A drawing with this ID exists", 409);
			}
			return c.json(drawing, 201);
		})
		.get("/:id", (c) => {
			const drawing = store.get(c.req.param("id"));
			return drawing ? c.json(drawing) : c.notFound();
		})
		.put("/:id", async (c) => {
			const request = parseUpdateDrawingRequest(await readJson(c));
			if ("invalid" in request) return c.text(request.invalid, 400);
			const drawing = store.update(c.req.param("id"), {
				name: request.name?.trim() || undefined,
				scene: request.scene,
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
