import { afterEach, describe, expect, it, vi } from "vitest";
import type { DrawingSummary } from "#shared/drawings.ts";
import {
	create,
	createTag,
	putTags,
	request,
	send,
	sendRaw,
	setUpTestApi,
	tagIdsOf,
	testDb,
} from "./test-api.ts";

setUpTestApi();
afterEach(() => vi.restoreAllMocks());

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

	it.each([
		["a blank name", { name: "  " }],
		["no name", {}],
	])("creates a scratchpad from %s", async (_, body) => {
		const response = await send("POST", "/drawings", body);

		expect(response.status).toBe(201);
		expect(await response.json()).toMatchObject({ name: null, scene: null });
	});

	it("creates a scratchpad with the client's ID and its first scene", async () => {
		const id = "0b9c1a52-6f0e-4d39-9a51-0f6d3c2b7e11";

		const response = await send("POST", "/drawings", { id, scene: "{}" });

		expect(response.status).toBe(201);
		expect(await (await send("GET", `/drawings/${id}`)).json()).toMatchObject({
			id,
			name: null,
			scene: "{}",
		});
	});

	it("refuses an ID another drawing has with 409 and keeps that drawing", async () => {
		const id = "0b9c1a52-6f0e-4d39-9a51-0f6d3c2b7e11";
		await send("POST", "/drawings", { id, name: "Plan" });

		const response = await send("POST", "/drawings", { id, scene: "{}" });

		expect(response.status).toBe(409);
		expect(await response.text()).toBe("A drawing with this ID exists");
		expect(await (await send("GET", `/drawings/${id}`)).json()).toMatchObject({
			name: "Plan",
			scene: null,
		});
	});

	it("names a scratchpad through a rename", async () => {
		const { id } = await (await send("POST", "/drawings", {})).json();

		await send("PUT", `/drawings/${id}`, { name: "Plan" });

		expect(await (await send("GET", `/drawings/${id}`)).json()).toMatchObject({
			name: "Plan",
		});
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

	it.each([
		["malformed JSON", "{nope", "Send the drawing as a JSON object"],
		["a body that isn't an object", "[]", "Send the drawing as a JSON object"],
		["a name that isn't text", '{"name":5}', "The name must be text"],
		["a scene that isn't text", '{"scene":{}}', "The scene must be text"],
		["an ID that isn't text", '{"id":5}', "The ID must be a UUID"],
		["an ID that isn't a UUID", '{"id":"new"}', "The ID must be a UUID"],
	])(
		"rejects %s when creating a drawing with 400",
		async (_, body, message) => {
			const before = await (await send("GET", "/drawings")).json();

			const logged = vi.spyOn(console, "error").mockImplementation(() => {});

			const response = await sendRaw("POST", "/drawings", body);

			expect(response.status).toBe(400);
			expect(logged).not.toHaveBeenCalled();
			expect(response.headers.get("Content-Type")).toMatch(/^text\/plain/);
			expect(await response.text()).toBe(message);
			expect(await (await send("GET", "/drawings")).json()).toEqual(before);
		},
	);

	it.each([
		["malformed JSON", "{nope", "Send the changes as a JSON object"],
		["a body that isn't an object", "[]", "Send the changes as a JSON object"],
		["a name that isn't text", '{"name":5}', "The name must be text"],
		["a scene that isn't text", '{"scene":{}}', "The scene must be text"],
	])(
		"rejects %s when updating a drawing with 400",
		async (_, body, message) => {
			const { id } = await create("Plan");
			const before = await (await send("GET", `/drawings/${id}`)).json();

			const logged = vi.spyOn(console, "error").mockImplementation(() => {});

			const response = await sendRaw("PUT", `/drawings/${id}`, body);

			expect(response.status).toBe(400);
			expect(logged).not.toHaveBeenCalled();
			expect(response.headers.get("Content-Type")).toMatch(/^text\/plain/);
			expect(await response.text()).toBe(message);
			expect(await (await send("GET", `/drawings/${id}`)).json()).toEqual(
				before,
			);
		},
	);
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

	it("refuses tags on a scratchpad with 400 and takes an empty set", async () => {
		const { id } = await (await send("POST", "/drawings", {})).json();
		const tag = await createTag("Work");

		const refused = await putTags(id, [tag.id]);
		const emptied = await putTags(id, []);

		expect(refused.status).toBe(400);
		expect(await refused.text()).toBe(
			"A scratchpad takes no tags; save it as a drawing first",
		);
		expect(emptied.status).toBe(200);
		expect(await tagIdsOf(id)).toEqual([]);
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

		const response = await sendRaw("PUT", `/drawings/${id}/tags`, "{nope");

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
