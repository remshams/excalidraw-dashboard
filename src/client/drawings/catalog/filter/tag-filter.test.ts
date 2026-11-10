import { describe, expect, it } from "vitest";
import type { DrawingSummary } from "#shared/drawings.ts";
import { filterDrawings, rememberTag, rowOrder } from "./tag-filter.ts";

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

describe("rememberTag", () => {
	it("puts a tag first", () => {
		expect(rememberTag(["a", "b"], "c")).toEqual(["c", "a", "b"]);
	});

	it("moves a tag it already has to the front", () => {
		expect(rememberTag(["a", "b", "c"], "c")).toEqual(["c", "a", "b"]);
	});

	it("keeps at most 8 tags, dropping the oldest", () => {
		const eight = ["h", "g", "f", "e", "d", "c", "b", "a"];

		expect(rememberTag(eight, "i")).toEqual([
			"i",
			"h",
			"g",
			"f",
			"e",
			"d",
			"c",
			"b",
		]);
	});
});

describe("rowOrder", () => {
	it("puts the selected tags first in the order they were selected, then the rest newest first", () => {
		expect(rowOrder(["d", "c", "b", "a"], ["b", "d"])).toEqual([
			"b",
			"d",
			"c",
			"a",
		]);
	});

	it("keeps the recent order without a selection", () => {
		expect(rowOrder(["c", "b", "a"], [])).toEqual(["c", "b", "a"]);
	});

	it("keeps a selected tag that dropped out of the recent tags", () => {
		expect(rowOrder(["b", "c"], ["a", "b"])).toEqual(["a", "b", "c"]);
	});
});
