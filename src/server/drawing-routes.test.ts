import { describe, expect, it } from "vitest";
import type { DrawingSummary } from "../shared/drawings.ts";
import {
	create,
	createTag,
	putTags,
	request,
	send,
	setUpTestApi,
	tagIdsOf,
	testDb,
} from "./test-api.ts";

setUpTestApi();

/** Bytes that start like a PNG; the server checks only the Content-Type. */
const png = (fill = 1, size = 16) =>
	new Uint8Array(size).fill(fill).fill(137, 0, 1);

const putPreview = (
	id: string,
	body: Uint8Array<ArrayBuffer>,
	type = "image/png",
) =>
	request(`/api/drawings/${id}/preview`, {
		method: "PUT",
		headers: { "Content-Type": type },
		body,
	});

const getPreview = (id: string, version = "") =>
	request(`/api/drawings/${id}/preview${version}`);

describe("drawings API", () => {
	it("creates a drawing without a scene", async () => {
		const response = await send("POST", "/drawings", { name: " Plan " });

		expect(response.status).toBe(201);
		expect(await response.json()).toMatchObject({ name: "Plan", scene: null });
	});

	it("names a drawing Untitled when the name is blank", async () => {
		expect((await create("  ")).name).toBe("Untitled");
	});

	it("lists drawings by name, ignoring case", async () => {
		await create("beta");
		await create("Alpha");

		const list: DrawingSummary[] = await (
			await send("GET", "/drawings")
		).json();

		expect(list.map((d) => d.name)).toEqual(["Alpha", "beta"]);
		expect(list[0]).not.toHaveProperty("scene");
	});

	it("saves a scene and keeps the name", async () => {
		const { id } = await create("Plan");

		const response = await send("PUT", `/drawings/${id}`, {
			scene: '{"elements":[]}',
		});

		expect(response.status).toBe(200);
		expect(await (await send("GET", `/drawings/${id}`)).json()).toMatchObject({
			name: "Plan",
			scene: '{"elements":[]}',
		});
	});

	it("renames a drawing and keeps the scene", async () => {
		const { id } = await create("Plan");
		await send("PUT", `/drawings/${id}`, { scene: "{}" });

		await send("PUT", `/drawings/${id}`, { name: "Roadmap" });

		expect(await (await send("GET", `/drawings/${id}`)).json()).toMatchObject({
			name: "Roadmap",
			scene: "{}",
		});
	});

	it("ignores a blank name on update", async () => {
		const { id } = await create("Plan");

		const updated: DrawingSummary = await (
			await send("PUT", `/drawings/${id}`, { name: " " })
		).json();

		expect(updated.name).toBe("Plan");
	});

	it("deletes a drawing", async () => {
		const { id } = await create("Plan");

		expect((await send("DELETE", `/drawings/${id}`)).status).toBe(204);
		expect((await send("GET", `/drawings/${id}`)).status).toBe(404);
	});

	it.each([
		["GET", undefined],
		["PUT", { name: "x" }],
		["DELETE", undefined],
	])("returns 404 for %s on an unknown drawing", async (method, body) => {
		expect((await send(method, "/drawings/missing", body)).status).toBe(404);
	});
});

