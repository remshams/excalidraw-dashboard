import { describe, expect, it } from "vitest";
import type { Tag } from "#shared/tags.ts";
import { noMatchMessage } from "./no-match-message.ts";

const tag = (label: string): Tag => ({
	id: label,
	label,
	color: "blue",
	createdAt: "2026-01-01T00:00:00.000Z",
});
const work = tag("Work");
const home = tag("Home");
const ideas = tag("Ideas");

describe("noMatchMessage", () => {
	it("says no drawing has the name when only the search is set", () => {
		expect(noMatchMessage("plan", [], 0)).toBe("No drawing is named “plan”.");
	});

	it("says no drawing has the tag when only the filter is set", () => {
		expect(noMatchMessage("", [work], 0)).toBe("No drawing has Work.");
	});

	it("lists several tags of the filter with or", () => {
		expect(noMatchMessage("", [work, home], 0)).toBe(
			"No drawing has Work or Home.",
		);
		expect(noMatchMessage("", [work, home, ideas], 0)).toBe(
			"No drawing has Work, Home or Ideas.",
		);
	});

	it("counts the drawings outside the filter that have the name", () => {
		expect(noMatchMessage("plan", [work, home], 2)).toBe(
			"No drawing with Work or Home is named “plan”. 2 drawings without these tags are.",
		);
	});

	it("says it in the singular for one tag and one drawing", () => {
		expect(noMatchMessage("plan", [work], 1)).toBe(
			"No drawing with Work is named “plan”. 1 drawing without this tag is.",
		);
	});

	it("says no drawing has the name when none outside the filter has it either", () => {
		expect(noMatchMessage("plan", [work], 0)).toBe(
			"No drawing is named “plan”.",
		);
	});
});
