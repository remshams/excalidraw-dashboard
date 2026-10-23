import { exportToBlob } from "@excalidraw/excalidraw";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "./api.ts";
import type { Drawing } from "../../shared/types.ts";
import { storeMissingPreview, storePreview } from "./preview.ts";

vi.mock("@excalidraw/excalidraw", () => ({ exportToBlob: vi.fn() }));
vi.mock("./api.ts");

const scene = (elements: object[]) =>
	JSON.stringify({
		elements,
		appState: { viewBackgroundColor: "#fff" },
		files: {},
	});

afterEach(() => vi.restoreAllMocks());

describe("storePreview", () => {
	it("saves the visible elements as a PNG", async () => {
		const png = new Blob(["png"], { type: "image/png" });
		vi.mocked(exportToBlob).mockResolvedValue(png);

		await storePreview(
			"1",
			scene([
				{ id: "a", isDeleted: false },
				{ id: "b", isDeleted: true },
			]),
		);

		expect(exportToBlob).toHaveBeenCalledWith({
			elements: [{ id: "a", isDeleted: false }],
			appState: { viewBackgroundColor: "#fff", exportBackground: true },
			files: {},
			maxWidthOrHeight: 640,
			mimeType: "image/png",
		});
		expect(api.savePreview).toHaveBeenCalledWith("1", png);
	});

	it("removes the preview when nothing is drawn", async () => {
		await storePreview("1", scene([{ id: "a", isDeleted: true }]));

		expect(exportToBlob).not.toHaveBeenCalled();
		expect(api.deletePreview).toHaveBeenCalledWith("1");
	});
});

describe("storeMissingPreview", () => {
	const drawing = (changes: Partial<Drawing>): Drawing => ({
		id: "1",
		name: "Plan",
		scene: scene([{ id: "a", isDeleted: false }]),
		createdAt: "",
		updatedAt: "",
		hasPreview: false,
		...changes,
	});

	it("stores a preview for a scene without one", async () => {
		vi.mocked(exportToBlob).mockResolvedValue(new Blob());

		await storeMissingPreview(drawing({}));

		expect(api.savePreview).toHaveBeenCalledOnce();
	});

	it.each([
		["the drawing has a preview", { hasPreview: true }],
		["nothing was saved yet", { scene: null }],
	])("does nothing when %s", (_, changes) => {
		expect(storeMissingPreview(drawing(changes))).toBeNull();
		expect(api.savePreview).not.toHaveBeenCalled();
	});
});
