/**
 * Debounces scene saves. Excalidraw calls `onChange` on every pointer move, so the
 * scheduler waits for a pause and skips scenes identical to the last saved one.
 */
export function createSaveScheduler(
	save: (scene: string) => void,
	delayMs: number,
	savedScene: string | null,
) {
	let lastSaved = savedScene;
	let pending: string | null = null;
	let timer: ReturnType<typeof setTimeout> | undefined;

	const flush = () => {
		clearTimeout(timer);
		timer = undefined;
		if (pending === null) return;
		const scene = pending;
		pending = null;
		if (scene === lastSaved) return;
		lastSaved = scene;
		save(scene);
	};

	return {
		schedule(scene: string) {
			pending = scene;
			clearTimeout(timer);
			timer = setTimeout(flush, delayMs);
		},
		flush,
	};
}
