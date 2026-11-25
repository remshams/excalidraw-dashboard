import styles from "./DeleteConfirmation.module.css";

type DeleteConfirmationProps = {
	/** What it asks, such as "Delete “Plan”?". */
	question: string;
	/** The label of the button that deletes, such as "Delete" or "Discard". */
	action: string;
	/** Keeps the question and its buttons on one line, as in a bar. */
	inline?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
};

/** Asks before deleting. Keep has the focus, and Escape cancels. */
export function DeleteConfirmation({
	question,
	action,
	inline = false,
	onConfirm,
	onCancel,
}: DeleteConfirmationProps) {
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: Escape is a shortcut; both choices are buttons.
		<div
			className={inline ? `${styles.confirm} ${styles.inline}` : styles.confirm}
			onKeyDown={(event) => {
				if (event.key === "Escape") onCancel();
			}}
		>
			<p>{question}</p>
			<button type="button" className={styles.danger} onClick={onConfirm}>
				{action}
			</button>
			{/* biome-ignore lint/a11y/noAutofocus: focus the safe choice when the question appears. */}
			<button type="button" autoFocus onClick={onCancel}>
				Keep
			</button>
		</div>
	);
}
