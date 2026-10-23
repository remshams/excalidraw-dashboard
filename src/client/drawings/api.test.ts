import { afterEach, describe, expect, it, vi } from "vitest";
import {
	deleteDrawing,
	listDrawings,
	previewUrl,
	savePreview,
	updateDrawing,
} from "./api.ts";

const mockFetch = (response: Response) =>
	vi.spyOn(globalThis, "fetch").mockResolvedValue(response);

afterEach(() => vi.restoreAllMocks());

describe("drawings API client", () => {
	it("parses JSON responses", async () => {
		mockFetch(Response.json([{ id: "1" }]));

		expect(await listDrawings()).toEqual([{ id: "1" }]);
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

	it("uploads previews as PNG", async () => {
		const fetch = mockFetch(Response.json({ id: "1" }));
		const png = new Blob(["png"], { type: "image/png" });

		await savePreview("1", png);

		expect(fetch).toHaveBeenCalledWith("/api/drawings/1/preview", {
			method: "PUT",
			body: png,
			headers: { "Content-Type": "image/png" },
		});
	});

	it("versions the preview URL with the update time", () => {
		expect(
			previewUrl({
				id: "1",
				name: "Plan",
				createdAt: "",
				updatedAt: "2026-01-01T00:00:00.000Z",
				hasPreview: true,
			}),
		).toBe("/api/drawings/1/preview?v=2026-01-01T00%3A00%3A00.000Z");
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
});
