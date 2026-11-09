import type { DrawingSummary } from "#shared/drawings.ts";

/**
 * The drawings whose name contains the query, ignoring case and the spaces
 * around the query. An empty query matches every drawing.
 */
export function searchByName(
	drawings: DrawingSummary[],
	query: string,
): DrawingSummary[] {
	const needle = query.trim().toLocaleLowerCase();
	return drawings.filter((drawing) =>
		drawing.name.toLocaleLowerCase().includes(needle),
	);
}
