import { Fragment, useRef, useState } from "react";
import { CloseIcon } from "../icons.tsx";
import { moveInRow } from "./grid-keys.ts";
import { type Tag, useMockTags } from "./mock-tags.ts";
import { Stamp, TagToggle } from "./Stamp.tsx";
import styles from "./FilterShelf.module.css";

type RemovableStampProps = {
	tag: Tag;
	seed: string;
	removeLabel: string;
	onRemove: (button: HTMLButtonElement) => void;
};

/** A tag with a button that takes it away. */
export function RemovableStamp({
	tag,
	seed,
	removeLabel,
	onRemove,
}: RemovableStampProps) {
	return (
		<button
			type="button"
			className={styles.removable}
			aria-label={removeLabel}
			title={removeLabel}
			onClick={(event) => onRemove(event.currentTarget)}
		>
			<Stamp label={tag.label} color={tag.color} seed={seed} />
			<CloseIcon />
		</button>
	);
}

type FilterShelfProps = {
	/** The trimmed search text. */
	searched: string;
	shown: number;
	total: number;
	/** The page offers its own Clear filter when the filter hides the search's matches. */
	clearable: boolean;
	onToggle: (tagId: string) => void;
	onClear: () => void;
};

/**
 * The row under the header: the tags last filtered by, one click from the filter.
 * They stay after clearing it. The ones in the filter stand together in full ink
 * with "or" between them, so the row reads as a sentence.
 */
export function FilterShelf({ searched, shown, total, clearable, onToggle, onClear }: FilterShelfProps) {
	const { tags, shelf, selectedTagIds } = useMockTags();
	const row = useRef<HTMLDivElement>(null);
	const [stop, setStop] = useState<string | null>(null);
	const stamps = shelf.flatMap((id) => tags.find((tag) => tag.id === id) ?? []);
	const current = stamps.some((tag) => tag.id === stop) ? stop : stamps[0]?.id;
	const filtering = selectedTagIds.length > 0;

	return (
		<div className={styles.shelf} data-filter-shelf>
			<span className={styles.words} id="filter-by">
				Filter by
			</span>
			<div
				ref={row}
				className={styles.stamps}
				role="toolbar"
				aria-labelledby="filter-by"
				onKeyDown={(event) => moveInRow(event, row.current, "button")}
			>
				{stamps.map((tag, index) => {
					const pressed = selectedTagIds.includes(tag.id);
					const afterSelected = pressed && selectedTagIds.includes(stamps[index - 1]?.id);
					return (
						<Fragment key={tag.id}>
							{afterSelected ? <span className={styles.or}>or</span> : null}
							<TagToggle
								tag={tag}
								seed={`shelf${tag.id}`}
								pressed={pressed}
								tabIndex={tag.id === current ? 0 : -1}
								onToggle={() => onToggle(tag.id)}
								onFocus={() => setStop(tag.id)}
							/>
						</Fragment>
					);
				})}
			</div>
			{filtering || searched ? (
				<span className={styles.result}>
					<span className={styles.count}>
						{shown} of {total}
					</span>
					{searched ? <span className={styles.words}>named “{searched}”</span> : null}
					{filtering && clearable ? (
						<button type="button" className={styles.clear} onClick={onClear}>
							Clear filter
						</button>
					) : null}
				</span>
			) : null}
		</div>
	);
}
