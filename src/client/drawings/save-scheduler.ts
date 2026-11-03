/**
 * Debounces scene saves. Excalidraw calls `onChange` on every pointer move, so the
 * scheduler waits for a pause and skips scenes identical to the last saved one.
 * `save` must handle its own errors; the scheduler only waits for it to settle.
 */
export function createSaveScheduler(
	save: (scene: string) => Promise<void>,
	delayMs: number,
	savedScene: string | null,
) {
	let lastSaved = savedScene;
	let pending: string | null = null;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let saving: Promise<void> = Promise.resolve();

	/** Saves the pending scene now. Resolves once the latest save has settled. */
	const flush = () => {
		clearTimeout(timer);
		timer = undefined;
		const scene = pending;
		pending = null;
		if (scene !== null && scene !== lastSaved) {
			lastSaved = scene;
			saving = save(scene);
		}
		return saving;
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
