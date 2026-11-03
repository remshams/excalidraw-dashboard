/**
 * Debounces scene saves. Excalidraw calls `onChange` on every pointer move, so the
 * scheduler waits for a pause and skips scenes identical to the last saved one.
 * Saves run one at a time, because the server keeps whichever write lands last.
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
	// Saves started or waiting. With none, a save starts right away, so the page
	// sends it even while it's being hidden.
	let queued = 0;

	const enqueue = (scene: string) => {
		const start = () =>
			save(scene).finally(() => {
				queued--;
			});
		saving = queued++ > 0 ? saving.then(start) : start();
	};

	/** Saves the pending scene now. Resolves once the latest save has settled. */
	const flush = () => {
		clearTimeout(timer);
		timer = undefined;
		const scene = pending;
		pending = null;
		if (scene !== null && scene !== lastSaved) {
			lastSaved = scene;
			enqueue(scene);
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
