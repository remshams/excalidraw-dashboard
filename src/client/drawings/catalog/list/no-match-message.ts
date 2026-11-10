import type { Tag } from "#shared/tags.ts";

/** The labels joined as "Work", "Work or Home", or "Work, Home or Ideas". */
function orList(tags: Tag[]) {
	const labels = tags.map(({ label }) => label);
	const last = labels.pop();
	return labels.length > 0 ? `${labels.join(", ")} or ${last}` : `${last}`;
}

/**
 * Says why the landing page shows no drawing: what the search and the filter asked
 * for. `outside` counts the drawings outside the filter whose name the search
 * matches.
 */
export function noMatchMessage(
	searched: string,
	selected: Tag[],
	outside: number,
): string {
	if (!searched) return `No drawing has ${orList(selected)}.`;
	const named = `“${searched}”`;
	if (selected.length === 0 || outside === 0) {
		return `No drawing is named ${named}.`;
	}
	const these = selected.length === 1 ? "this tag" : "these tags";
	const others =
		outside === 1
			? `1 drawing without ${these} is.`
			: `${outside} drawings without ${these} are.`;
	return `No drawing with ${orList(selected)} is named ${named}. ${others}`;
}
