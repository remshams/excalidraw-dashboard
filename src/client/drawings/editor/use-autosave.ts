import { useEffect, useRef, useState } from "react";
import type { Drawing, DrawingSummary } from "#shared/drawings.ts";
import { createDrawing, updateDrawing } from "../api.ts";
import { createSaveScheduler } from "./save-scheduler.ts";

const SAVE_DELAY_MS = 1000;

/** The last scene the server stored, with the summary it returned. */
export type SavedScene = { scene: string | null; summary: DrawingSummary };

type Callbacks = {
	onSaved: (summary: DrawingSummary) => void;
	onError: (error: unknown) => void;
};

/** Stores a new scratchpad with its first scene and answers with its summary. */
async function createScratchpad(
	id: string,
	scene: string,
): Promise<DrawingSummary> {
	const { scene: _stored, ...summary } = await createDrawing({ id, scene });
	return summary;
}

/**
 * Saves the drawing's scene after each pause in editing, and right away when the
 * page is hidden or the editor closes. A new scratchpad (`isNew`) has no stored
 * drawing yet: its first save creates it, and only once the scene shows
 * something, so leaving it empty stores nothing.
 */
export function useAutosave(
	drawing: Drawing,
	isNew: boolean,
	callbacks: Callbacks,
) {
	const latest = useRef(callbacks);
	latest.current = callbacks;
	const saved = useRef<SavedScene>({ scene: drawing.scene, summary: drawing });
	const stored = useRef(!isNew);

	const write = (scene: string) =>
		stored.current
			? updateDrawing(drawing.id, { scene })
			: createScratchpad(drawing.id, scene);

	const [scheduler] = useState(() =>
		createSaveScheduler(
			(scene) =>
				write(scene).then(
					(summary) => {
						stored.current = true;
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

	/**
	 * Saves the scene after the next pause. `drawn` tells whether it shows
	 * anything; Excalidraw reports an empty scene as soon as it opens.
	 */
	const schedule = (scene: string, drawn: boolean) => {
		if (drawn || stored.current) scheduler.schedule(scene);
		else scheduler.cancel();
	};

	/** Saves any pending scene, then resolves with the last stored one. */
	const settle = () => scheduler.flush().then(() => saved.current);

	return { schedule, settle };
}
