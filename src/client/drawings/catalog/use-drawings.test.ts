import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DrawingSummary } from "#shared/drawings.ts";
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

	it("keeps a newer tag when a save answers with the tags it started with", async () => {
		vi.mocked(api.listDrawings).mockResolvedValue([drawing("a", ["t1"])]);
		vi.mocked(api.setDrawingTags).mockReturnValue(new Promise(() => {}));
		const { result } = renderHook(() => useDrawings(vi.fn()));
		await waitFor(() => expect(result.current.drawings).toHaveLength(1));

		act(() => void result.current.toggleTag(result.current.drawings[0], "t2"));
		act(() =>
			result.current.replace({
				...drawing("a", ["t1"]),
				updatedAt: "2026-11-11T15:00:00.000Z",
			}),
		);

		expect(result.current.drawings[0]).toMatchObject({
			updatedAt: "2026-11-11T15:00:00.000Z",
			tagIds: ["t1", "t2"],
		});
	});

	describe("toggleTag", () => {
		async function setup(tagIds: string[]) {
			vi.mocked(api.listDrawings).mockResolvedValue([
				drawing("a", tagIds),
				drawing("b", ["t1"]),
			]);
			// Stable, because the hook loads the list again when onError changes.
			const onError = vi.fn();
			const { result } = renderHook(() => useDrawings(onError));
			await waitFor(() => expect(result.current.drawings).toHaveLength(2));
			const toggle = (tagId: string) =>
				result.current.toggleTag(result.current.drawings[0], tagId);
			const tagIdsOfA = () => result.current.drawings[0].tagIds;
			return { result, toggle, tagIdsOfA };
		}

		it("shows an added tag before the server answers and sends every tag of the drawing", async () => {
			vi.mocked(api.setDrawingTags).mockReturnValue(new Promise(() => {}));
			const { toggle, tagIdsOfA, result } = await setup(["t1"]);

			act(() => void toggle("t2"));

			expect(tagIdsOfA()).toEqual(["t1", "t2"]);
			expect(result.current.drawings[1].tagIds).toEqual(["t1"]);
			expect(api.setDrawingTags).toHaveBeenCalledExactlyOnceWith("a", [
				"t1",
				"t2",
			]);
		});

		it("takes off a tag the drawing has", async () => {
			vi.mocked(api.setDrawingTags).mockResolvedValue(drawing("a", []));
			const { toggle, tagIdsOfA } = await setup(["t1"]);

			await act(() => toggle("t1"));

			expect(tagIdsOfA()).toEqual([]);
			expect(api.setDrawingTags).toHaveBeenCalledWith("a", []);
		});

		it("builds a second change on the first while the first is on its way", async () => {
			vi.mocked(api.setDrawingTags).mockReturnValue(new Promise(() => {}));
			const { toggle, tagIdsOfA } = await setup([]);

			act(() => void toggle("t1"));
			act(() => void toggle("t2"));

			expect(tagIdsOfA()).toEqual(["t1", "t2"]);
			expect(api.setDrawingTags).toHaveBeenLastCalledWith("a", ["t1", "t2"]);
		});

		it("undoes only the refused change and rejects", async () => {
			const refusal = new Error("refused");
			let refuse = (_: unknown) => {};
			vi.mocked(api.setDrawingTags)
				.mockReturnValueOnce(
					new Promise((_, reject) => {
						refuse = reject;
					}),
				)
				.mockReturnValueOnce(new Promise(() => {}));
			const { toggle, tagIdsOfA } = await setup(["t1"]);
			let first: Promise<void> = Promise.resolve();
			act(() => {
				first = toggle("t1");
			});
			act(() => void toggle("t2"));

			refuse(refusal);

			await act(() => expect(first).rejects.toBe(refusal));
			expect(tagIdsOfA()).toEqual(["t2", "t1"]);
		});
	});
});
