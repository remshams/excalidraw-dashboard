import { useState } from "react";
import type { Tag } from "#shared/tags.ts";
import { joinRow } from "./tag-filter.ts";

/**
 * The landing page's tag filter and search. `App` holds them, so they stay set
 * while a drawing is open; a reload clears them. A tag that no longer exists
 * leaves the filter and the "Filter by" row.
 */
export function useTagFilter(tags: Tag[] | null) {
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [rowIds, setRowIds] = useState<string[]>([]);
	const [query, setQuery] = useState("");

	/** The loaded tag with the ID, or none while the tags load or once it is deleted. */
	const tagOf = (id: string) => tags?.find((tag) => tag.id === id) ?? [];
	const selectedTags = selectedIds.flatMap(tagOf);
	const rowTags = rowIds.flatMap(tagOf);
	const selectedTagIds = selectedTags.map(({ id }) => id);

	/**
	 * Adds the tag to the filter, and to the end of the row if it isn't there yet,
	 * or takes it out of the filter. A tag in the row never moves.
	 */
	const toggle = (tagId: string) => {
		if (selectedTagIds.includes(tagId)) {
			setSelectedIds(selectedTagIds.filter((id) => id !== tagId));
		} else {
			const selected = [...selectedTagIds, tagId];
			setSelectedIds(selected);
			const row = rowTags.map(({ id }) => id);
			setRowIds(joinRow(row, tagId, selected));
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
		/** The tags of the "Filter by" row, in the order they joined it. */
		rowTags,
		toggle,
		clear,
	};
}

export type TagFilter = ReturnType<typeof useTagFilter>;
