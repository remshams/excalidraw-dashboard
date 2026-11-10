import { type ReactNode, type Ref, useState } from "react";
import type { Tag } from "#shared/tags.ts";
import { moveInRow } from "../tags/grid-keys.ts";
import { TagMark } from "../tags/TagMark.tsx";
import styles from "./TagToggles.module.css";

type TagTogglesProps = {
	tags: Tag[];
	selectedTagIds: string[];
	/** Keeps each tag's angle the same in this place. */
	seed: string;
	className?: string;
	/** The toolbar element. */
	ref?: Ref<HTMLDivElement>;
	onToggle: (tagId: string) => void;
	/** Follows the tags, such as "+2" for the ones a card leaves out. */
	children?: ReactNode;
} & ({ "aria-label": string } | { "aria-labelledby": string });

/**
 * Tags as buttons that put them in the filter or take them out, in a toolbar with
 * one tab stop: the tag last used. The left and right arrow keys reach the others.
 * A tag in the filter is pressed and inked solid; that alone marks it.
 */
export function TagToggles({
	tags,
	selectedTagIds,
	seed,
	className,
	ref,
	onToggle,
	children,
	...label
}: TagTogglesProps) {
	const [stopId, setStopId] = useState<string | null>(null);
	const tabStop = tags.some(({ id }) => id === stopId)
		? stopId
		: (tags[0]?.id ?? null);
	const pressed = (id: string) => selectedTagIds.includes(id);

	return (
		<div
			ref={ref}
			role="toolbar"
			className={className}
			{...label}
			onKeyDown={(event) => moveInRow(event, event.currentTarget)}
		>
			{tags.map((tag) => (
				<button
					key={tag.id}
					type="button"
					className={styles.toggle}
					data-tag-toggle={tag.id}
					aria-label={`Filter by ${tag.label}`}
					aria-pressed={pressed(tag.id)}
					tabIndex={tag.id === tabStop ? 0 : -1}
					onFocus={() => setStopId(tag.id)}
					onClick={() => onToggle(tag.id)}
				>
					<TagMark
						label={tag.label}
						color={tag.color}
						seed={seed + tag.id}
						small
						inked={pressed(tag.id)}
					/>
				</button>
			))}
			{children}
		</div>
	);
}
