import { afterEach, describe, expect, it, vi } from "vitest";
import {
	ApiError,
	createTag,
	deleteDrawing,
	deletePreview,
	deleteTag,
	listDrawings,
	listTags,
	previewUrl,
	savePreview,
	updateDrawing,
	updateTag,
} from "./api.ts";

const mockFetch = (response: Response) =>
	vi.spyOn(globalThis, "fetch").mockResolvedValue(response);

afterEach(() => vi.restoreAllMocks());

describe("drawings API client", () => {
	it("parses JSON responses", async () => {
		mockFetch(Response.json([{ id: "1" }]));

		expect(await listDrawings()).toEqual([{ id: "1" }]);
	});

	it("lists tags", async () => {
		const fetch = mockFetch(
			Response.json([{ id: "1", label: "Work", color: "blue" }]),
		);

		expect(await listTags()).toEqual([
			{ id: "1", label: "Work", color: "blue" },
		]);

		expect(fetch).toHaveBeenCalledWith("/api/tags", {
			headers: { "Content-Type": "application/json" },
		});
	});

	it("creates a tag", async () => {
		const tag = { id: "1", label: "Work", color: "blue" } as const;
		const fetch = mockFetch(Response.json(tag, { status: 201 }));

		expect(await createTag({ label: "Work", color: "blue" })).toEqual(tag);

		expect(fetch).toHaveBeenCalledWith("/api/tags", {
			method: "POST",
			body: '{"label":"Work","color":"blue"}',
			headers: { "Content-Type": "application/json" },
		});
	});

	it("changes a tag", async () => {
		const tag = { id: "1", label: "Home", color: "pink" } as const;
		const fetch = mockFetch(Response.json(tag));

		expect(await updateTag("1", { label: "Home", color: "pink" })).toEqual(tag);

		expect(fetch).toHaveBeenCalledWith("/api/tags/1", {
			method: "PUT",
			body: '{"label":"Home","color":"pink"}',
			headers: { "Content-Type": "application/json" },
		});
	});

	it("deletes a tag", async () => {
		const fetch = mockFetch(new Response(null, { status: 204 }));

		expect(await deleteTag("1")).toBeUndefined();

		expect(fetch).toHaveBeenCalledWith("/api/tags/1", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
		});
	});

	it("reports a refusal with its status and the server's reason", async () => {
		mockFetch(new Response("A tag needs a label", { status: 400 }));

		const refusal = await createTag({ label: "", color: "blue" }).catch(
			(cause: unknown) => cause,
		);

		expect(refusal).toBeInstanceOf(ApiError);
		expect(refusal).toMatchObject({
			message: "POST /tags failed with 400",
			status: 400,
			text: "A tag needs a label",
		});
	});

	it("sends updates as JSON", async () => {
		const fetch = mockFetch(Response.json({ id: "1" }));

		await updateDrawing("1", { name: "Plan" });

		expect(fetch).toHaveBeenCalledWith("/api/drawings/1", {
			method: "PUT",
			body: '{"name":"Plan"}',
			headers: { "Content-Type": "application/json" },
		});
	});

	it("sends a preview as PNG", async () => {
		const fetch = mockFetch(Response.json({ id: "1" }));
		const png = new Blob(["png"], { type: "image/png" });

		expect(await savePreview("1", png)).toEqual({ id: "1" });

		expect(fetch).toHaveBeenCalledWith("/api/drawings/1/preview", {
			method: "PUT",
			body: png,
			headers: { "Content-Type": "image/png" },
		});
	});

	it("deletes a preview", async () => {
		const fetch = mockFetch(Response.json({ id: "1" }));

		expect(await deletePreview("1")).toEqual({ id: "1" });

		expect(fetch).toHaveBeenCalledWith("/api/drawings/1/preview", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
		});
	});

	it("returns nothing for 204 responses", async () => {
		mockFetch(new Response(null, { status: 204 }));

		expect(await deleteDrawing("1")).toBeUndefined();
	});

	it("throws with method, path and status on failure", async () => {
		mockFetch(new Response(null, { status: 404 }));

		await expect(deleteDrawing("1")).rejects.toThrow(
			"DELETE /drawings/1 failed with 404",
		);
	});

	it("versions a preview's URL with its update time", () => {
		expect(
			previewUrl({
				id: "1",
				name: "Plan",
				createdAt: "",
				updatedAt: "",
				previewUpdatedAt: "2026-01-02T03:04:05.000Z",
				tagIds: [],
			}),
		).toBe("/api/drawings/1/preview?v=2026-01-02T03%3A04%3A05.000Z");
	});

	it("has no preview URL for a drawing without a preview", () => {
		expect(
			previewUrl({
				id: "1",
				name: "Plan",
				createdAt: "",
				updatedAt: "",
				previewUpdatedAt: null,
				tagIds: [],
			}),
		).toBeNull();
	});
});
