import { describe, expect, it } from "vitest";
import { isTagColor, tagLabelKey, tagLabelProblem } from "./tags.ts";

describe("tag label rules", () => {
	it("accepts a label of 1 to 30 characters", () => {
		expect(tagLabelProblem("a")).toBeNull();
		expect(tagLabelProblem("a".repeat(30))).toBeNull();
	});

	it("rejects a blank label", () => {
		expect(tagLabelProblem("")).toBe("empty");
		expect(tagLabelProblem("   ")).toBe("empty");
	});

	it("rejects a label over 30 characters", () => {
		expect(tagLabelProblem("a".repeat(31))).toBe("too-long");
	});

	it("measures the label after trimming", () => {
		expect(tagLabelProblem(`  ${"a".repeat(30)}  `)).toBeNull();
	});

	it("gives labels that differ only in case and spaces the same key", () => {
		expect(tagLabelKey(" Work ")).toBe("work");
		expect(tagLabelKey("ÄRGER")).toBe(tagLabelKey("ärger"));
	});
});

describe("tag colours", () => {
	it("accepts the eight open-color hues", () => {
		for (const color of [
			"red",
			"orange",
			"yellow",
			"green",
			"teal",
			"blue",
			"violet",
			"pink",
		]) {
			expect(isTagColor(color)).toBe(true);
		}
	});

	it("rejects anything else", () => {
		expect(isTagColor("gray")).toBe(false);
		expect(isTagColor("Red")).toBe(false);
		expect(isTagColor(1)).toBe(false);
		expect(isTagColor(undefined)).toBe(false);
	});
});
