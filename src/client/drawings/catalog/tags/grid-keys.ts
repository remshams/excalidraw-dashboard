import type { KeyboardEvent } from "react";

/**
 * Moves the focus by the step the key asks for through the buttons in the
 * container. Returns the button it moved to, or null at the edge or for another key.
 */
function moveBy(
	event: KeyboardEvent,
	container: Element,
	steps: Partial<Record<string, number>>,
): HTMLElement | null {
	const step = steps[event.key];
	if (event.altKey || event.ctrlKey || event.metaKey || !step) return null;
	event.preventDefault();
	const items = [...container.querySelectorAll<HTMLElement>("button")];
	const current = items.indexOf(document.activeElement as HTMLElement);
	const next = items[current + step] ?? null;
	next?.focus();
	return next;
}

/**
 * Moves the focus with the arrow keys through the buttons of a CSS grid, up and down
 * by a whole row. A cell may hold several buttons, such as a tag and its pencil; up
 * and down then keep to the same one of the cell. Returns the button it moved to, or
 * null at the edge or for another key.
 */
export function moveInGrid(
	event: KeyboardEvent,
	grid: Element,
): HTMLElement | null {
	const columns = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
	const perCell =
		grid.firstElementChild?.querySelectorAll("button").length || 1;
	const row = columns * perCell;
	return moveBy(event, grid, {
		ArrowLeft: -1,
		ArrowRight: 1,
		ArrowUp: -row,
		ArrowDown: row,
	});
}

/**
 * Moves the focus with the left and right arrow keys through the buttons of a row.
 * Returns the button it moved to, or null at the edge or for another key.
 */
export function moveInRow(
	event: KeyboardEvent,
	row: Element,
): HTMLElement | null {
	return moveBy(event, row, { ArrowLeft: -1, ArrowRight: 1 });
}
