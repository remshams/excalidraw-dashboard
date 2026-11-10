import type { Tag } from "#shared/tags.ts";

/**
 * The tags a card shows in its slots, in label order. A tag keeps its slot when it
 * joins the filter or leaves it, so a click never moves it. Only a selected tag
 * that would hide behind "+N" takes a slot: it replaces the last shown tag that
 * isn't selected.
 */
export function shownCardTags(
	tags: Tag[],
	selectedTagIds: string[],
	slots: number,
): Tag[] {
	const selected = (tag: Tag) => selectedTagIds.includes(tag.id);
	const first = tags.slice(0, slots);
	const unselected = first.filter((tag) => !selected(tag));
	const waiting = tags
		.slice(slots)
		.filter(selected)
		.slice(0, unselected.length);
	const replaced = unselected.slice(unselected.length - waiting.length);
	return tags.filter(
		(tag) =>
			(first.includes(tag) && !replaced.includes(tag)) || waiting.includes(tag),
	);
}
