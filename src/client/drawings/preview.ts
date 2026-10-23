import { exportToBlob } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { DrawingSummary } from "../../shared/types.ts";
import { deletePreview, savePreview } from "./api.ts";

/** Longest side of a preview in pixels, enough for a card on a high-density screen. */
const PREVIEW_SIZE = 640;

type Scene = {
	elements: ExcalidrawElement[];
	appState: Partial<AppState>;
	files: BinaryFiles;
};

/** Renders the scene as a PNG, or saves no preview when nothing is drawn. */
export async function storePreview(
	id: string,
	scene: string,
): Promise<DrawingSummary> {
	const { elements, appState, files }: Scene = JSON.parse(scene);
	const visible = elements.filter((element) => !element.isDeleted);
	if (visible.length === 0) return deletePreview(id);
	const png = await exportToBlob({
		elements: visible,
		appState: { ...appState, exportBackground: true },
		files,
		maxWidthOrHeight: PREVIEW_SIZE,
		mimeType: "image/png",
	});
	return savePreview(id, png);
}
