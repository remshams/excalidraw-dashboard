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
 * The "Filter by" row after the tag joined it. The row keeps the order in which
 * tags joined, so a tag joins at the end and a tag already in the row stays where
 * it is. While the row is longer than its size, the oldest tag that isn't selected
 * leaves. A selected tag never leaves, so with more selected tags the row holds
 * more.
 */
export function joinRow(
	row: string[],
	tagId: string,
	selected: string[],
): string[] {
	if (row.includes(tagId)) return row;
	const joined = [...row, tagId];
	const leaving = joined
		.filter((id) => id !== tagId && !selected.includes(id))
		.slice(0, Math.max(joined.length - ROW_SIZE, 0));
	return joined.filter((id) => !leaving.includes(id));
}