describe("drawing previews API", () => {
	it("creates a drawing without a preview", async () => {
		expect((await create("Plan")).previewUpdatedAt).toBeNull();
	});

	it("stores a preview and serves it with a long-lived cache header", async () => {
		const { id } = await create("Plan");

		const stored = await putPreview(id, png(7));
		const served = await getPreview(id, "?v=1");

		expect(stored.status).toBe(200);
		expect(served.status).toBe(200);
		expect(served.headers.get("Content-Type")).toBe("image/png");
		expect(served.headers.get("Cache-Control")).toBe(
			"private, max-age=31536000, immutable",
		);
		expect(new Uint8Array(await served.arrayBuffer())).toEqual(png(7));
	});

	it("sets previewUpdatedAt and leaves updatedAt alone", async () => {
		const drawing = await create("Plan");

		const summary: DrawingSummary = await (
			await putPreview(drawing.id, png())
		).json();

		expect(summary.previewUpdatedAt).toEqual(expect.any(String));
		expect(summary.updatedAt).toBe(drawing.updatedAt);
		expect(summary).not.toHaveProperty("scene");
		const list: DrawingSummary[] = await (
			await send("GET", "/drawings")
		).json();
		expect(list[0].previewUpdatedAt).toBe(summary.previewUpdatedAt);
	});

	it("replaces a preview with a new version", async () => {
		const { id } = await create("Plan");
		const first: DrawingSummary = await (await putPreview(id, png(1))).json();
		await new Promise((resolve) => setTimeout(resolve, 5));

		const second: DrawingSummary = await (await putPreview(id, png(2))).json();

		expect(second.previewUpdatedAt).not.toBe(first.previewUpdatedAt);
		expect(new Uint8Array(await (await getPreview(id)).arrayBuffer())).toEqual(
			png(2),
		);
	});

	it("removes a preview", async () => {
		const drawing = await create("Plan");
		await putPreview(drawing.id, png());

		const response = await send("DELETE", `/drawings/${drawing.id}/preview`);
		const summary: DrawingSummary = await response.json();

		expect(response.status).toBe(200);
		expect(summary.previewUpdatedAt).toBeNull();
		expect(summary.updatedAt).toBe(drawing.updatedAt);
		expect((await getPreview(drawing.id)).status).toBe(404);
	});

	it("keeps a scene saved after the preview", async () => {
		const { id } = await create("Plan");
		await putPreview(id, png());

		await send("PUT", `/drawings/${id}`, { scene: "{}" });

		expect((await getPreview(id)).status).toBe(200);
	});

	it("rejects a preview that isn't a PNG with 415", async () => {
		const { id } = await create("Plan");

		const response = await putPreview(id, png(), "image/jpeg");

		expect(response.status).toBe(415);
		expect(await response.text()).toBe("Previews must be PNG images");
		expect((await getPreview(id)).status).toBe(404);
	});

	it("accepts a PNG media type in any case and with parameters", async () => {
		const { id } = await create("Plan");

		const response = await putPreview(id, png(), " IMAGE/PNG ; q=1");

		expect(response.status).toBe(200);
		expect((await getPreview(id)).status).toBe(200);
	});

	it("rejects a preview over 2 MB with 413", async () => {
		const { id } = await create("Plan");

		const tooLarge = await putPreview(id, png(1, 2 * 1024 * 1024 + 1));
		const atLimit = await putPreview(id, png(1, 2 * 1024 * 1024));

		expect(tooLarge.status).toBe(413);
		expect(atLimit.status).toBe(200);
	});

	it("returns 404 for a drawing without a preview", async () => {
		const { id } = await create("Plan");

		expect((await getPreview(id)).status).toBe(404);
	});

	it.each([
		["GET", () => getPreview("missing")],
		["PUT", () => putPreview("missing", png())],
		[
			"DELETE",
			() => request("/api/drawings/missing/preview", { method: "DELETE" }),
		],
	])(
		"returns 404 for %s on the preview of an unknown drawing",
		async (_, call) => {
			expect((await call()).status).toBe(404);
		},
	);
});

describe("drawing tags API", () => {
	it("starts a drawing without tags", async () => {
		const drawing = await create("Plan");

		expect(drawing.tagIds).toEqual([]);
		expect(await tagIdsOf(drawing.id)).toEqual([]);
	});

	it("replaces a drawing's tags and lists them sorted by ID", async () => {
		const { id } = await create("Plan");
		const tagIds = [
			(await createTag("Work")).id,
			(await createTag("Idea")).id,
			(await createTag("Draft")).id,
		];
		await putTags(id, tagIds.slice(0, 2));

		const response = await putTags(id, tagIds.slice(1));
		const summary: DrawingSummary = await response.json();
		const list: DrawingSummary[] = await (
			await send("GET", "/drawings")
		).json();

		const expected = tagIds.slice(1).sort();
		expect(response.status).toBe(200);
		expect(summary.tagIds).toEqual(expected);
		expect(list[0].tagIds).toEqual(expected);
	});

	it("keeps a tag once when the request names it twice", async () => {
		const { id } = await create("Plan");
		const tag = await createTag("Work");

		const summary: DrawingSummary = await (
			await putTags(id, [tag.id, tag.id])
		).json();

		expect(summary.tagIds).toEqual([tag.id]);
	});

	it("rejects an unknown tag ID with 400 and keeps the tags", async () => {
		const { id } = await create("Plan");
		const tag = await createTag("Work");
		const other = await createTag("Idea");
		await putTags(id, [tag.id]);

		const response = await putTags(id, [other.id, "missing"]);

		expect(response.status).toBe(400);
		expect(await response.text()).toBe("A tag ID names no tag");
		expect(await tagIdsOf(id)).toEqual([tag.id]);
	});

	it.each([
		["no tag IDs", undefined],
		["tag IDs that aren't a list", "tag"],
		["a tag ID that isn't text", [1]],
	])("rejects %s with 400", async (_, tagIds) => {
		const { id } = await create("Plan");

		expect((await putTags(id, tagIds)).status).toBe(400);
	});

	it("rejects a body that isn't JSON with 400", async () => {
		const { id } = await create("Plan");

		const response = await request(`/api/drawings/${id}/tags`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: "{nope",
		});

		expect(response.status).toBe(400);
	});

	it("returns 404 for an unknown drawing", async () => {
		const tag = await createTag("Work");

		expect((await putTags("missing", [tag.id])).status).toBe(404);
	});

	it("removes a deleted drawing's tag assignments", async () => {
		const { id } = await create("Plan");
		const tag = await createTag("Work");
		await putTags(id, [tag.id]);

		await send("DELETE", `/drawings/${id}`);

		const rows = testDb()
			.prepare("SELECT count(*) AS count FROM drawing_tags")
			.get() as { count: number };
		expect(rows.count).toBe(0);
	});
});
