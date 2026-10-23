import { Excalidraw, serializeAsJSON } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useEffect, useRef, useState } from "react";
import type { Drawing, DrawingSummary } from "../../shared/types.ts";
import { updateDrawing } from "./api.ts";
import { storePreview } from "./preview.ts";
import { createSaveScheduler } from "./save-scheduler.ts";

const SAVE_DELAY_MS = 1000;

type EditorProps = {
	drawing: Drawing;
	onSaved: (summary: DrawingSummary) => void;
	onError: (error: unknown) => void;
};

/** Edits one drawing. Render it with `key={drawing.id}` so switching drawings remounts it. */
export function Editor({ drawing, onSaved, onError }: EditorProps) {
	const callbacks = useRef({ onSaved, onError });
	callbacks.current = { onSaved, onError };

	const [initialData] = useState(() =>
		drawing.scene ? JSON.parse(drawing.scene) : null,
	);
	const [scheduler] = useState(() => {
		const saved = (summary: DrawingSummary) =>
			callbacks.current.onSaved(summary);
		const failed = (error: unknown) => callbacks.current.onError(error);
		// The preview follows the scene, so a failed render never loses a change.
		// The list hears of the save once the preview is stored.
		return createSaveScheduler(
			(scene) =>
				updateDrawing(drawing.id, { scene })
					.then((summary) =>
						storePreview(drawing.id, scene).catch((error: unknown) => {
							failed(error);
							return summary;
						}),
					)
					.then(saved, failed),
			SAVE_DELAY_MS,
			drawing.scene,
		);
	});

	// Drawings saved before previews existed get one when opened.
	useEffect(() => {
		if (!drawing.scene || drawing.hasPreview) return;
		storePreview(drawing.id, drawing.scene).then(
			(summary) => callbacks.current.onSaved(summary),
			(error: unknown) => callbacks.current.onError(error),
		);
	}, [drawing]);

	useEffect(() => {
		const flush = () => scheduler.flush();
		window.addEventListener("pagehide", flush);
		return () => {
			window.removeEventListener("pagehide", flush);
			flush();
		};
	}, [scheduler]);

	return (
		<Excalidraw
			initialData={initialData}
			onChange={(elements, appState, files) =>
				scheduler.schedule(serializeAsJSON(elements, appState, files, "local"))
			}
		/>
	);
}
