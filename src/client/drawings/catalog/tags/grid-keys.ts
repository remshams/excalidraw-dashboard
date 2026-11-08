import type { KeyboardEvent } from "react";

/**
 * Moves the focus with the arrow keys through the buttons of a CSS grid, up and down
 * by a whole row. Returns the button it moved to, or null at the edge or for another
 * key.
 */
export function moveInGrid(
	event: KeyboardEvent,
	grid: Element,
): HTMLElement | null {
	if (event.altKey || event.ctrlKey || event.metaKey) return null;
	const columns = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
	const step = {
		ArrowLeft: -1,
		ArrowRight: 1,
		ArrowUp: -columns,
		ArrowDown: columns,
	}[event.key];
	if (!step) return null;
	event.preventDefault();
	const items = [...grid.querySelectorAll<HTMLElement>("button")];
	const current = items.indexOf(document.activeElement as HTMLElement);
	const next = items[current + step] ?? null;
	next?.focus();
	return next;
}
