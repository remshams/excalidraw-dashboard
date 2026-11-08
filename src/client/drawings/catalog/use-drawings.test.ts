import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DrawingSummary } from "../../../shared/drawings.ts";
import * as api from "../api.ts";
import { useDrawings } from "./use-drawings.ts";

vi.mock("../api.ts");

const drawing = (id: string, tagIds: string[]): DrawingSummary => ({
	id,
	name: id,
	createdAt: "",
	updatedAt: "",
	previewUpdatedAt: null,
	tagIds,
});

beforeEach(() => vi.resetAllMocks());

describe("useDrawings", () => {
	it("takes a deleted tag off the drawings that carry it", async () => {
		vi.mocked(api.listDrawings).mockResolvedValue([
			drawing("a", ["t1", "t2"]),
			drawing("b", ["t2"]),
			drawing("c", []),
		]);
		const { result } = renderHook(() => useDrawings(vi.fn()));
		await waitFor(() => expect(result.current.drawings).toHaveLength(3));

		act(() => result.current.forgetTag("t2"));

		expect(result.current.drawings.map(({ tagIds }) => tagIds)).toEqual([
			["t1"],
			[],
			[],
		]);
	});
});
