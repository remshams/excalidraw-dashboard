import { useLayoutEffect, useRef } from "react";
import type { DrawingSummary } from "../../../../shared/types.ts";
import { useMockTags } from "./mock-tags.ts";
import { RemovableStamp } from "./StampFilter.tsx";
import styles from "./StampEditor.module.css";
import { StampPicker } from "./StampPicker.tsx";

type StampEditorProps = {
	drawing: DrawingSummary;
	drawings: DrawingSummary[];
	onClose: () => void;
};

/** One drawing's stamps, in a modal dialog over the page. */
export function StampEditor({ drawing, drawings, onClose }: StampEditorProps) {
	const { tagsOf, toggleDrawingTag } = useMockTags();
	const dialog = useRef<HTMLDialogElement>(null);
	const current = tagsOf(drawing);

	// Before the picker's effect, which puts the focus on its search field.
	useLayoutEffect(() => {
		dialog.current?.showModal();
	}, []);

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: Escape closes a modal dialog natively; this adds the click on the backdrop.
		<dialog
			ref={dialog}
			className={styles.dialog}
			aria-labelledby="stamp-editor-title"
			onClose={onClose}
			onClick={(event) => {
				if (event.target === dialog.current) dialog.current?.close();
			}}
		>
			<div className={styles.body}>
				<h2 id="stamp-editor-title">Stamps on {drawing.name}</h2>
				<div className={styles.current}>
					{current.length === 0 ? (
						<span className={styles.empty}>
							No stamps yet. Check one below.
						</span>
					) : (
						current.map((tag) => (
							<RemovableStamp
								key={tag.id}
								tag={tag}
								seed={drawing.id + tag.id}
								removeLabel={`Lift ${tag.label} off ${drawing.name}`}
								onRemove={() => toggleDrawingTag(drawing, tag.id)}
							/>
						))
					)}
				</div>
				<StampPicker
					drawings={drawings}
					isChecked={(tag) => current.some(({ id }) => id === tag.id)}
					onToggle={(tag) => toggleDrawingTag(drawing, tag.id)}
					onCreated={(tag) => toggleDrawingTag(drawing, tag.id)}
					footer={
						<button
							type="button"
							className={styles.done}
							onClick={() => dialog.current?.close()}
						>
							Done
						</button>
					}
				/>
			</div>
		</dialog>
	);
}
