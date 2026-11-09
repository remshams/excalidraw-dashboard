import { type Tag, tagLabelKey } from "#shared/tags.ts";

/**
 * The tags whose label contains the text, ignoring case. Labels that start with
 * the text come first, so "work" finds Work before Network. In a list sorted by
 * label, that puts an exact match on top. An empty text finds every tag.
 */
export function findTags(tags: Tag[], text: string): Tag[] {
	const needle = tagLabelKey(text);
	const rank = (tag: Tag) =>
		tagLabelKey(tag.label).startsWith(needle) ? 0 : 1;
	return tags
		.filter((tag) => tagLabelKey(tag.label).includes(needle))
		.sort((a, b) => rank(a) - rank(b));
}
