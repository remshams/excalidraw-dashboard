import { describe, expect, it } from "vitest";
import type { Tag } from "#shared/tags.ts";
import { findTags } from "./find-tags.ts";

const tag = (label: string): Tag => ({
	id: label,
	label,
	color: "blue",
	createdAt: "2026-01-01T00:00:00.000Z",
});

const labels = (tags: Tag[]) => tags.map(({ label }) => label);

describe("findTags", () => {
	const tags = [tag("Fieldwork"), tag("Network"), tag("Work"), tag("Workshop")];

	it("finds every tag in its order for an empty text", () => {
		expect(labels(findTags(tags, ""))).toEqual(labels(tags));
	});

	it("ranks labels that start with the text before the rest", () => {
		expect(labels(findTags(tags, "work"))).toEqual([
			"Work",
			"Workshop",
			"Fieldwork",
			"Network",
		]);
	});

	it("ignores case and the spaces around the text", () => {
		expect(labels(findTags(tags, "  NETWORK "))).toEqual(["Network"]);
	});

	it("finds nothing when no label contains the text", () => {
		expect(findTags(tags, "garden")).toEqual([]);
	});
});
