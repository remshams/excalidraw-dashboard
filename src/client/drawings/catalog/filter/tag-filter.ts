import type { DrawingSummary } from "#shared/drawings.ts";
import { searchByName } from "../../search.ts";

/** How many tags the "Filter by" row keeps. */
const ROW_SIZE = 8;

/**
 * The drawings that carry any of the tags and whose name matches the query. No
 * tags means every drawing, and an empty query matches every name.
 */
export function filterDrawings(
	drawings: DrawingSummary[],
	tagIds: string[],
	query: string,
): DrawingSummary[] {
	const tagged =
		tagIds.length === 0
			? drawings
			: drawings.filter((drawing) =>
					drawing.tagIds.some((id) => tagIds.includes(id)),
				);
	return searchByName(tagged, query);
}

/**
 * The recent tags of the "Filter by" row, newest first, after the tag joined the
 * filter. It moves to the front, and the oldest drops out beyond the row's size.
 */
export function rememberTag(recent: string[], tagId: string): string[] {
	return [tagId, ...recent.filter((id) => id !== tagId)].slice(0, ROW_SIZE);
}

/**
 * The order of the "Filter by" row: every selected tag in the order they were
 * selected, then the other recent tags, newest first. The row's size limits only
 * the recent tags, so a tag in the filter always has its place in the row.
 */
export function rowOrder(recent: string[], selected: string[]): string[] {
	return [...selected, ...recent.filter((id) => !selected.includes(id))];
}
