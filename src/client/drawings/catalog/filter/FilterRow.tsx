import { useId, useLayoutEffect, useRef } from "react";
import type { TagFilter } from "./use-tag-filter.ts";
import styles from "./FilterRow.module.css";
import { TagToggles } from "./TagToggles.tsx";

type FilterRowProps = {
	filter: TagFilter;
	onToggle: (tagId: string) => void;
	onClear: () => void;
};

/**
 * The "Filter by" row under the header: the tags filtered by most recently, each
 * one click from the filter. The ones in the filter come first in solid ink with
 * "or" between them, so the row reads as a sentence. It keeps one line of the same
 * height, blank while it has no tags, so the cards don't move when tags arrive.
 */
export function FilterRow({ filter, onToggle, onClear }: FilterRowProps) {
	const { rowTags, selectedTagIds } = filter;
	const words = useId();
	const row = useRef<HTMLDivElement>(null);
	// The Clear filter button goes with the filter, so the focus moves to the first
	// tag once the row shows its new order.
	const focusFirst = useRef(false);

	useLayoutEffect(() => {
		if (!focusFirst.current) return;
		focusFirst.current = false;
		row.current?.querySelector<HTMLElement>("[data-tag-toggle]")?.focus();
	});

	return (
		<div ref={row} className={styles.row}>
			{rowTags.length > 0 && (
				<>
					<span id={words} className={styles.words}>
						Filter by
					</span>
					<TagToggles
						tags={rowTags}
						selectedTagIds={selectedTagIds}
						seed="row"
						className={styles.tags}
						aria-labelledby={words}
						orBetween
						onToggle={onToggle}
					/>
					{selectedTagIds.length > 0 && (
						<button
							type="button"
							className={styles.clear}
							onClick={() => {
								focusFirst.current = true;
								onClear();
							}}
						>
							Clear filter
						</button>
					)}
				</>
			)}
		</div>
	);
}
