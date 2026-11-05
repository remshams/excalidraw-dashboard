import { describe, expect, it } from "vitest";
import type { DrawingSummary } from "../../shared/types.ts";
import { searchByName } from "./search.ts";

const drawing = (name: string): DrawingSummary => ({
	id: name,
	name,
	createdAt: "",
	updatedAt: "",
	previewUpdatedAt: null,
});

const drawings = [
	drawing("Garden layout"),
	drawing("Kitchen shelves"),
	drawing("Weekend ideas"),
];

const names = (query: string) =>
	searchByName(drawings, query).map((d) => d.name);

describe("searchByName", () => {
	it("finds the drawings whose name contains the query", () => {
		expect(names("en")).toEqual([
			"Garden layout",
			"Kitchen shelves",
			"Weekend ideas",
		]);
		expect(names("shel")).toEqual(["Kitchen shelves"]);
	});

	it("ignores case", () => {
		expect(names("GARDEN")).toEqual(["Garden layout"]);
		expect(searchByName([drawing("KITCHEN")], "kitchen")).toHaveLength(1);
	});

	it("ignores the spaces around the query, not inside it", () => {
		expect(names("  ideas \t")).toEqual(["Weekend ideas"]);
		expect(names("weekend  ideas")).toEqual([]);
	});

	it("matches every drawing for an empty or blank query", () => {
		expect(names("")).toHaveLength(3);
		expect(names("   ")).toHaveLength(3);
	});

	it("finds nothing when no name contains the query", () => {
		expect(names("roadmap")).toEqual([]);
	});

	it("keeps the order of the given drawings", () => {
		expect(names("e").at(0)).toBe("Garden layout");
		expect(searchByName([...drawings].reverse(), "e").at(0)?.name).toBe(
			"Weekend ideas",
		);
	});
});
