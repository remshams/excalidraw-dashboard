import { useState } from "react";
import type { DrawingSummary } from "#shared/drawings.ts";
import type { Tag } from "#shared/tags.ts";
import { TagIcon } from "../../../icons.tsx";
import { TagInkFilter, TagMark } from "../TagMark.tsx";
import type { TagChanges } from "../use-tags.ts";
import styles from "./DrawingTagsButton.module.css";
import { DrawingTagsDialog } from "./DrawingTagsDialog.tsx";

/** How many tags the bar shows before it counts the rest, as many as a card. */
const SHOWN_TAGS = 3;

type DrawingTagsButtonProps = {
	/** The open drawing as the list has it, with its current name and tags. */
	drawing: DrawingSummary;
	/** Every tag, sorted by label. */
	tags: Tag[];
	changes: TagChanges;
	/** Gives the drawing the tag or takes it off. Rejects when the server refuses. */
	onToggle: (tagId: string) => Promise<void>;
};

/**
 * The open drawing's tags after its name in the editor bar: the first three, then
 * "+2" for the rest, or only a tag icon and the count on a narrow screen. They form
 * one button that opens the dialog to change them; without tags, it shows only the
 * icon.
 */
export function DrawingTagsButton({
	drawing,
	tags,
	changes,
	onToggle,
}: DrawingTagsButtonProps) {
	const [changing, setChanging] = useState(false);
	const own = tags.filter(({ id }) => drawing.tagIds.includes(id));
	const labels = own.map(({ label }) => label);
	const hidden = labels.slice(SHOWN_TAGS);

	return (
		<>
			<button
				type="button"
				className={styles.tags}
				aria-label={
					own.length > 0
						? `Change tags of ${drawing.name}: ${labels.join(", ")}`
						: `Add tags to ${drawing.name}`
				}
				aria-haspopup="dialog"
				onClick={() => setChanging(true)}
			>
				{own.length === 0 ? (
					<TagIcon />
				) : (
					<>
						<span className={styles.marks}>
							{own.slice(0, SHOWN_TAGS).map((tag) => (
								<TagMark
									key={tag.id}
									label={tag.label}
									color={tag.color}
									// The card's seed, so a tag leans the same way here as on its card.
									seed={drawing.id + tag.id}
									size="small"
								/>
							))}
							{hidden.length > 0 && (
								<span className={styles.more} title={hidden.join(", ")}>
									+{hidden.length}
								</span>
							)}
						</span>
						<span className={styles.count}>
							<TagIcon />
							{own.length}
						</span>
					</>
				)}
			</button>
			<TagInkFilter />
			{changing && (
				<DrawingTagsDialog
					drawing={drawing}
					tags={tags}
					changes={changes}
					onToggle={onToggle}
					onClose={() => setChanging(false)}
				/>
			)}
		</>
	);
}
