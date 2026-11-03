import { exportToBlob } from "@excalidraw/excalidraw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "./api.ts";
import { isPreviewOutdated, storePreview } from "./preview.ts";

vi.mock("@excalidraw/excalidraw", () => ({ exportToBlob: vi.fn() }));
vi.mock("./api.ts");

const png = new Blob(["png"], { type: "image/png" });
const stored = {
	id: "1",
	name: "Plan",
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-02T00:00:00.000Z",
	previewUpdatedAt: "2026-01-03T00:00:00.000Z",
};

const scene = (elements: { id: string; isDeleted: boolean }[]) =>
	JSON.stringify({
		elements,
		appState: { viewBackgroundColor: "#fff" },
		files: { image: { id: "image" } },
	});

beforeEach(() => {
	vi.mocked(exportToBlob).mockResolvedValue(png);
	vi.mocked(api.savePreview).mockResolvedValue(stored);
	vi.mocked(api.deletePreview).mockResolvedValue({
		...stored,
		previewUpdatedAt: null,
	});
});

describe("isPreviewOutdated", () => {
	const updatedAt = "2026-01-02T00:00:00.000Z";

	it("is true without a preview", () => {
		expect(isPreviewOutdated({ previewUpdatedAt: null, updatedAt })).toBe(true);
	});

	it("is true for a preview older than the scene", () => {
		expect(
			isPreviewOutdated({
				previewUpdatedAt: "2026-01-01T00:00:00.000Z",
				updatedAt,
			}),
		).toBe(true);
	});

	it("is false for a preview as new as the scene or newer", () => {
		expect(isPreviewOutdated({ previewUpdatedAt: updatedAt, updatedAt })).toBe(
			false,
		);
		expect(
			isPreviewOutdated({
				previewUpdatedAt: "2026-01-03T00:00:00.000Z",
				updatedAt,
			}),
		).toBe(false);
	});
});

describe("storePreview", () => {
	it("exports the visible elements as a light PNG and uploads it", async () => {
		const visible = { id: "a", isDeleted: false };

		const result = await storePreview(
			"1",
			scene([visible, { id: "b", isDeleted: true }]),
			false,
		);

		expect(exportToBlob).toHaveBeenCalledExactlyOnceWith({
			elements: [visible],
			appState: {
				viewBackgroundColor: "#fff",
				exportBackground: true,
				exportWithDarkMode: false,
			},
			files: { image: { id: "image" } },
			maxWidthOrHeight: 640,
			mimeType: "image/png",
		});
		expect(api.savePreview).toHaveBeenCalledExactlyOnceWith("1", png);
		expect(result).toBe(stored);
	});

	it("deletes the preview of a scene with nothing visible", async () => {
		const result = await storePreview(
			"1",
			scene([{ id: "a", isDeleted: true }]),
			true,
		);

		expect(api.deletePreview).toHaveBeenCalledExactlyOnceWith("1");
		expect(result?.previewUpdatedAt).toBeNull();
		expect(exportToBlob).not.toHaveBeenCalled();
	});

	it("sends nothing for an empty drawing without a preview", async () => {
		expect(await storePreview("1", null, false)).toBeNull();
		expect(await storePreview("1", scene([]), false)).toBeNull();

		expect(api.deletePreview).not.toHaveBeenCalled();
		expect(api.savePreview).not.toHaveBeenCalled();
	});
});
