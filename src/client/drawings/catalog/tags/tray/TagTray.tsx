import { type CSSProperties, type Ref, useId, useState } from "react";
import type { DrawingSummary } from "#shared/drawings.ts";
import type { Tag } from "#shared/tags.ts";
import { SearchLine } from "../../dialog/SearchLine.tsx";
import { closeOnBackdropPress } from "../../dialog/use-modal-dialog.ts";
import { PencilIcon, TagIcon } from "../../../icons.tsx";
import { TagForm } from "../form/TagForm.tsx";
import { NewTagButton } from "../NewTagButton.tsx";
import { tagColorName } from "../tag-color-name.ts";
import type { TagChanges } from "../use-tags.ts";
import styles from "./TagTray.module.css";
import { type RowPart, useTagTray } from "./use-tag-tray.ts";

type TagTrayProps = {
	/** Every tag, or null while they load or when loading failed. */
	tags: Tag[] | null;
	drawings: DrawingSummary[];
	changes: TagChanges;
	/** The IDs of the tags in the landing page's filter. */
	selectedTagIds: string[];
	/** Puts the tag in the filter or takes it out. */
	onToggleFilter: (tagId: string) => void;
	onClearFilter: () => void;
};

type TagTrayButtonProps = TagTrayProps & {
	/** The Tags button, for the page to focus when the focus has nowhere else to go. */
	ref?: Ref<HTMLButtonElement>;
};

/** The Tags button, which counts the tags in the filter, and the tray it opens. */
export function TagTray({ ref, ...props }: TagTrayButtonProps) {
	const [open, setOpen] = useState(false);
	const filtered = props.selectedTagIds.length;

	return (
		<>
			<button
				ref={ref}
				type="button"
				className={styles.button}
				aria-haspopup="dialog"
				aria-label={
					filtered > 0 ? `Tags, ${filtered} in the filter` : undefined
				}
				onClick={() => setOpen(true)}
			>
				<TagIcon />
				Tags
				{filtered > 0 && <span className={styles.badge}>{filtered}</span>}
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
function TrayDialog({
	tags,
	drawings,
	changes,
	selectedTagIds,
	onToggleFilter,
	onClearFilter,
	onClose,
}: TrayDialogProps) {
	const tray = useTagTray(tags, changes, selectedTagIds, onToggleFilter);
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
									pressed={selectedTagIds.includes(tag.id)}
									tabStop={
										tag.id === tray.tabStop?.id ? tray.tabStop.part : null
									}
									onFocus={(part) => tray.setActive({ id: tag.id, part })}
									onToggle={() => onToggleFilter(tag.id)}
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
						<NewTagButton
							label={shown.length === 0 ? find.trim() : ""}
							onClick={tray.startNew}
						/>
						{selectedTagIds.length > 0 && (
							<button
								type="button"
								className={styles.clear}
								onClick={() => {
									// The button goes with the filter.
									tray.findField.current?.focus();
									onClearFilter();
								}}
							>
								Clear filter
							</button>
						)}
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
	/** Whether the tag is in the filter. */
	pressed: boolean;
	/** Which of this row's buttons Tab reaches, if any. The arrow keys reach the others. */
	tabStop: RowPart | null;
	onFocus: (part: RowPart) => void;
	onToggle: () => void;
	onEdit: () => void;
};

/**
 * A tag in its colour with the number of drawings that carry it, as a button that
 * puts it in the filter or takes it out, and a way to change it.
 */
function TagRow({
	tag: { label, color },
	count,
	pressed,
	tabStop,
	onFocus,
	onToggle,
	onEdit,
}: TagRowProps) {
	const details = useId();
	return (
		<li className={styles.row}>
			<button
				type="button"
				className={styles.toggle}
				aria-label={`Filter by ${label}`}
				aria-describedby={details}
				aria-pressed={pressed}
				style={{ "--pressed-ink": `var(--tag-${color}-fill)` } as CSSProperties}
				tabIndex={tabStop === "toggle" ? 0 : -1}
				onFocus={() => onFocus("toggle")}
				onClick={onToggle}
			>
				<span
					className={styles.swatch}
					role="img"
					aria-label={tagColorName(color)}
					style={{ background: `var(--tag-${color}-solid)` }}
				/>
				<span className={styles.label} title={label}>
					{label}
				</span>
				<span className={styles.count} aria-hidden="true">
					{count}
				</span>
				{/* The button's name says what it does, so the colour and the count
				    come as its description. */}
				<span id={details} className={styles.visuallyHidden}>
					{`${tagColorName(color)}, ${count} ${count === 1 ? "drawing" : "drawings"}`}
				</span>
			</button>
			<button
				type="button"
				className={styles.pencil}
				tabIndex={tabStop === "pencil" ? 0 : -1}
				aria-label={`Change ${label}`}
				title="Rename, recolour or delete"
				onFocus={() => onFocus("pencil")}
				onClick={onEdit}
			>
				<PencilIcon />
			</button>
		</li>
	);
}
