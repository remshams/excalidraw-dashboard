import { describe, expect, it } from "vitest";
import type { DrawingSummary } from "../../shared/types.ts";
import { searchByName } from "./search.ts";

const drawing = (name: string): DrawingSummary => ({
	id: name,
	name,
	createdAt: "",
	updatedAt: "",
	hasPreview: false,
});

const drawings = [drawing("Plan"), drawing("Roadmap"), drawing("Garden plan")];

describe("searchByName", () => {
	it("keeps the drawings whose name contains the query, ignoring case", () => {
		expect(searchByName(drawings, "PLAN").map((d) => d.name)).toEqual([
			"Plan",
			"Garden plan",
		]);
	});

	it("ignores spaces around the query", () => {
		expect(searchByName(drawings, "  road ").map((d) => d.name)).toEqual([
			"Roadmap",
		]);
	});

	it("keeps every drawing for an empty query", () => {
		expect(searchByName(drawings, " ")).toEqual(drawings);
	});
});
