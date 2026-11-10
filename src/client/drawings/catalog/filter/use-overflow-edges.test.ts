import { describe, expect, it } from "vitest";
import { overflowEdges } from "./use-overflow-edges.ts";

const edges = (scrollLeft: number, scrollWidth: number, clientWidth: number) =>
	overflowEdges({ scrollLeft, scrollWidth, clientWidth });

describe("overflowEdges", () => {
	it("fades nothing when everything fits", () => {
		expect(edges(0, 300, 300)).toEqual({ start: false, end: false });
	});

	it("fades only the end at the start of a longer row", () => {
		expect(edges(0, 600, 300)).toEqual({ start: false, end: true });
	});

	it("fades both edges in the middle", () => {
		expect(edges(100, 600, 300)).toEqual({ start: true, end: true });
	});

	it("fades only the start at the end of the row", () => {
		expect(edges(300, 600, 300)).toEqual({ start: true, end: false });
	});

	it("ignores a rounding difference of one pixel", () => {
		expect(edges(1, 600, 599)).toEqual({ start: false, end: false });
		expect(edges(300.5, 600, 299.5)).toEqual({ start: true, end: false });
	});
});
