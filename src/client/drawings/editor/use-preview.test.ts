import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Drawing, DrawingSummary } from "../../../shared/drawings.ts";
import { storePreview } from "./preview.ts";
import type { SavedScene } from "./use-autosave.ts";
import { usePreview } from "./use-preview.ts";

// Excalidraw doesn't load in jsdom; the real isPreviewOutdated doesn't need it.
vi.mock("@excalidraw/excalidraw", () => ({ exportToBlob: vi.fn() }));
vi.mock("./preview.ts", async (importOriginal) => ({
	...(await importOriginal<typeof import("./preview.ts")>()),
	storePreview: vi.fn(),
}));

const drawing: Drawing = {
	id: "1",
	name: "Plan",
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-02T00:00:00.000Z",
	previewUpdatedAt: "2026-01-02T00:00:00.000Z",
	tagIds: [],
	scene: "stored",
};
const edited: SavedScene = {
	scene: "edited",
	summary: { ...drawing, updatedAt: "2026-01-03T00:00:00.000Z" },
};
const withPreview = (previewUpdatedAt: string): DrawingSummary => ({
	...edited.summary,
	previewUpdatedAt,
});

const render = (opened: Drawing, settle: () => Promise<SavedScene>) => {
	const onStored = vi.fn();
	const hook = renderHook(() => usePreview(opened, settle, onStored));
	return { ...hook, onStored };
};

beforeEach(() => {
	vi.mocked(storePreview).mockResolvedValue(
		withPreview("2026-01-04T00:00:00.000Z"),
	);
});

afterEach(() => vi.restoreAllMocks());

describe("usePreview", () => {
	it("leaves an up-to-date preview alone on open", async () => {
		const settle = vi.fn(async () => ({ scene: "stored", summary: drawing }));

		render(drawing, settle);

		await vi.waitFor(() => expect(settle).toHaveBeenCalled());
		await Promise.resolve();
		expect(storePreview).not.toHaveBeenCalled();
	});

	it("renders a missing preview on open", async () => {
		const opened = { ...drawing, previewUpdatedAt: null };
		const settle = async () => ({ scene: "stored", summary: opened });

		const { onStored } = render(opened, settle);

		await vi.waitFor(() =>
			expect(onStored).toHaveBeenCalledExactlyOnceWith(
				withPreview("2026-01-04T00:00:00.000Z"),
			),
		);
		expect(storePreview).toHaveBeenCalledExactlyOnceWith("1", "stored", false);
	});

	it("renders the saved scene on leave once the save has finished", async () => {
		let current: SavedScene = { scene: "stored", summary: drawing };
		const settle = vi.fn(async () => current);
		const { unmount, onStored } = render(drawing, settle);
		await vi.waitFor(() => expect(settle).toHaveBeenCalledOnce());

		current = edited;
		unmount();

		await vi.waitFor(() => expect(onStored).toHaveBeenCalledOnce());
		expect(storePreview).toHaveBeenCalledExactlyOnceWith("1", "edited", true);
	});

	it("renders on leave when the page is hidden", async () => {
		let current: SavedScene = { scene: "stored", summary: drawing };
		const settle = vi.fn(async () => current);
		render(drawing, settle);
		await vi.waitFor(() => expect(settle).toHaveBeenCalledOnce());

		current = edited;
		window.dispatchEvent(new Event("pagehide"));

		await vi.waitFor(() =>
			expect(storePreview).toHaveBeenCalledExactlyOnceWith("1", "edited", true),
		);
	});

	it("renders once when opening and leaving overlap", async () => {
		const opened = { ...drawing, previewUpdatedAt: null };
		const settle = async () => ({ scene: "stored", summary: opened });
		const { unmount, onStored } = render(opened, settle);

		unmount();

		await vi.waitFor(() => expect(onStored).toHaveBeenCalledOnce());
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(storePreview).toHaveBeenCalledOnce();
	});

	it("only logs a failed preview and tries again on the next check", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const error = new Error("offline");
		vi.mocked(storePreview).mockRejectedValueOnce(error);
		const opened = { ...drawing, previewUpdatedAt: null };
		const settle = async () => ({ scene: "stored", summary: opened });
		const { unmount, onStored } = render(opened, settle);

		await vi.waitFor(() =>
			expect(warn).toHaveBeenCalledExactlyOnceWith(
				"Couldn't store the drawing's preview",
				error,
			),
		);
		unmount();

		await vi.waitFor(() => expect(onStored).toHaveBeenCalledOnce());
		expect(storePreview).toHaveBeenCalledTimes(2);
	});

	it("reports nothing when no preview was stored", async () => {
		const warn = vi.spyOn(console, "warn");
		vi.mocked(storePreview).mockResolvedValue(null);
		const opened = { ...drawing, previewUpdatedAt: null, scene: null };
		const settle = async () => ({ scene: null, summary: opened });

		const { onStored } = render(opened, settle);

		await vi.waitFor(() => expect(storePreview).toHaveBeenCalledOnce());
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(onStored).not.toHaveBeenCalled();
		expect(warn).not.toHaveBeenCalled();
	});

	it("stops listening for the page being hidden once the editor closes", async () => {
		const settle = vi.fn(async () => ({ scene: "stored", summary: drawing }));
		const { unmount } = render(drawing, settle);
		unmount();
		await vi.waitFor(() => expect(settle).toHaveBeenCalledTimes(2));

		window.dispatchEvent(new Event("pagehide"));
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(settle).toHaveBeenCalledTimes(2);
	});

	it("renders again on leave when an edit was saved during the open render", async () => {
		const opened = { ...drawing, previewUpdatedAt: null };
		let current: SavedScene = { scene: "stored", summary: opened };
		const settle = vi.fn(async () => current);
		let finishOpen = () => {};
		vi.mocked(storePreview).mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					// The upload lands after the edit's save, so its timestamp is newer.
					finishOpen = () => resolve(withPreview("2026-01-04T00:00:00.000Z"));
				}),
		);
		const { unmount, onStored } = render(opened, settle);
		await vi.waitFor(() => expect(storePreview).toHaveBeenCalledOnce());

		current = edited;
		finishOpen();
		await vi.waitFor(() => expect(onStored).toHaveBeenCalledOnce());
		unmount();

		await vi.waitFor(() => expect(storePreview).toHaveBeenCalledTimes(2));
		expect(storePreview).toHaveBeenLastCalledWith("1", "edited", true);
	});

	it("remembers a deleted preview for the next check", async () => {
		const opened = { ...drawing, previewUpdatedAt: "2026-01-01T00:00:00.000Z" };
		let current: SavedScene = { scene: "emptied", summary: opened };
		const settle = vi.fn(async () => current);
		vi.mocked(storePreview).mockResolvedValueOnce({
			...opened,
			previewUpdatedAt: null,
		});
		const { unmount, onStored } = render(opened, settle);
		await vi.waitFor(() => expect(onStored).toHaveBeenCalledOnce());

		current = edited;
		unmount();

		await vi.waitFor(() => expect(storePreview).toHaveBeenCalledTimes(2));
		expect(storePreview).toHaveBeenNthCalledWith(1, "1", "emptied", true);
		expect(storePreview).toHaveBeenLastCalledWith("1", "edited", false);
	});
});
