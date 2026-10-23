import { Excalidraw, serializeAsJSON } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useEffect, useRef, useState } from "react";
import type { Drawing, DrawingSummary } from "../../shared/types.ts";
import { updateDrawing } from "./api.ts";
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
	const [scheduler] = useState(() =>
		createSaveScheduler(
			(scene) =>
				updateDrawing(drawing.id, { scene }).then(
					(summary) => callbacks.current.onSaved(summary),
					(error: unknown) => callbacks.current.onError(error),
				),
			SAVE_DELAY_MS,
			drawing.scene,
		),
	);

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
