import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Drawing, DrawingSummary } from "../shared/drawings.ts";
import { createApp } from "./app.ts";
import { type DrawingStore, openDrawingStore } from "./drawing-store.ts";

let store: DrawingStore;
let app: ReturnType<typeof createApp>;

const send = (method: string, path: string, body?: unknown) =>
	app.request(`/api${path}`, {
		method,
		headers: { "Content-Type": "application/json" },
		body: body === undefined ? undefined : JSON.stringify(body),
	});

/** Bytes that start like a PNG; the server checks only the Content-Type. */
const png = (fill = 1, size = 16) =>
	new Uint8Array(size).fill(fill).fill(137, 0, 1);

const putPreview = (
	id: string,
	body: Uint8Array<ArrayBuffer>,
	type = "image/png",
) =>
	app.request(`/api/drawings/${id}/preview`, {
		method: "PUT",
		headers: { "Content-Type": type },
		body,
	});

const getPreview = (id: string, version = "") =>
	app.request(`/api/drawings/${id}/preview${version}`);

const create = async (name: string): Promise<Drawing> =>
	(await send("POST", "/drawings", { name })).json();

beforeEach(() => {
	store = openDrawingStore(":memory:");
	app = createApp(store);
});

afterEach(() => store.close());

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
			() => app.request("/api/drawings/missing/preview", { method: "DELETE" }),
		],
	])(
		"returns 404 for %s on the preview of an unknown drawing",
		async (_, call) => {
			expect((await call()).status).toBe(404);
		},
	);
});

describe("client build", () => {
	let staticDir: string;

	beforeEach(() => {
		staticDir = mkdtempSync(join(tmpdir(), "client-build-"));
		writeFileSync(join(staticDir, "index.html"), "<p>client</p>");
		app = createApp(store, { staticDir });
	});

	afterEach(() => rmSync(staticDir, { recursive: true }));

	it("serves the client for a drawing's path", async () => {
		const response = await app.request("/drawings/some-id");

		expect(response.status).toBe(200);
		expect(await response.text()).toBe("<p>client</p>");
	});

	it("answers an unknown API path with 404, not the client", async () => {
		const response = await app.request("/api/unknown");

		expect(response.status).toBe(404);
		expect(await response.text()).not.toContain("client");
	});
});
