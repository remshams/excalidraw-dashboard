import type { DrawingSummary } from "../../shared/types.ts";

/** The drawings whose name contains the query, ignoring case and surrounding spaces. */
export function searchByName(
	drawings: DrawingSummary[],
	query: string,
): DrawingSummary[] {
	const needle = query.trim().toLocaleLowerCase();
	return drawings.filter((drawing) =>
		drawing.name.toLocaleLowerCase().includes(needle),
	);
}
