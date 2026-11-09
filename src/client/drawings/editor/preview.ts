import { exportToBlob } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { DrawingSummary } from "#shared/drawings.ts";
import { deletePreview, savePreview } from "../api.ts";

/** Longest side of a preview in pixels, enough for a card on a high-density screen. */
const PREVIEW_SIZE = 640;

type Scene = {
	elements: ExcalidrawElement[];
	appState: Partial<AppState>;
	files: BinaryFiles;
};

/** Whether a drawing has no preview, or one older than its last scene save. */
export const isPreviewOutdated = ({
	previewUpdatedAt,
	updatedAt,
}: Pick<DrawingSummary, "previewUpdatedAt" | "updatedAt">) =>
	previewUpdatedAt === null || previewUpdatedAt < updatedAt;

/**
 * Renders the scene as a light PNG and stores it as the drawing's preview. A scene
 * with nothing visible removes the preview. Returns null when nothing changed.
 */
export async function storePreview(
	id: string,
	scene: string | null,
	hasPreview: boolean,
): Promise<DrawingSummary | null> {
	const { elements, appState, files }: Scene = scene
		? JSON.parse(scene)
		: { elements: [], appState: {}, files: {} };
	const visible = elements.filter((element) => !element.isDeleted);
	if (visible.length === 0) return hasPreview ? deletePreview(id) : null;
	const png = await exportToBlob({
		elements: visible,
		appState: {
			...appState,
			exportBackground: true,
			exportWithDarkMode: false,
		},
		files,
		maxWidthOrHeight: PREVIEW_SIZE,
		mimeType: "image/png",
	});
	return savePreview(id, png);
}
