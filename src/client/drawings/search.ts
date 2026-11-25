import type { SavedDrawing } from "./scratchpad.ts";

/**
 * The drawings whose name contains the query, ignoring case and the spaces
 * around the query. An empty query matches every drawing.
 */
export function searchByName<T extends SavedDrawing>(
	drawings: T[],
	query: string,
): T[] {
	const needle = query.trim().toLocaleLowerCase();
	return drawings.filter((drawing) =>
		drawing.name.toLocaleLowerCase().includes(needle),
	);
}
