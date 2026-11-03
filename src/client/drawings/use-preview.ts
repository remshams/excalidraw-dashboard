import { useEffect, useRef, useState } from "react";
import type { Drawing, DrawingSummary } from "../../shared/types.ts";
import { isPreviewOutdated, storePreview } from "./preview.ts";
import type { SavedScene } from "./use-autosave.ts";

/**
 * Keeps the drawing's preview current. It renders one when the drawing opens and
 * when the user leaves it, but only if the preview is missing or older than the
 * last scene save. A failure is only logged; the next open tries again.
 */
export function usePreview(
	drawing: Drawing,
	settle: () => Promise<SavedScene>,
	onStored: (summary: DrawingSummary) => void,
) {
	const latest = useRef({ settle, onStored });
	latest.current = { settle, onStored };

	const [refresh] = useState(() => {
		// The scene save the preview shows. An upload can finish after a later save,
		// so the server's previewUpdatedAt can't tell whether the preview is current.
		let renderedAt = drawing.previewUpdatedAt;
		let hasPreview = drawing.previewUpdatedAt !== null;
		// One check at a time, so opening and leaving never render twice.
		let queue = Promise.resolve();

		const check = async () => {
			// Waits for the scene save, so the preview is never older than the scene.
			const { scene, summary } = await latest.current.settle();
			const { updatedAt } = summary;
			if (!isPreviewOutdated({ previewUpdatedAt: renderedAt, updatedAt }))
				return;
			const stored = await storePreview(drawing.id, scene, hasPreview);
			renderedAt = updatedAt;
			if (!stored) return;
			hasPreview = stored.previewUpdatedAt !== null;
			latest.current.onStored(stored);
		};

		return () => {
			queue = queue
				.then(check)
				.catch((error: unknown) =>
					console.warn("Couldn't store the drawing's preview", error),
				);
		};
	});

	useEffect(() => {
		refresh();
		window.addEventListener("pagehide", refresh);
		return () => {
			window.removeEventListener("pagehide", refresh);
			refresh();
		};
	}, [refresh]);
}
