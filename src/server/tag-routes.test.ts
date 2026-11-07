import { describe, expect, it } from "vitest";
import type { Tag } from "../shared/tags.ts";
import {
	create,
	createTag,
	putTags,
	request,
	send,
	setUpTestApi,
	tagIdsOf,
} from "./test-api.ts";

setUpTestApi();

const listTags = async (): Promise<Tag[]> =>
	(await send("GET", "/tags")).json();

describe("tags API", () => {
	it("creates a tag with a trimmed label", async () => {
		const response = await send("POST", "/tags", {
			label: " Work ",
			color: "blue",
		});

		expect(response.status).toBe(201);
		expect(await response.json()).toEqual({
			id: expect.any(String),
			label: "Work",
			color: "blue",
		});
	});

	it("lists tags by label, ignoring case", async () => {
		await createTag("beta");
		await createTag("Alpha");

		expect((await listTags()).map((tag) => tag.label)).toEqual([
			"Alpha",
			"beta",
		]);
	});

	it("changes a tag's label and colour", async () => {
		const { id } = await createTag("Work");

		const response = await send("PUT", `/tags/${id}`, {
			label: "Job",
			color: "red",
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ id, label: "Job", color: "red" });
		expect(await listTags()).toEqual([{ id, label: "Job", color: "red" }]);
	});

	it("renames a tag to its own label in another case", async () => {
		const { id } = await createTag("work");

		const response = await send("PUT", `/tags/${id}`, {
			label: "Work",
			color: "blue",
		});

		expect(response.status).toBe(200);
	});

	it("deletes a tag", async () => {
		const { id } = await createTag("Work");

		expect((await send("DELETE", `/tags/${id}`)).status).toBe(204);
		expect(await listTags()).toEqual([]);
	});

	it.each([
		["a blank label", { label: "  ", color: "blue" }, "A tag needs a label"],
		[
			"a label over 30 characters",
			{ label: "a".repeat(31), color: "blue" },
			"A tag label has at most 30 characters",
		],
		["a label that isn't text", { label: 1, color: "blue" }, "Send the tag"],
		["an unknown colour", { label: "Work", color: "gray" }, "Unknown tag"],
	])("rejects %s with 400", async (_, body, message) => {
		const { id } = await createTag("Existing");

		const created = await send("POST", "/tags", body);
		const changed = await send("PUT", `/tags/${id}`, body);

		expect(created.status).toBe(400);
		expect(await created.text()).toContain(message);
		expect(changed.status).toBe(400);
		expect(await listTags()).toEqual([
			{ id, label: "Existing", color: "blue" },
		]);
	});

	it("rejects a body that isn't JSON with 400", async () => {
		const response = await request("/api/tags", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "{nope",
		});

		expect(response.status).toBe(400);
	});

	it("rejects a label another tag has, ignoring case, with 409", async () => {
		await createTag("Ärger");
		const { id } = await createTag("Work");

		const created = await send("POST", "/tags", {
			label: " ärger ",
			color: "red",
		});
		const renamed = await send("PUT", `/tags/${id}`, {
			label: "ÄRGER",
			color: "red",
		});

		expect(created.status).toBe(409);
		expect(await created.text()).toBe('A tag named "ärger" already exists');
		expect(renamed.status).toBe(409);
		expect((await listTags()).map((tag) => tag.label).sort()).toEqual([
			"Work",
			"Ärger",
		]);
	});

	it.each([
		["PUT", { label: "Work", color: "blue" }],
		["DELETE", undefined],
	])("returns 404 for %s on an unknown tag", async (method, body) => {
		expect((await send(method, "/tags/missing", body)).status).toBe(404);
	});

	it("removes a deleted tag from every drawing", async () => {
		const plan = await create("Plan");
		const sketch = await create("Sketch");
		const work = await createTag("Work");
		const idea = await createTag("Idea");
		await putTags(plan.id, [work.id, idea.id]);
		await putTags(sketch.id, [work.id]);

		await send("DELETE", `/tags/${work.id}`);

		expect(await tagIdsOf(plan.id)).toEqual([idea.id]);
		expect(await tagIdsOf(sketch.id)).toEqual([]);
	});
});
