import { useState } from "react";
import type { DrawingSummary } from "../../../../shared/drawings.ts";
import type { Tag } from "../../../../shared/tags.ts";
import { SearchLine } from "../dialog/SearchLine.tsx";
import { closeOnBackdropPress } from "../dialog/use-modal-dialog.ts";
import { PencilIcon, PlusIcon, TagIcon } from "../icons.tsx";
import { TagForm } from "./TagForm.tsx";
import styles from "./TagTray.module.css";
import { tagColorName } from "./tag-color-name.ts";
import { useTagTray } from "./use-tag-tray.ts";
import type { TagChanges } from "./use-tags.ts";

type TagTrayProps = {
	/** Every tag, or null while they load or when loading failed. */
	tags: Tag[] | null;
	drawings: DrawingSummary[];
	changes: TagChanges;
};

/** The Tags button and the tray it opens. */
export function TagTray(props: TagTrayProps) {
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
			{open && <TrayDialog {...props} onClose={() => setOpen(false)} />}
		</>
	);
}

type TrayDialogProps = TagTrayProps & {
	onClose: () => void;
};

const drawingCount = (drawings: DrawingSummary[], tagId: string) =>
	drawings.filter(({ tagIds }) => tagIds.includes(tagId)).length;

/**
 * A modal dialog under the Tags button that lists every tag, finds one by its label
 * and swaps the list for a form to create or change one. Its backdrop is
 * transparent, so the page stays in view (ADR 0003).
 */
function TrayDialog({ tags, drawings, changes, onClose }: TrayDialogProps) {
	const tray = useTagTray(tags, changes);
	const { form, find, shown, notice } = tray;

	return (
		<dialog
			ref={tray.dialog}
			className={styles.tray}
			aria-label="Tags"
			onKeyDown={(event) => {
				if (event.key !== "Escape") return;
				// Also keeps the browser from closing the dialog on its own.
				event.preventDefault();
				tray.goBack(onClose);
			}}
			// The Android back gesture.
			onCancel={onClose}
			onMouseDown={closeOnBackdropPress(onClose)}
		>
			{/* Focusable, so a press on its blank parts keeps Escape going through the
			    handler above rather than the browser closing the dialog. */}
			<div className={styles.page} tabIndex={-1}>
				{form ? (
					<div className={styles.formView}>
						<TagForm
							tag={form.tag}
							initialLabel={form.label}
							tags={tags ?? []}
							drawingCount={form.tag ? drawingCount(drawings, form.tag.id) : 0}
							onSave={tray.save}
							onDelete={tray.remove}
							onCancel={tray.cancel}
							onGone={tray.gone}
						/>
					</div>
				) : (
					<>
						<SearchLine
							ref={tray.findField}
							lineClassName={styles.find}
							type="search"
							aria-label="Find a tag"
							placeholder="Find a tag…"
							value={find}
							onChange={(event) => tray.setFind(event.target.value)}
							onKeyDown={tray.onFindKey}
						/>
						<ul
							ref={tray.rows}
							className={styles.rows}
							aria-label="Tags"
							onKeyDown={tray.onRowsKey}
						>
							{shown.map((tag) => (
								<TagRow
									key={tag.id}
									tag={tag}
									count={drawingCount(drawings, tag.id)}
									tabStop={tag.id === tray.tabStopId}
									onFocus={() => tray.setActiveId(tag.id)}
									onEdit={() => tray.startEdit(tag)}
								/>
							))}
						</ul>
					</>
				)}
				{/* Always rendered, so screen readers announce the message when it
				    appears. */}
				<p role="status" className={styles.status}>
					{!form && (notice ?? trayMessage(tags, shown, find))}
				</p>
				{!form && tags && (
					<div className={styles.footer}>
						<button
							type="button"
							className={styles.action}
							onClick={tray.startNew}
						>
							<PlusIcon />
							{shown.length === 0 && find.trim()
								? `Create “${find.trim()}”`
								: "New tag"}
						</button>
					</div>
				)}
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

type TagRowProps = {
	tag: Tag;
	/** How many drawings carry the tag. */
	count: number;
	/** Whether Tab reaches this row's button. The arrow keys reach the others. */
	tabStop: boolean;
	onFocus: () => void;
	onEdit: () => void;
};

/** A tag in its colour, with the number of drawings that carry it and a way to change it. */
function TagRow({
	tag: { label, color },
	count,
	tabStop,
	onFocus,
	onEdit,
}: TagRowProps) {
	return (
		<li className={styles.row}>
			<span
				className={styles.swatch}
				role="img"
				aria-label={tagColorName(color)}
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
			<button
				type="button"
				className={styles.pencil}
				tabIndex={tabStop ? 0 : -1}
				aria-label={`Change ${label}`}
				title="Rename, recolour or delete"
				onFocus={onFocus}
				onClick={onEdit}
			>
				<PencilIcon />
			</button>
		</li>
	);
}
