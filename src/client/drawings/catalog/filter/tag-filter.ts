import type { DrawingSummary } from "#shared/drawings.ts";
import type { Tag } from "#shared/tags.ts";
import { searchByName } from "../../search.ts";

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
 * The tags of the "Filter by" row: newest created first, labels breaking a tie.
 * The order depends only on the tags, so a tag moves only when one is created or
 * deleted.
 */
export const newestFirst = (tags: Tag[]): Tag[] =>
	[...tags].sort(
		(a, b) =>
			b.createdAt.localeCompare(a.createdAt) || a.label.localeCompare(b.label),
	);
