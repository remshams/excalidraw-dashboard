type DeleteConfirmationProps = {
	name: string;
	onConfirm: () => void;
	onCancel: () => void;
};

/** Asks before deleting a drawing. Keep has the focus, and Escape cancels. */
export function DeleteConfirmation({
	name,
	onConfirm,
	onCancel,
}: DeleteConfirmationProps) {
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: Escape is a shortcut; both choices are buttons.
		<div
			className="confirm"
			onKeyDown={(event) => {
				if (event.key === "Escape") onCancel();
			}}
		>
			<p>Delete “{name}”?</p>
			<button type="button" className="danger" onClick={onConfirm}>
				Delete
			</button>
			{/* biome-ignore lint/a11y/noAutofocus: focus the safe choice when the question appears. */}
			<button type="button" autoFocus onClick={onCancel}>
				Keep
			</button>
		</div>
	);
}
