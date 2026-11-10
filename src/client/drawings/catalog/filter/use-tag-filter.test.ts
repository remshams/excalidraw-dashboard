import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Tag } from "#shared/tags.ts";
import { useTagFilter } from "./use-tag-filter.ts";

/** Later letters are newer: "i" was created last. */
const tag = (id: string): Tag => ({
	id,
	label: id.toUpperCase(),
	color: "blue",
	createdAt: `2026-01-0${id.charCodeAt(0) - 96}T00:00:00.000Z`,
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
	it("starts with no filter and no search", () => {
		const { current } = setup();

		expect(current().selectedTagIds).toEqual([]);
		expect(current().selectedTags).toEqual([]);
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

	it("shows every tag in the row, newest created first, also with no filter", () => {
		const { current } = setup();

		expect(ids(current().rowTags)).toEqual([
			"i",
			"h",
			"g",
			"f",
			"e",
			"d",
			"c",
			"b",
			"a",
		]);
	});

	it("keeps the row's order when tags are selected and cleared", () => {
		const { current, toggle } = setup();
		const before = ids(current().rowTags);

		toggle("a", "e", "i", "e");
		expect(ids(current().rowTags)).toEqual(before);
		act(() => current().clear());

		expect(ids(current().rowTags)).toEqual(before);
	});

	it("puts a new tag first and leaves the others in their order", () => {
		const { hook, current } = setup([tag("a"), tag("b")]);

		hook.rerender({ loaded: [tag("a"), tag("b"), tag("c")] });

		expect(ids(current().rowTags)).toEqual(["c", "b", "a"]);
	});

	it("drops a tag that no longer exists from the filter and the row", () => {
		const { hook, current, toggle } = setup();
		toggle("a", "b");

		hook.rerender({ loaded: tags.filter(({ id }) => id !== "a") });

		expect(current().selectedTagIds).toEqual(["b"]);
		expect(ids(current().rowTags)).not.toContain("a");
		expect(ids(current().rowTags)).toHaveLength(8);
	});

	it("shows the latest label of a tag that changed", () => {
		const { hook, current } = setup();

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
