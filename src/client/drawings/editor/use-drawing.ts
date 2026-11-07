import { useEffect, useState } from "react";
import type { Drawing } from "../../../shared/drawings.ts";
import { getDrawing } from "../api.ts";

/** The result of loading one drawing: the drawing, or null if loading failed. */
type Loaded = { id: string; drawing: Drawing | null };

/**
 * Loads the drawing with `id`. `drawing` is null while it loads, when no ID is
 * set, and when loading failed; `failed` tells the last case apart.
 */
export function useDrawing(
	id: string | null,
	onError: (error: unknown) => void,
): { drawing: Drawing | null; failed: boolean } {
	const [loaded, setLoaded] = useState<Loaded | null>(null);

	useEffect(() => {
		if (!id) return;
		let cancelled = false;
		getDrawing(id).then(
			(drawing) => {
				if (!cancelled) setLoaded({ id, drawing });
			},
			(error: unknown) => {
				if (!cancelled) setLoaded({ id, drawing: null });
				onError(error);
			},
		);
		return () => {
			cancelled = true;
			// Forget the drawing once it closes. Reopening it must load the scene
			// again, which its last edits have changed since.
			setLoaded(null);
		};
	}, [id, onError]);

	const current = loaded?.id === id ? loaded : null;
	return {
		drawing: current?.drawing ?? null,
		failed: current !== null && current.drawing === null,
	};
}
