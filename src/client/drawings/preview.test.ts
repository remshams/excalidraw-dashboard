import { exportToBlob } from "@excalidraw/excalidraw";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "./api.ts";
import { storePreview } from "./preview.ts";

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
