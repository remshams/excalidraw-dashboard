import { type FormEvent, useEffect, useRef, useState } from "react";
import type { DrawingSummary } from "../../../../shared/types.ts";
import { TAG_COLORS, type Tag, type TagColor, tagColorVars, useMockTags } from "./mock-tags.ts";
import { Stamp } from "./Stamp.tsx";
import styles from "./TagForm.module.css";

type TagFormProps = {
	/** The tag to change, or none to create one. */
	tag?: Tag;
	initialLabel?: string;
	drawings: DrawingSummary[];
	onDone: (tag: Tag | null) => void;
	onCancel: () => void;
};

const capitalized = (word: string) => word[0].toUpperCase() + word.slice(1);

/** Creates a tag or changes one: label, colour and, for an existing one, delete. */
export function TagForm({
	tag,
	initialLabel = "",
	drawings,
	onDone,
	onCancel,
}: TagFormProps) {
	const { createTag, updateTag, deleteTag, drawingCount } = useMockTags();
	const [label, setLabel] = useState(tag?.label ?? initialLabel);
	const [color, setColor] = useState<TagColor>(tag?.color ?? "blue");
	const [error, setError] = useState<string | null>(null);
	const [confirming, setConfirming] = useState(false);
	const input = useRef<HTMLInputElement>(null);
	const keep = useRef<HTMLButtonElement>(null);

	useEffect(() => input.current?.focus(), []);
	useEffect(() => {
		if (confirming) keep.current?.focus();
	}, [confirming]);

	const submit = (event: FormEvent) => {
		event.preventDefault();
		if (tag) {
			const problem = updateTag(tag.id, label, color);
			if (!problem) return onDone(tag);
			setError(problem);
		} else {
			const result = createTag(label, color);
			if (!("error" in result)) return onDone(result);
			setError(result.error);
		}
		input.current?.focus();
	};

	if (tag && confirming) {
		const count = drawingCount(drawings, tag.id);
		return (
			<div className={styles.form}>
				<h2>Delete this tag?</h2>
				<p className={styles.preview}>
					<Stamp label={tag.label} color={tag.color} seed={tag.id} size="large" />
				</p>
				<p className={styles.note}>
					{count === 0
						? "No drawing has it."
						: `It is removed from ${count} ${count === 1 ? "drawing" : "drawings"}. The drawings stay.`}
				</p>
				<div className={styles.buttons}>
					<button
						type="button"
						className={styles.danger}
						onClick={() => {
							deleteTag(tag.id);
							onDone(null);
						}}
					>
						Delete tag
					</button>
					<button
						ref={keep}
						type="button"
						className={styles.quiet}
						onClick={() => setConfirming(false)}
					>
						Keep it
					</button>
				</div>
			</div>
		);
	}

	return (
		<form className={styles.form} onSubmit={submit} noValidate>
			<h2>{tag ? "Change tag" : "New tag"}</h2>
			<p className={styles.preview} aria-hidden="true">
				<Stamp label={label.trim() || "Label"} color={color} seed={tag?.id ?? "new"} size="large" />
			</p>
			<label className={styles.field}>
				Label
				<input
					ref={input}
					value={label}
					aria-invalid={error !== null}
					aria-describedby={error ? "tag-error" : undefined}
					onChange={(event) => {
						setLabel(event.target.value);
						setError(null);
					}}
				/>
			</label>
			{error ? (
				<p id="tag-error" role="alert" className={styles.error}>
					{error}
				</p>
			) : null}
			<fieldset className={styles.colors}>
				<legend>Colour</legend>
				{TAG_COLORS.map((option) => (
					<label
						key={option}
						className={styles.color}
						title={capitalized(option)}
						style={{ background: tagColorVars(option).solid }}
					>
						<input
							type="radio"
							name="tag-color"
							checked={color === option}
							aria-label={capitalized(option)}
							onChange={() => setColor(option)}
						/>
					</label>
				))}
			</fieldset>
			<div className={styles.buttons}>
				<button type="submit" className={styles.primary}>
					{tag ? "Save tag" : "Create tag"}
				</button>
				<button type="button" className={styles.quiet} onClick={onCancel}>
					Cancel
				</button>
				{tag ? (
					<button
						type="button"
						className={styles.quietDanger}
						onClick={() => setConfirming(true)}
					>
						Delete…
					</button>
				) : null}
			</div>
		</form>
	);
}
