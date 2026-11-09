import { Excalidraw, serializeAsJSON } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useState } from "react";
import type { Drawing, DrawingSummary } from "#shared/drawings.ts";
import { useAutosave } from "./use-autosave.ts";
import { usePreview } from "./use-preview.ts";

type EditorProps = {
	drawing: Drawing;
	/** Display only: Excalidraw leaves the theme out of the stored scene. */
	theme?: "light" | "dark";
	onSaved: (summary: DrawingSummary) => void;
	onError: (error: unknown) => void;
};

/** Edits one drawing. Render it with `key={drawing.id}` so switching drawings remounts it. */
export function Editor({ drawing, theme, onSaved, onError }: EditorProps) {
	const [initialData] = useState(() =>
		drawing.scene ? JSON.parse(drawing.scene) : null,
	);
	const { schedule, settle } = useAutosave(drawing, { onSaved, onError });
	usePreview(drawing, settle, onSaved);

	return (
		<Excalidraw
			initialData={initialData}
			theme={theme}
			// The app follows the system's theme, so Excalidraw's own toggle stays hidden.
			UIOptions={{ canvasActions: { toggleTheme: false } }}
			onChange={(elements, appState, files) =>
				schedule(serializeAsJSON(elements, appState, files, "local"))
			}
		/>
	);
}
