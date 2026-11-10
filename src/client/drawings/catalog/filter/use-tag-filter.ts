import { useState } from "react";
import type { Tag } from "#shared/tags.ts";
import { rememberTag, rowOrder } from "./tag-filter.ts";

/**
 * The landing page's tag filter and search. `App` holds them, so they stay set
 * while a drawing is open; a reload clears them. A tag that no longer exists
 * leaves the filter and the "Filter by" row.
 */
export function useTagFilter(tags: Tag[] | null) {
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [recentIds, setRecentIds] = useState<string[]>([]);
	const [query, setQuery] = useState("");

	/** The loaded tag with the ID, or none while the tags load or once it is deleted. */
	const tagOf = (id: string) => tags?.find((tag) => tag.id === id) ?? [];
	const selectedTags = selectedIds.flatMap(tagOf);
	const recentTags = recentIds.flatMap(tagOf);
	const selectedTagIds = selectedTags.map(({ id }) => id);
	const live = recentTags.map(({ id }) => id);
	const rowTags = rowOrder(live, selectedTagIds).flatMap(tagOf);

	/** Adds the tag to the filter and to the front of the row, or takes it out. */
	const toggle = (tagId: string) => {
		if (selectedTagIds.includes(tagId)) {
			setSelectedIds(selectedTagIds.filter((id) => id !== tagId));
		} else {
			setSelectedIds([...selectedTagIds, tagId]);
			setRecentIds(rememberTag(live, tagId));
		}
	};

	/** Empties the filter. The row keeps its tags. */
	const clear = () => setSelectedIds([]);

	return {
		query,
		setQuery,
		/** The tags in the filter, in the order they were selected. */
		selectedTags,
		selectedTagIds,
		/** The tags of the "Filter by" row, in the order it shows them. */
		rowTags,
		toggle,
		clear,
	};
}

export type TagFilter = ReturnType<typeof useTagFilter>;
