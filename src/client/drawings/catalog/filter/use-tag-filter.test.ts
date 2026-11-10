import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Tag } from "#shared/tags.ts";
import { useTagFilter } from "./use-tag-filter.ts";

const tag = (id: string): Tag => ({
	id,
	label: id.toUpperCase(),
	color: "blue",
});

const tags = ["a", "b", "c", "d", "e", "f", "g", "h", "i"].map(tag);

const ids = (list: Tag[]) => list.map(({ id }) => id);

function setup(initial: Tag[] | null = tags) {
	const hook = renderHook(({ loaded }) => useTagFilter(loaded), {
		initialProps: { loaded: initial },
	});
	const toggle = (...tagIds: string[]) => {
		for (const id of tagIds) act(() => hook.result.current.toggle(id));
	};
	return { hook, toggle, current: () => hook.result.current };
}

describe("useTagFilter", () => {
	it("starts with no filter, an empty row and no search", () => {
		const { current } = setup();

		expect(current().selectedTagIds).toEqual([]);
		expect(current().selectedTags).toEqual([]);
		expect(current().rowTags).toEqual([]);
		expect(current().query).toBe("");
	});

	it("keeps the selected tags in the order they were selected", () => {
		const { current, toggle } = setup();

		toggle("c", "a");

		expect(current().selectedTagIds).toEqual(["c", "a"]);
		expect(ids(current().selectedTags)).toEqual(["c", "a"]);
	});

	it("takes a selected tag out again", () => {
		const { current, toggle } = setup();

		toggle("c", "a", "c");

		expect(current().selectedTagIds).toEqual(["a"]);
	});

	it("shows the tags in the row in the order they joined, and never moves one", () => {
		const { current, toggle } = setup();

		toggle("a", "b", "c", "a", "b", "c", "d", "a");

		expect(current().selectedTagIds).toEqual(["d", "a"]);
		expect(ids(current().rowTags)).toEqual(["a", "b", "c", "d"]);
	});

	it("keeps the row's tags after the filter is cleared", () => {
		const { current, toggle } = setup();
		toggle("a", "b");

		act(() => current().clear());

		expect(current().selectedTagIds).toEqual([]);
		expect(ids(current().rowTags)).toEqual(["a", "b"]);
	});

	it("keeps at most 8 tags in the row, dropping the oldest that isn't selected", () => {
		const { current, toggle } = setup();
		toggle("a", "b", "c", "d", "e", "f", "g", "h");
		act(() => current().clear());
		toggle("b");

		toggle("i");

		expect(ids(current().rowTags)).toEqual([
			"b",
			"c",
			"d",
			"e",
			"f",
			"g",
			"h",
			"i",
		]);
	});

	it("shows every selected tag in the row, even more than 8", () => {
		const { current, toggle } = setup();

		toggle("a", "b", "c", "d", "e", "f", "g", "h", "i");

		expect(ids(current().rowTags)).toEqual([
			"a",
			"b",
			"c",
			"d",
			"e",
			"f",
			"g",
			"h",
			"i",
		]);
	});

	it("drops a tag that no longer exists from the filter and the row", () => {
		const { hook, current, toggle } = setup();
		toggle("a", "b");

		hook.rerender({ loaded: tags.filter(({ id }) => id !== "a") });

		expect(current().selectedTagIds).toEqual(["b"]);
		expect(ids(current().rowTags)).toEqual(["b"]);
	});

	it("gives the room of a deleted tag to the next one in the row", () => {
		const { hook, current, toggle } = setup();
		toggle("a", "b", "c", "d", "e", "f", "g", "h");
		hook.rerender({ loaded: tags.filter(({ id }) => id !== "h") });

		toggle("i");

		expect(ids(current().rowTags)).toHaveLength(8);
		expect(ids(current().rowTags)).toContain("a");
	});

	it("shows the latest label of a tag that changed", () => {
		const { hook, current, toggle } = setup();
		toggle("a");

		hook.rerender({ loaded: [{ ...tag("a"), label: "Renamed" }] });

		expect(current().rowTags[0].label).toBe("Renamed");
	});

	it("holds the search query", () => {
		const { current } = setup();

		act(() => current().setQuery("plan"));

		expect(current().query).toBe("plan");
	});

	it("has nothing in the filter while the tags aren't loaded", () => {
		const { current } = setup(null);

		expect(current().selectedTagIds).toEqual([]);
		expect(current().rowTags).toEqual([]);
	});
});
