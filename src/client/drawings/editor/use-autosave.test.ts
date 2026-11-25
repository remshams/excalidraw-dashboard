import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Drawing } from "#shared/drawings.ts";
import * as api from "../api.ts";
import { useAutosave } from "./use-autosave.ts";

vi.mock("../api.ts");

const drawing: Drawing = {
	id: "1",
	name: "Plan",
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
	previewUpdatedAt: null,
	tagIds: [],
	scene: "stored",
};
const savedSummary = { ...drawing, updatedAt: "2026-01-02T00:00:00.000Z" };

const render = (isNew = false, opened = drawing) => {
	const onSaved = vi.fn();
	const onError = vi.fn();
	const hook = renderHook(() =>
		useAutosave(opened, isNew, { onSaved, onError }),
	);
	return { ...hook, onSaved, onError };
};

beforeEach(() => {
	vi.mocked(api.updateDrawing).mockResolvedValue({
		id: "1",
		name: "Plan",
		createdAt: drawing.createdAt,
		updatedAt: savedSummary.updatedAt,
		previewUpdatedAt: null,
		tagIds: [],
	});
});

describe("useAutosave", () => {
	it("settles with the stored scene when nothing changed", async () => {
		const { result } = render();

		const saved = await result.current.settle();

		expect(saved).toEqual({ scene: "stored", summary: drawing });
		expect(api.updateDrawing).not.toHaveBeenCalled();
	});

	it("saves the pending scene on settle and resolves with it", async () => {
		const { result, onSaved } = render();

		act(() => result.current.schedule("edited", true));
		const saved = await result.current.settle();

		expect(api.updateDrawing).toHaveBeenCalledExactlyOnceWith("1", {
			scene: "edited",
		});
		expect(saved.scene).toBe("edited");
		expect(saved.summary.updatedAt).toBe(savedSummary.updatedAt);
		expect(onSaved).toHaveBeenCalledExactlyOnceWith(saved.summary);
	});

	it("keeps the last stored scene when a save fails", async () => {
		const error = new Error("offline");
		vi.mocked(api.updateDrawing).mockRejectedValue(error);
		const { result, onError } = render();

		act(() => result.current.schedule("edited", true));
		const saved = await result.current.settle();

		expect(onError).toHaveBeenCalledExactlyOnceWith(error);
		expect(saved).toEqual({ scene: "stored", summary: drawing });
	});

	it("saves the pending scene when the page is hidden", () => {
		const { result } = render();

		act(() => result.current.schedule("edited", true));
		window.dispatchEvent(new Event("pagehide"));

		expect(api.updateDrawing).toHaveBeenCalledExactlyOnceWith("1", {
			scene: "edited",
		});
	});

	it("saves the pending scene when the editor closes", () => {
		const { result, unmount } = render();

		act(() => result.current.schedule("edited", true));
		unmount();

		expect(api.updateDrawing).toHaveBeenCalledExactlyOnceWith("1", {
			scene: "edited",
		});
	});

	it("stops listening for the page being hidden once the editor closes", () => {
		const { result, unmount } = render();
		unmount();

		act(() => result.current.schedule("edited", true));
		window.dispatchEvent(new Event("pagehide"));

		expect(api.updateDrawing).not.toHaveBeenCalled();
	});

	it("settles only after a save the timer already started", async () => {
		vi.useFakeTimers();
		let finish = () => {};
		vi.mocked(api.updateDrawing).mockImplementation(
			() =>
				new Promise((resolve) => {
					finish = () => resolve({ ...savedSummary, previewUpdatedAt: null });
				}),
		);
		const { result } = render();

		act(() => result.current.schedule("edited", true));
		vi.advanceTimersByTime(1000);
		expect(api.updateDrawing).toHaveBeenCalledOnce();
		let settled: string | null | undefined;
		result.current.settle().then((saved) => {
			settled = saved.scene;
		});
		await Promise.resolve();
		expect(settled).toBeUndefined();

		finish();
		vi.useRealTimers();
		await vi.waitFor(() => expect(settled).toBe("edited"));
		expect(api.updateDrawing).toHaveBeenCalledOnce();
	});

	describe("for a new scratchpad", () => {
		const scratchpad: Drawing = { ...drawing, name: null, scene: null };
		const { scene: _scene, ...createdSummary } = {
			...scratchpad,
			scene: "first",
			updatedAt: savedSummary.updatedAt,
		};

		beforeEach(() => {
			vi.mocked(api.createDrawing).mockResolvedValue({
				...createdSummary,
				scene: "first",
			});
		});

		it("stores it with its first scene, then saves later scenes to it", async () => {
			const { result, onSaved } = render(true, scratchpad);

			act(() => result.current.schedule("first", true));
			const first = await result.current.settle();
			act(() => result.current.schedule("second", true));
			await result.current.settle();

			expect(api.createDrawing).toHaveBeenCalledExactlyOnceWith({
				id: "1",
				scene: "first",
			});
			expect(first.summary).toEqual(createdSummary);
			expect(onSaved).toHaveBeenNthCalledWith(1, createdSummary);
			expect(api.updateDrawing).toHaveBeenCalledExactlyOnceWith("1", {
				scene: "second",
			});
		});

		it("stores nothing while the scene shows nothing", async () => {
			const { result, unmount } = render(true, scratchpad);

			act(() => result.current.schedule("empty", false));
			await result.current.settle();
			unmount();

			expect(api.createDrawing).not.toHaveBeenCalled();
		});

		it("drops a drawn scene that was erased before its first save", async () => {
			const { result } = render(true, scratchpad);

			act(() => result.current.schedule("drawn", true));
			act(() => result.current.schedule("erased", false));
			await result.current.settle();

			expect(api.createDrawing).not.toHaveBeenCalled();
		});

		it("saves a scene erased while the first save is on its way", async () => {
			let answer = () => {};
			vi.mocked(api.createDrawing).mockReturnValue(
				new Promise((resolve) => {
					answer = () => resolve({ ...createdSummary, scene: "first" });
				}),
			);
			const { result } = render(true, scratchpad);
			act(() => result.current.schedule("first", true));
			const first = result.current.settle();

			act(() => result.current.schedule("erased", false));
			answer();
			await first;
			await result.current.settle();

			expect(api.updateDrawing).toHaveBeenCalledExactlyOnceWith("1", {
				scene: "erased",
			});
		});

		it("doesn't store an erased scene when the first save failed", async () => {
			let fail = () => {};
			vi.mocked(api.createDrawing).mockReturnValueOnce(
				new Promise((_, reject) => {
					fail = () => reject(new Error("offline"));
				}),
			);
			const { result, onSaved } = render(true, scratchpad);
			act(() => result.current.schedule("first", true));
			const first = result.current.settle();

			act(() => result.current.schedule("erased", false));
			fail();
			await first;
			await result.current.settle();

			expect(api.createDrawing).toHaveBeenCalledOnce();
			expect(api.updateDrawing).not.toHaveBeenCalled();
			expect(onSaved).not.toHaveBeenCalled();
		});

		it("doesn't store any scene erased while a failed first save was on its way", async () => {
			let fail = () => {};
			vi.mocked(api.createDrawing).mockReturnValueOnce(
				new Promise((_, reject) => {
					fail = () => reject(new Error("offline"));
				}),
			);
			const { result } = render(true, scratchpad);
			act(() => result.current.schedule("first", true));
			const first = result.current.settle();
			act(() => result.current.schedule("erased", false));
			const queued = result.current.settle();
			act(() => result.current.schedule("erased, new background", false));

			fail();
			await first;
			await queued;
			await result.current.settle();

			expect(api.createDrawing).toHaveBeenCalledOnce();
		});

		it("saves an emptied scene once the scratchpad is stored", async () => {
			const { result } = render(true, scratchpad);

			act(() => result.current.schedule("first", true));
			await result.current.settle();
			act(() => result.current.schedule("erased", false));
			await result.current.settle();

			expect(api.updateDrawing).toHaveBeenCalledExactlyOnceWith("1", {
				scene: "erased",
			});
		});

		it("saves to the stored scratchpad when the answer to its first save got lost", async () => {
			// The mocked ApiError's constructor sets nothing, so set the status here.
			const taken = Object.assign(
				new api.ApiError("POST /drawings failed with 409", 409, "taken"),
				{ status: 409 },
			);
			vi.mocked(api.createDrawing).mockRejectedValue(taken);
			const { result, onSaved, onError } = render(true, scratchpad);

			act(() => result.current.schedule("again", true));
			await result.current.settle();
			act(() => result.current.schedule("later", true));
			await result.current.settle();

			expect(onError).not.toHaveBeenCalled();
			expect(onSaved).toHaveBeenCalledTimes(2);
			expect(api.createDrawing).toHaveBeenCalledOnce();
			expect(api.updateDrawing).toHaveBeenNthCalledWith(1, "1", {
				scene: "again",
			});
			expect(api.updateDrawing).toHaveBeenNthCalledWith(2, "1", {
				scene: "later",
			});
		});

		it("tries to store it again after the first save failed", async () => {
			vi.mocked(api.createDrawing).mockRejectedValueOnce(new Error("offline"));
			const { result, onError } = render(true, scratchpad);

			act(() => result.current.schedule("first", true));
			await result.current.settle();
			act(() => result.current.schedule("again", true));
			await result.current.settle();

			expect(onError).toHaveBeenCalledOnce();
			expect(api.createDrawing).toHaveBeenLastCalledWith({
				id: "1",
				scene: "again",
			});
			expect(api.updateDrawing).not.toHaveBeenCalled();
		});
	});
});
