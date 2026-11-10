import { describe, expect, it } from "vitest";
import type { DrawingSummary } from "#shared/drawings.ts";
import type { Tag } from "#shared/tags.ts";
import { filterDrawings, newestFirst } from "./tag-filter.ts";

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

describe("newestFirst", () => {
	const tag = (label: string, createdAt: string): Tag => ({
		id: label,
		label,
		color: "blue",
		createdAt,
	});

	it("puts the tag created last first", () => {
		const tags = [
			tag("Old", "2026-01-01T00:00:00.000Z"),
			tag("New", "2026-03-01T00:00:00.000Z"),
			tag("Middle", "2026-02-01T00:00:00.000Z"),
		];

		expect(newestFirst(tags).map(({ label }) => label)).toEqual([
			"New",
			"Middle",
			"Old",
		]);
	});

	it("orders tags created at the same time by label", () => {
		const at = "2026-01-01T00:00:00.000Z";

		expect(
			newestFirst([tag("b", at), tag("a", at)]).map(({ label }) => label),
		).toEqual(["a", "b"]);
	});

	it("leaves the list it gets as it is", () => {
		const tags = [tag("a", "2026-01-01"), tag("b", "2026-02-01")];

		newestFirst(tags);

		expect(tags.map(({ label }) => label)).toEqual(["a", "b"]);
	});
});
