import { describe, expect, it } from "vitest";
import type { Tag } from "#shared/tags.ts";
import { shownCardTags } from "./card-tags.ts";

const tags: Tag[] = ["Ant", "Bee", "Cat", "Dog", "Eel"].map((label) => ({
	id: label,
	label,
	color: "blue",
}));

const shown = (selected: string[], list = tags) =>
	shownCardTags(list, selected, 3).map(({ label }) => label);

describe("shownCardTags", () => {
	it("shows the first tags by label without a filter", () => {
		expect(shown([])).toEqual(["Ant", "Bee", "Cat"]);
	});

	it("shows every tag when they fit", () => {
		expect(shown(["Bee"], tags.slice(0, 2))).toEqual(["Ant", "Bee"]);
	});

	it("keeps a shown tag in its place when it is selected", () => {
		expect(shown(["Bee"])).toEqual(["Ant", "Bee", "Cat"]);
	});

	it("gives a hidden selected tag the slot of the last unselected one, in label order", () => {
		expect(shown(["Eel"])).toEqual(["Ant", "Bee", "Eel"]);
	});

	it("keeps the selected shown tags when hidden ones take the others' slots", () => {
		expect(shown(["Cat", "Dog", "Eel"])).toEqual(["Cat", "Dog", "Eel"]);
		expect(shown(["Ant", "Dog", "Eel"])).toEqual(["Ant", "Dog", "Eel"]);
	});

	it("leaves the rest hidden when every slot holds a selected tag", () => {
		expect(shown(["Ant", "Bee", "Cat", "Eel"])).toEqual(["Ant", "Bee", "Cat"]);
	});

	it("doesn't move a shown tag when another one is selected next to a hidden one", () => {
		expect(shown(["Eel"])).toEqual(["Ant", "Bee", "Eel"]);
		expect(shown(["Eel", "Bee"])).toEqual(["Ant", "Bee", "Eel"]);
		expect(shown(["Eel", "Bee", "Ant"])).toEqual(["Ant", "Bee", "Eel"]);
	});
});
