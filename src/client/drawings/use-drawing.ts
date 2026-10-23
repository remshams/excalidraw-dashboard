import { useEffect, useState } from "react";
import type { Drawing } from "../../shared/types.ts";
import { getDrawing } from "./api.ts";

/** Loads the drawing with `id`. Returns null while it loads or when no ID is set. */
export function useDrawing(
	id: string | null,
	onError: (error: unknown) => void,
): Drawing | null {
	const [drawing, setDrawing] = useState<Drawing | null>(null);

	useEffect(() => {
		if (!id) return;
		let cancelled = false;
		getDrawing(id).then((loaded) => {
			if (!cancelled) setDrawing(loaded);
		}, onError);
		return () => {
			cancelled = true;
		};
	}, [id, onError]);

	// The previous drawing stays in state until the next one loads; never show it.
	return drawing?.id === id ? drawing : null;
}
