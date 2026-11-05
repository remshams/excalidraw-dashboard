import { useEffect } from "react";

/** The switcher's shortcut as a Mac or another system writes it. */
export const switcherShortcutHint = () =>
	navigator.platform.startsWith("Mac") ? "⌘K" : "Ctrl K";

/**
 * Calls `onToggle` on Ctrl+K or ⌘K. It listens in the capture phase and stops the
 * event there, so Excalidraw, which adds a link on the same keys, never sees it.
 * Other combinations such as Ctrl+Shift+K stay with the browser.
 */
export function useSwitcherShortcut(onToggle: () => void) {
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const command = event.ctrlKey || event.metaKey;
			const extra = event.shiftKey || event.altKey;
			if (!command || extra || event.key.toLowerCase() !== "k") return;
			event.preventDefault();
			event.stopPropagation();
			// Holding the keys would open and close the switcher over and over.
			if (!event.repeat) onToggle();
		};
		window.addEventListener("keydown", onKeyDown, { capture: true });
		return () =>
			window.removeEventListener("keydown", onKeyDown, { capture: true });
	}, [onToggle]);
}
