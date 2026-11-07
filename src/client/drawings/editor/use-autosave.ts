import { useEffect, useRef, useState } from "react";
import type { Drawing, DrawingSummary } from "../../../shared/drawings.ts";
import { updateDrawing } from "../api.ts";
import { createSaveScheduler } from "./save-scheduler.ts";

const SAVE_DELAY_MS = 1000;

/** The last scene the server stored, with the summary it returned. */
export type SavedScene = { scene: string | null; summary: DrawingSummary };

type Callbacks = {
	onSaved: (summary: DrawingSummary) => void;
	onError: (error: unknown) => void;
};

/**
 * Saves the drawing's scene after each pause in editing, and right away when the
 * page is hidden or the editor closes.
 */
export function useAutosave(drawing: Drawing, callbacks: Callbacks) {
	const latest = useRef(callbacks);
	latest.current = callbacks;
	const saved = useRef<SavedScene>({ scene: drawing.scene, summary: drawing });

	const [scheduler] = useState(() =>
		createSaveScheduler(
			(scene) =>
				updateDrawing(drawing.id, { scene }).then(
					(summary) => {
						saved.current = { scene, summary };
						latest.current.onSaved(summary);
					},
					(error: unknown) => latest.current.onError(error),
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

	/** Saves any pending scene, then resolves with the last stored one. */
	const settle = () => scheduler.flush().then(() => saved.current);

	return { schedule: scheduler.schedule, settle };
}
