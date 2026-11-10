import { describe, expect, it } from "vitest";
import type { DrawingSummary } from "#shared/drawings.ts";
import { filterDrawings, joinRow } from "./tag-filter.ts";

const drawing = (name: string, tagIds: string[]): DrawingSummary => ({
	id: name,
	name,
	createdAt: "",
	updatedAt: "",
	previewUpdatedAt: null,
	tagIds,
});

const drawings = [
	drawing("Garden plan", ["home"]),
	drawing("Office plan", ["work"]),
	drawing("Roadmap", ["work", "ideas"]),
	drawing("Shopping list", []),
];

const names = (tagIds: string[], query = "") =>
	filterDrawings(drawings, tagIds, query).map(({ name }) => name);

describe("filterDrawings", () => {
	it("keeps every drawing when no tag is selected", () => {
		expect(names([])).toEqual([
			"Garden plan",
			"Office plan",
			"Roadmap",
			"Shopping list",
		]);
	});

	it("keeps the drawings that carry the selected tag", () => {
		expect(names(["work"])).toEqual(["Office plan", "Roadmap"]);
	});

	it("keeps the drawings that carry any of several tags", () => {
		expect(names(["home", "ideas"])).toEqual(["Garden plan", "Roadmap"]);
	});

	it("keeps nothing when no drawing carries the tag", () => {
		expect(names(["later"])).toEqual([]);
	});

	it("narrows the tagged drawings by name", () => {
		expect(names(["home", "work"], " PLAN ")).toEqual([
			"Garden plan",
			"Office plan",
		]);
		expect(names(["work", "ideas"], "road")).toEqual(["Roadmap"]);
	});

	it("searches every drawing by name when no tag is selected", () => {
		expect(names([], "list")).toEqual(["Shopping list"]);
	});

	it("finds nothing when the name matches only outside the filter", () => {
		expect(names(["home"], "office")).toEqual([]);
	});
});

describe("joinRow", () => {
	const eight = ["a", "b", "c", "d", "e", "f", "g", "h"];

	it("adds a tag at the end", () => {
		expect(joinRow(["a", "b"], "c", ["c"])).toEqual(["a", "b", "c"]);
	});

	it("leaves a tag it already has where it is", () => {
		expect(joinRow(["a", "b", "c"], "a", ["a"])).toEqual(["a", "b", "c"]);
	});

	it("drops the oldest tag that isn't selected when the row grows past 8", () => {
		expect(joinRow(eight, "i", ["a", "c", "i"])).toEqual([
			"a",
			"c",
			"d",
			"e",
			"f",
			"g",
			"h",
			"i",
		]);
	});

	it("keeps every selected tag, so the row can hold more than 8", () => {
		expect(joinRow(eight, "i", [...eight, "i"])).toEqual([...eight, "i"]);
	});

	it("drops unselected tags until the row fits again", () => {
		const ten = [...eight, "i", "j"];

		expect(joinRow(ten, "k", ["k"])).toEqual([
			"d",
			"e",
			"f",
			"g",
			"h",
			"i",
			"j",
			"k",
		]);
	});
});
