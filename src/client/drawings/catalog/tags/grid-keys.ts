import type { KeyboardEvent } from "react";

/**
 * Moves focus with the arrow keys through the items of a CSS grid, up and down
 * by a whole row. Returns the item it moved to, or null at the edge or for
 * another key.
 */
export function moveInGrid(
	event: KeyboardEvent,
	grid: HTMLElement | null,
	selector: string,
): HTMLElement | null {
	if (!grid || event.altKey || event.ctrlKey || event.metaKey) return null;
	const columns = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
	const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns }[
		event.key
	];
	if (!step) return null;
	event.preventDefault();
	const items = [...grid.querySelectorAll<HTMLElement>(selector)];
	const current = items.indexOf(document.activeElement as HTMLElement);
	const next = items[current + step] ?? null;
	next?.focus();
	return next;
}

/** Moves focus with the left and right arrow keys through a row of buttons. */
export function moveInRow(event: KeyboardEvent, row: HTMLElement | null, selector: string) {
	const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
	if (!row || !step) return;
	event.preventDefault();
	event.stopPropagation();
	const items = [...row.querySelectorAll<HTMLElement>(selector)];
	items[items.indexOf(document.activeElement as HTMLElement) + step]?.focus();
}
