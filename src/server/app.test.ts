import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Drawing, DrawingSummary } from "../shared/types.ts";
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
