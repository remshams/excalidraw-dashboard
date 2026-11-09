import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Tag } from "#shared/tags.ts";
import * as api from "../../api.ts";
import { useTags } from "./use-tags.ts";

vi.mock("../../api.ts", async (original) => ({
	...(await original<typeof api>()),
	createTag: vi.fn(),
	deleteTag: vi.fn(),
	listTags: vi.fn(),
	updateTag: vi.fn(),
}));

const tag = (label: string): Tag => ({ id: label, label, color: "blue" });

beforeEach(() => vi.resetAllMocks());

describe("useTags", () => {
	it("sorts the loaded tags by label, ignoring case and accents", async () => {
		vi.mocked(api.listTags).mockResolvedValue([
			tag("apple"),
			tag("Work"),
			tag("Ärger"),
			tag("Zoo"),
			tag("banana"),
		]);

		const { result } = renderHook(() => useTags(vi.fn(), vi.fn()));

		await waitFor(() => expect(result.current.tags).toHaveLength(5));
		expect(result.current.tags?.map(({ label }) => label)).toEqual([
			"apple",
			"Ärger",
			"banana",
			"Work",
			"Zoo",
		]);
	});

	it("reports a failed load and has no list", async () => {
		const failure = new Error("offline");
		vi.mocked(api.listTags).mockRejectedValue(failure);
		const onError = vi.fn();

		const { result } = renderHook(() => useTags(onError, vi.fn()));

		await waitFor(() => expect(onError).toHaveBeenCalledWith(failure));
		expect(result.current.tags).toBeNull();
	});

	describe("changes", () => {
		async function loaded(...labels: string[]) {
			vi.mocked(api.listTags).mockResolvedValue(labels.map(tag));
			const onError = vi.fn();
			const onGone = vi.fn();
			const hook = renderHook(() => useTags(onError, onGone));
			await waitFor(() => expect(hook.result.current.tags).not.toBeNull());
			vi.mocked(api.listTags).mockClear();
			return { ...hook, onGone };
		}
		const labels = (tags: Tag[] | null) => tags?.map(({ label }) => label);

		it("keeps a created tag in order and returns it", async () => {
			const { result } = await loaded("apple", "Zoo");
			vi.mocked(api.createTag).mockResolvedValue(tag("Mango"));

			const created = await act(() =>
				result.current.changes.create({ label: "Mango", color: "blue" }),
			);

			expect(created).toEqual(tag("Mango"));
			expect(labels(result.current.tags)).toEqual(["apple", "Mango", "Zoo"]);
			expect(api.listTags).not.toHaveBeenCalled();
		});

		it("keeps a changed tag in order and returns it", async () => {
			const { result } = await loaded("apple", "Zoo");
			const renamed = { ...tag("zebra"), id: "apple" };
			vi.mocked(api.updateTag).mockResolvedValue(renamed);

			const updated = await act(() =>
				result.current.changes.update("apple", {
					label: "zebra",
					color: "blue",
				}),
			);

			expect(updated).toEqual(renamed);
			expect(labels(result.current.tags)).toEqual(["zebra", "Zoo"]);
		});

		it("drops a deleted tag and says it is gone", async () => {
			const { result, onGone } = await loaded("apple", "Zoo");
			vi.mocked(api.deleteTag).mockResolvedValue();

			await act(() => result.current.changes.remove("apple"));

			expect(labels(result.current.tags)).toEqual(["Zoo"]);
			expect(onGone).toHaveBeenCalledWith("apple");
		});

		it("reloads after a label conflict and passes it on", async () => {
			const { result, onGone } = await loaded("apple");
			const conflict = new api.ApiError("", 409, "taken");
			vi.mocked(api.createTag).mockRejectedValue(conflict);
			vi.mocked(api.listTags).mockResolvedValue([tag("apple"), tag("Other")]);

			await act(() =>
				expect(
					result.current.changes.create({ label: "Other", color: "blue" }),
				).rejects.toBe(conflict),
			);

			await waitFor(() => expect(result.current.tags).toHaveLength(2));
			expect(onGone).not.toHaveBeenCalled();
		});

		it("reloads and says a tag is gone when the server doesn't know it", async () => {
			const { result, onGone } = await loaded("apple", "Zoo");
			const missing = new api.ApiError("", 404, "");
			vi.mocked(api.updateTag).mockRejectedValue(missing);
			vi.mocked(api.listTags).mockResolvedValue([tag("Zoo")]);

			await act(() =>
				expect(
					result.current.changes.update("apple", {
						label: "x",
						color: "blue",
					}),
				).rejects.toBe(missing),
			);

			await waitFor(() => expect(result.current.tags).toHaveLength(1));
			expect(onGone).toHaveBeenCalledWith("apple");
		});

		it("keeps the list when the server fails for another reason", async () => {
			const { result, onGone } = await loaded("apple");
			const failure = new api.ApiError("", 500, "");
			vi.mocked(api.deleteTag).mockRejectedValue(failure);

			await act(() =>
				expect(result.current.changes.remove("apple")).rejects.toBe(failure),
			);

			expect(api.listTags).not.toHaveBeenCalled();
			expect(onGone).not.toHaveBeenCalled();
			expect(labels(result.current.tags)).toEqual(["apple"]);
		});
	});
});
