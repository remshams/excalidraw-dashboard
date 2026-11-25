import { describe, expect, it } from "vitest";
import type { DrawingSummary } from "#shared/drawings.ts";
import { isSaved, newScratchpadId, scratchpadsOf } from "./scratchpad.ts";

const summary = (
	id: string,
	name: string | null,
	updatedAt = "",
): DrawingSummary => ({
	id,
	name,
	createdAt: "",
	updatedAt,
	previewUpdatedAt: null,
	tagIds: [],
});

describe("scratchpad", () => {
	it("tells a named drawing from a scratchpad", () => {
		expect(isSaved(summary("1", "Plan"))).toBe(true);
		expect(isSaved(summary("2", null))).toBe(false);
	});

	it("lists the scratchpads most recently edited first", () => {
		const drawings = [
			summary("a", null, "2026-11-20T00:00:00.000Z"),
			summary("b", "Plan", "2026-11-26T00:00:00.000Z"),
			summary("c", null, "2026-11-25T00:00:00.000Z"),
		];

		expect(scratchpadsOf(drawings).map(({ id }) => id)).toEqual(["c", "a"]);
		expect(drawings.map(({ id }) => id)).toEqual(["a", "b", "c"]);
	});

	it("makes a random version 4 UUID for a new scratchpad", () => {
		const ids = new Set(Array.from({ length: 20 }, newScratchpadId));

		expect(ids.size).toBe(20);
		for (const id of ids) {
			expect(id).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
			);
		}
	});
});
