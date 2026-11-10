import { useState } from "react";
import type { Tag } from "#shared/tags.ts";
import { newestFirst } from "./tag-filter.ts";

/**
 * The landing page's tag filter and search. `App` holds them, so they stay set
 * while a drawing is open; a reload clears them. A tag that no longer exists
 * leaves the filter.
 */
export function useTagFilter(tags: Tag[] | null) {
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [query, setQuery] = useState("");

	/** The loaded tag with the ID, or none while the tags load or once it is deleted. */
	const tagOf = (id: string) => tags?.find((tag) => tag.id === id) ?? [];
	const selectedTags = selectedIds.flatMap(tagOf);
	const rowTags = tags ? newestFirst(tags) : [];
	const selectedTagIds = selectedTags.map(({ id }) => id);

	/** Adds the tag to the filter, or takes it out. Nothing in the row moves. */
	const toggle = (tagId: string) =>
		setSelectedIds(
			selectedTagIds.includes(tagId)
				? selectedTagIds.filter((id) => id !== tagId)
				: [...selectedTagIds, tagId],
		);

	/** Empties the filter. */
	const clear = () => setSelectedIds([]);

	return {
		query,
		setQuery,
		/** The tags in the filter, in the order they were selected. */
		selectedTags,
		selectedTagIds,
		/** Every tag, newest created first: the "Filter by" row. */
		rowTags,
		toggle,
		clear,
	};
}

export type TagFilter = ReturnType<typeof useTagFilter>;
