import { PencilIcon } from "../icons.tsx";
import { NameField } from "../NameField.tsx";
import styles from "./DrawingTitle.module.css";
import { useDrawingTitle } from "./use-drawing-title.ts";

type DrawingTitleProps = {
	/** The drawing's name, or null for a scratchpad. */
	name: string | null;
	/**
	 * Whether a scratchpad offers "Save as drawing". It can't before the server
	 * has stored it.
	 */
	canSave?: boolean;
	/** The class of the bar's buttons, for "Save as drawing". */
	buttonClassName?: string;
	/** Renames the drawing; resolves once the rename succeeded or failed. */
	onRename: (name: string) => Promise<void>;
};

/**
 * The open drawing's name in the editor bar. Clicking it opens a name field in
 * its place that renames the drawing. A scratchpad shows "Scratchpad" and a
 * button that opens the field to name it.
 */
export function DrawingTitle({
	name,
	canSave = false,
	buttonClassName,
	onRename,
}: DrawingTitleProps) {
	const { editing, shownName, refocus, start, save, cancel } = useDrawingTitle(
		name,
		onRename,
	);

	if (editing) {
		return (
			<div className={styles.title}>
				<NameField
					label={
						shownName === null
							? "Name of the drawing"
							: `New name for ${shownName}`
					}
					initialName={shownName ?? ""}
					className={styles.field}
					onSubmit={save}
					onCancel={cancel}
				/>
			</div>
		);
	}

	if (shownName === null) {
		return (
			<>
				<div className={styles.title}>
					<h1 className={styles.scratchpad}>Scratchpad</h1>
				</div>
				{canSave && (
					<button
						type="button"
						className={buttonClassName}
						// biome-ignore lint/a11y/noAutofocus: the focus comes back from the name field the user just closed.
						autoFocus={refocus}
						onClick={start}
					>
						Save as drawing
					</button>
				)}
			</>
		);
	}

	return (
		<div className={styles.title}>
			{/* The heading keeps the drawing's name; the button inside says what it does. */}
			<h1 aria-label={shownName}>
				<button
					type="button"
					className={styles.rename}
					aria-label={`Rename ${shownName}`}
					// biome-ignore lint/a11y/noAutofocus: the focus comes back from the name field the user just closed.
					autoFocus={refocus}
					onClick={start}
				>
					<span className={styles.name}>{shownName}</span>
					<PencilIcon />
				</button>
			</h1>
		</div>
	);
}
