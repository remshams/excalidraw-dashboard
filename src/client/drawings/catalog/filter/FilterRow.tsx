import { useId, useRef } from "react";
import type { TagFilter } from "./use-tag-filter.ts";
import styles from "./FilterRow.module.css";
import { TagToggles } from "./TagToggles.tsx";

type FilterRowProps = {
	filter: TagFilter;
	onToggle: (tagId: string) => void;
	onClear: () => void;
};

/**
 * The "Filter by" row under the header: every tag, newest created first, each one
 * click from the filter. A tag keeps its place, so a click only turns it on or off;
 * the ones in the filter show in solid ink. It keeps one line of the same height,
 * blank while there are no tags, so the cards don't move when tags arrive. The
 * tags scroll sideways and fade at an edge where some are cut off.
 */
export function FilterRow({ filter, onToggle, onClear }: FilterRowProps) {
	const { rowTags, selectedTagIds } = filter;
	const words = useId();
	const row = useRef<HTMLDivElement>(null);

	return (
		<div ref={row} className={styles.row} data-filter-row>
			{rowTags.length > 0 && (
				<>
					<span id={words} className={styles.words}>
						Filter by
					</span>
					<TagToggles
						tags={rowTags}
						selectedTagIds={selectedTagIds}
						seed="row"
						size="medium"
						className={styles.tags}
						aria-labelledby={words}
						onToggle={onToggle}
					/>
					{selectedTagIds.length > 0 && (
						<button
							type="button"
							className={styles.clear}
							onClick={() => {
								// The button goes with the filter; the tags stay where they are.
								row.current
									?.querySelector<HTMLElement>("[data-tag-toggle]")
									?.focus();
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
