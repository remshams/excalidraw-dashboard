import type { Tag } from "#shared/tags.ts";
import frame from "../../dialog/CentredDialog.module.css";
import { SearchLine } from "../../dialog/SearchLine.tsx";
import { closeOnBackdropPress } from "../../dialog/use-modal-dialog.ts";
import { CrossIcon } from "../../../icons.tsx";
import { TagForm } from "../form/TagForm.tsx";
import { NewTagButton } from "../NewTagButton.tsx";
import { TagMark } from "../TagMark.tsx";
import styles from "./DrawingTagsDialog.module.css";
import { type DrawingTagsProps, useDrawingTags } from "./use-drawing-tags.ts";

type DrawingTagsDialogProps = DrawingTagsProps & {
	onClose: () => void;
};

/**
 * A modal dialog that changes one drawing's tags. The tags it has stand on top; a
 * click takes one off, and a click on a tag below the find field adds it. Each
 * change is saved at once. A tag that doesn't exist yet is created in place.
 */
export function DrawingTagsDialog(props: DrawingTagsDialogProps) {
	const { drawing, tags, onClose } = props;
	const state = useDrawingTags(props);
	const { creating, current, available, searched, alreadyHas } = state;

	return (
		<dialog
			ref={state.dialog}
			className={`${frame.dialog} ${styles.dialog}`}
			aria-label={`Tags of ${drawing.name}`}
			onKeyDown={(event) => {
				if (event.key !== "Escape") return;
				// Also keeps the browser from closing the dialog on its own.
				event.preventDefault();
				state.goBack(onClose);
			}}
			// The Android back gesture.
			onCancel={onClose}
			onMouseDown={closeOnBackdropPress(onClose)}
		>
			{/* Focusable, so a press on its blank parts keeps Escape going through the
			    handler above rather than the browser closing the dialog. */}
			<div className={styles.page} tabIndex={-1}>
				{creating !== null ? (
					<TagForm
						initialLabel={creating}
						tags={tags ?? []}
						drawingCount={0}
						onSave={state.create}
						// Only a tag that exists can be deleted, and a new one can't be gone.
						onDelete={() => Promise.resolve()}
						onGone={state.backToList}
						onCancel={state.backToList}
					/>
				) : (
					<>
						<h2 className={styles.title}>Tags of {drawing.name}</h2>
						<fieldset aria-label="Tags it has" className={styles.current}>
							{current.length === 0 ? (
								<p className={styles.empty}>No tags yet.</p>
							) : (
								current.map((tag) => (
									<TagButton
										key={tag.id}
										tag={tag}
										seed={drawing.id + tag.id}
										action="Remove"
										onClick={(button) => state.toggle(tag, button)}
									/>
								))
							)}
						</fieldset>
						<SearchLine
							ref={state.findField}
							lineClassName={styles.find}
							type="search"
							aria-label="Find a tag to add"
							placeholder="Add a tag…"
							value={state.find}
							onChange={(event) => state.setFind(event.target.value)}
							onKeyDown={state.onFindKey}
						/>
						<fieldset
							ref={state.toAdd}
							aria-label="Tags to add"
							className={styles.available}
							onKeyDown={state.onAddKey}
						>
							{available.map((tag, index) => (
								<TagButton
									key={tag.id}
									tag={tag}
									seed={`add${tag.id}`}
									action="Add"
									// One stop in the tab order; the arrow keys reach the others.
									tabStop={index === 0}
									next={index === 0 && searched !== ""}
									onClick={(button) => state.toggle(tag, button)}
								/>
							))}
						</fieldset>
						{state.error && (
							<p role="alert" className={styles.error}>
								{state.error}
							</p>
						)}
					</>
				)}
				{/* Always rendered, so screen readers announce the message when it
				    appears. */}
				<p role="status" className={styles.status}>
					{creating === null &&
						(state.notice ??
							availableMessage(tags, current, available, searched, alreadyHas))}
				</p>
				{creating === null && (
					<div className={styles.footer}>
						{tags && (
							<NewTagButton
								label={available.length === 0 && !alreadyHas ? searched : ""}
								onClick={state.startNew}
							/>
						)}
						<button type="button" className={styles.done} onClick={onClose}>
							Done
						</button>
					</div>
				)}
			</div>
		</dialog>
	);
}

/** What the dialog says when it has no tag to add, or null when it has some. */
function availableMessage(
	tags: Tag[] | null,
	current: Tag[],
	available: Tag[],
	searched: string,
	alreadyHas: boolean,
) {
	if (tags === null) return "The tags aren't loaded.";
	if (available.length > 0) return null;
	if (alreadyHas) return `It has “${searched}” already.`;
	if (searched) return `No tag to add is called “${searched}”.`;
	return current.length > 0 ? "It has every tag." : "There are no tags yet.";
}

type TagButtonProps = {
	tag: Tag;
	seed: string;
	action: "Add" | "Remove";
	tabStop?: boolean;
	/** The tag Enter in the find field adds. */
	next?: boolean;
	onClick: (button: HTMLButtonElement) => void;
};

function TagButton({
	tag,
	seed,
	action,
	tabStop = true,
	next = false,
	onClick,
}: TagButtonProps) {
	return (
		<button
			type="button"
			className={`${styles.tag} ${next ? styles.next : ""}`}
			aria-label={`${action} ${tag.label}`}
			tabIndex={tabStop ? 0 : -1}
			onClick={(event) => onClick(event.currentTarget)}
		>
			<TagMark label={tag.label} color={tag.color} seed={seed} />
			{action === "Remove" && <CrossIcon />}
		</button>
	);
}
