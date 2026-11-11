import { PencilIcon } from "../icons.tsx";
import { NameField } from "../NameField.tsx";
import styles from "./DrawingTitle.module.css";
import { useDrawingTitle } from "./use-drawing-title.ts";

type DrawingTitleProps = {
	name: string;
	/** Renames the drawing; resolves once the rename succeeded or failed. */
	onRename: (name: string) => Promise<void>;
};

/**
 * The open drawing's name in the editor bar. Clicking it opens a name field in
 * its place that renames the drawing.
 */
export function DrawingTitle({ name, onRename }: DrawingTitleProps) {
	const { editing, shownName, title, button, start, save, cancel } =
		useDrawingTitle(name, onRename);

	return (
		<div ref={title} className={styles.title}>
			{editing ? (
				<NameField
					label={`New name for ${shownName}`}
					initialName={shownName}
					className={styles.field}
					onSubmit={save}
					onCancel={cancel}
				/>
			) : (
				// The heading keeps the drawing's name; the button inside says what it does.
				<h1 aria-label={shownName}>
					<button
						ref={button}
						type="button"
						className={styles.rename}
						aria-label={`Rename ${shownName}`}
						onClick={start}
					>
						<span className={styles.name}>{shownName}</span>
						<PencilIcon />
					</button>
				</h1>
			)}
		</div>
	);
}
