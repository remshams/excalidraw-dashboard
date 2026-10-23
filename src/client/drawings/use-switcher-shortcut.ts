import { useEffect } from "react";

/**
 * Calls `onToggle` on Ctrl+K or Cmd+K. It listens before Excalidraw, which
 * otherwise uses the shortcut to add a link.
 */
export function useSwitcherShortcut(onToggle: () => void) {
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k")
				return;
			event.preventDefault();
			event.stopPropagation();
			onToggle();
		};
		window.addEventListener("keydown", onKeyDown, { capture: true });
		return () =>
			window.removeEventListener("keydown", onKeyDown, { capture: true });
	}, [onToggle]);
}
