import { useState } from "react";
import type { DrawingSummary } from "../../../../shared/drawings.ts";
import type { Tag } from "../../../../shared/tags.ts";
import { TagIcon } from "../icons.tsx";
import { closeOnBackdropPress } from "../use-modal-dialog.ts";
import styles from "./TagTray.module.css";
import { useTagTray } from "./use-tag-tray.ts";

type TagTrayProps = {
	/** Every tag, or null while they load or when loading failed. */
	tags: Tag[] | null;
	drawings: DrawingSummary[];
};

/** The Tags button and the tray it opens. */
export function TagTray({ tags, drawings }: TagTrayProps) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<button
				type="button"
				className={styles.button}
				aria-haspopup="dialog"
				onClick={() => setOpen(true)}
			>
				<TagIcon />
				Tags
			</button>
			{open && (
				<TrayDialog
					tags={tags}
					drawings={drawings}
					onClose={() => setOpen(false)}
				/>
			)}
		</>
	);
}

type TrayDialogProps = TagTrayProps & {
	onClose: () => void;
};

/**
 * A modal dialog under the Tags button that lists every tag and finds one by its
 * label. Its backdrop is transparent, so the page stays in view (ADR 0003).
 */
function TrayDialog({ tags, drawings, onClose }: TrayDialogProps) {
	const { dialog, find, setFind, shown } = useTagTray(tags ?? []);

	return (
		<dialog
			ref={dialog}
			className={styles.tray}
			aria-label="Tags"
			onKeyDown={(event) => {
				if (event.key !== "Escape") return;
				// Also keeps the browser from closing the dialog on its own.
				event.preventDefault();
				if (find) setFind("");
				else onClose();
			}}
			// The Android back gesture.
			onCancel={onClose}
			onMouseDown={closeOnBackdropPress(onClose)}
		>
			<div className={styles.page}>
				<input
					type="search"
					className={styles.find}
					aria-label="Find a tag"
					placeholder="Find a tag…"
					value={find}
					onChange={(event) => setFind(event.target.value)}
				/>
				<ul className={styles.rows} aria-label="Tags">
					{shown.map((tag) => (
						<TagRow key={tag.id} tag={tag} drawings={drawings} />
					))}
				</ul>
				{/* Always rendered, so screen readers announce the message when it
				    appears. */}
				<p role="status" className={styles.status}>
					{trayMessage(tags, shown, find)}
				</p>
			</div>
		</dialog>
	);
}

/** What the tray says when it has no rows to show, or null when it has some. */
function trayMessage(tags: Tag[] | null, shown: Tag[], find: string) {
	if (tags === null) return "The tags aren't loaded.";
	if (shown.length > 0) return null;
	const searched = find.trim();
	return searched ? `No tag is called “${searched}”.` : "No tags yet.";
}

const capitalized = (word: string) => word[0].toUpperCase() + word.slice(1);

/** A tag in its colour, with the number of drawings that carry it. */
function TagRow({
	tag: { id, label, color },
	drawings,
}: {
	tag: Tag;
	drawings: DrawingSummary[];
}) {
	const count = drawings.filter(({ tagIds }) => tagIds.includes(id)).length;

	return (
		<li className={styles.row}>
			<span
				className={styles.swatch}
				role="img"
				aria-label={capitalized(color)}
				style={{ background: `var(--tag-${color}-solid)` }}
			/>
			<span className={styles.label} title={label}>
				{label}
			</span>
			<span className={styles.count}>
				{count}
				<span className={styles.visuallyHidden}>
					{count === 1 ? " drawing" : " drawings"}
				</span>
			</span>
		</li>
	);
}
