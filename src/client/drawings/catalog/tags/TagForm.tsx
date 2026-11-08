import { useId } from "react";
import {
	TAG_COLORS,
	type Tag,
	type TagColor,
} from "../../../../shared/tags.ts";
import styles from "./TagForm.module.css";
import { TagMark } from "./TagMark.tsx";
import { tagColorName } from "./tag-color-name.ts";
import { type TagFormProps, useTagForm } from "./use-tag-form.ts";

/**
 * Creates a tag or changes one: its label, its colour and, for an existing one,
 * deleting it after asking. Escape only leaves the question; the host decides what
 * Escape does to the form itself.
 */
export function TagForm(props: TagFormProps) {
	const { tag, drawingCount, onCancel } = props;
	const {
		label,
		setLabel,
		color,
		setColor,
		error,
		input,
		confirming,
		setConfirming,
		submit,
		deleteTag,
	} = useTagForm(props);
	const errorId = useId();

	if (tag && confirming) {
		return (
			<DeleteQuestion
				tag={tag}
				drawingCount={drawingCount}
				error={error}
				onDelete={() => deleteTag(tag)}
				onKeep={() => setConfirming(false)}
			/>
		);
	}

	return (
		<form className={styles.form} onSubmit={submit}>
			<h2>{tag ? "Change tag" : "New tag"}</h2>
			<p className={styles.preview} aria-hidden="true">
				<TagMark
					label={label.trim() || "Label"}
					color={color}
					seed={tag?.id ?? "new"}
				/>
			</p>
			<label className={styles.field}>
				Label
				<input
					ref={input}
					value={label}
					// biome-ignore lint/a11y/noAutofocus: the form opens in response to the user's action.
					autoFocus
					aria-invalid={error !== null}
					aria-describedby={error ? errorId : undefined}
					onChange={(event) => setLabel(event.target.value)}
				/>
			</label>
			{error && (
				<p id={errorId} role="alert" className={styles.error}>
					{error}
				</p>
			)}
			<ColorChoice color={color} onChange={setColor} />
			<div className={styles.buttons}>
				<button type="submit" className={styles.primary}>
					{tag ? "Save tag" : "Create tag"}
				</button>
				<button type="button" onClick={onCancel}>
					Cancel
				</button>
				{tag && (
					<button
						type="button"
						className={styles.quietDanger}
						onClick={() => setConfirming(true)}
					>
						Delete…
					</button>
				)}
			</div>
		</form>
	);
}

function ColorChoice({
	color,
	onChange,
}: {
	color: TagColor;
	onChange: (color: TagColor) => void;
}) {
	return (
		<fieldset className={styles.colors}>
			<legend>Colour</legend>
			{TAG_COLORS.map((option) => (
				<label
					key={option}
					className={styles.color}
					title={tagColorName(option)}
					style={{ background: `var(--tag-${option}-solid)` }}
				>
					<input
						type="radio"
						name="tag-color"
						checked={color === option}
						aria-label={tagColorName(option)}
						onChange={() => onChange(option)}
					/>
				</label>
			))}
		</fieldset>
	);
}

type DeleteQuestionProps = {
	tag: Tag;
	drawingCount: number;
	/** Why the last attempt failed, or null. */
	error: string | null;
	onDelete: () => void;
	onKeep: () => void;
};

/** Asks before deleting a tag. Keep it has the focus, and Escape answers it. */
function DeleteQuestion({
	tag,
	drawingCount,
	error,
	onDelete,
	onKeep,
}: DeleteQuestionProps) {
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: Escape is a shortcut; both choices are buttons.
		<div
			className={styles.form}
			// A press on its blank parts stays inside, where Escape answers the question.
			tabIndex={-1}
			onKeyDown={(event) => {
				if (event.key !== "Escape") return;
				// Only back to the form; the host's Escape would leave it.
				event.preventDefault();
				event.stopPropagation();
				onKeep();
			}}
		>
			<h2>Delete this tag?</h2>
			<p className={styles.preview}>
				<TagMark label={tag.label} color={tag.color} seed={tag.id} />
			</p>
			<p className={styles.note}>{deleteNote(drawingCount)}</p>
			{error && (
				<p role="alert" className={styles.error}>
					{error}
				</p>
			)}
			<div className={styles.buttons}>
				<button type="button" className={styles.danger} onClick={onDelete}>
					Delete tag
				</button>
				{/* biome-ignore lint/a11y/noAutofocus: focus the safe choice when the question appears. */}
				<button type="button" autoFocus onClick={onKeep}>
					Keep it
				</button>
			</div>
		</div>
	);
}

function deleteNote(count: number) {
	if (count === 0) return "No drawing has it.";
	const drawings = count === 1 ? "1 drawing" : `${count} drawings`;
	return `It is removed from ${drawings}. The drawings stay.`;
}
