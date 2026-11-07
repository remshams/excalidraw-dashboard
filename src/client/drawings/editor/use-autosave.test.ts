import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Drawing } from "../../../shared/drawings.ts";
import * as api from "../api.ts";
import { useAutosave } from "./use-autosave.ts";

vi.mock("../api.ts");

const drawing: Drawing = {
	id: "1",
	name: "Plan",
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
	previewUpdatedAt: null,
	scene: "stored",
};
const savedSummary = { ...drawing, updatedAt: "2026-01-02T00:00:00.000Z" };

const render = () => {
	const onSaved = vi.fn();
	const onError = vi.fn();
	const hook = renderHook(() => useAutosave(drawing, { onSaved, onError }));
	return { ...hook, onSaved, onError };
};

beforeEach(() => {
	vi.mocked(api.updateDrawing).mockResolvedValue({
		id: "1",
		name: "Plan",
		createdAt: drawing.createdAt,
		updatedAt: savedSummary.updatedAt,
		previewUpdatedAt: null,
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

		act(() => result.current.schedule("edited"));
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

		act(() => result.current.schedule("edited"));
		const saved = await result.current.settle();

		expect(onError).toHaveBeenCalledExactlyOnceWith(error);
		expect(saved).toEqual({ scene: "stored", summary: drawing });
	});

	it("saves the pending scene when the page is hidden", () => {
		const { result } = render();

		act(() => result.current.schedule("edited"));
		window.dispatchEvent(new Event("pagehide"));

		expect(api.updateDrawing).toHaveBeenCalledExactlyOnceWith("1", {
			scene: "edited",
		});
	});

	it("saves the pending scene when the editor closes", () => {
		const { result, unmount } = render();

		act(() => result.current.schedule("edited"));
		unmount();

		expect(api.updateDrawing).toHaveBeenCalledExactlyOnceWith("1", {
			scene: "edited",
		});
	});

	it("stops listening for the page being hidden once the editor closes", () => {
		const { result, unmount } = render();
		unmount();

		act(() => result.current.schedule("edited"));
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

		act(() => result.current.schedule("edited"));
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
});
