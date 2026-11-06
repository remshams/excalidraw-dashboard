import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import type { DrawingSummary } from "../../../../shared/types.ts";
import { PlusIcon } from "../icons.tsx";
import { RemovableStamp } from "./ActiveFilter.tsx";
import { moveInGrid } from "./grid-keys.ts";
import { findTags, type Tag, useMockTags } from "./mock-tags.ts";
import { Stamp } from "./Stamp.tsx";
import styles from "./DrawingTagsDialog.module.css";
import { TagForm } from "./TagForm.tsx";

type DrawingTagsDialogProps = {
	drawing: DrawingSummary;
	drawings: DrawingSummary[];
	onClose: () => void;
};

/**
 * One drawing's tags, in a modal dialog. Two piles of stamps: the ones on the
 * drawing, and the ones to add. A click moves a stamp from one to the other.
 */
export function DrawingTagsDialog({ drawing, drawings, onClose }: DrawingTagsDialogProps) {
	const { tags, tagsOf, toggleDrawingTag } = useMockTags();
	const [find, setFind] = useState("");
	const [creating, setCreating] = useState<string | null>(null);
	const dialog = useRef<HTMLDialogElement>(null);
	const search = useRef<HTMLInputElement>(null);
	const grid = useRef<HTMLDivElement>(null);
	const current = tagsOf(drawing);

	useEffect(() => {
		if (!dialog.current?.open) dialog.current?.showModal();
	}, []);

	useEffect(() => {
		if (creating === null) search.current?.focus();
	}, [creating]);

	const needle = find.trim().toLocaleLowerCase();
	const available = findTags(
		tags.filter((tag) => !current.some(({ id }) => id === tag.id)),
		find,
	);

	const add = (tag: Tag, button?: HTMLButtonElement) => {
		// The button goes up to the other pile, so focus takes the next one.
		const next = button?.nextElementSibling ?? button?.previousElementSibling;
		(next instanceof HTMLElement ? next : search.current)?.focus();
		toggleDrawingTag(drawing, tag.id);
	};

	const onFindKey = (event: KeyboardEvent) => {
		if (event.key === "Escape" && find) {
			event.preventDefault();
			event.stopPropagation();
			setFind("");
		} else if (event.key === "ArrowDown") {
			event.preventDefault();
			grid.current?.querySelector<HTMLElement>("button")?.focus();
		} else if (event.key === "Enter") {
			event.preventDefault();
			if (available.length > 0 && needle) {
				add(available[0]);
				setFind("");
			} else if (needle && available.length === 0) {
				setCreating(find.trim());
			} else if (!needle) {
				dialog.current?.close();
			}
		}
	};

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: Escape closes a modal dialog natively; this adds the click on the backdrop.
		<dialog
			ref={dialog}
			className={styles.dialog}
			aria-labelledby="drawing-tags-title"
			onClose={onClose}
			onClick={(event) => {
				if (event.target === dialog.current) dialog.current?.close();
			}}
			onKeyDown={(event) => {
				if (event.key === "Escape" && creating !== null) {
					event.preventDefault();
					setCreating(null);
				}
			}}
		>
			<h2 id="drawing-tags-title">Tags on {drawing.name}</h2>
			<div className={styles.current}>
				{current.length === 0 ? (
					<span className={styles.empty}>No tags yet. Pick one below.</span>
				) : (
					current.map((tag) => (
						<RemovableStamp
							key={tag.id}
							tag={tag}
							seed={drawing.id + tag.id}
							removeLabel={`Remove ${tag.label} from ${drawing.name}`}
							onRemove={(button) => {
								const next = button.nextElementSibling ?? button.previousElementSibling;
								(next instanceof HTMLElement ? next : search.current)?.focus();
								toggleDrawingTag(drawing, tag.id);
							}}
						/>
					))
				)}
			</div>
			{creating !== null ? (
				<TagForm
					initialLabel={creating}
					drawings={drawings}
					onCancel={() => setCreating(null)}
					onDone={(done) => {
						if (done) toggleDrawingTag(drawing, done.id);
						setFind("");
						setCreating(null);
					}}
				/>
			) : (
				<>
					<input
						ref={search}
						type="search"
						className={styles.find}
						aria-label="Find a tag to add"
						placeholder="Add a tag: type, then Enter"
						value={find}
						onChange={(event) => setFind(event.target.value)}
						onKeyDown={onFindKey}
					/>
					{/* biome-ignore lint/a11y/noStaticElementInteractions: arrow keys move through the grid of buttons. */}
					<div
						ref={grid}
						role="group"
						aria-label="Tags to add"
						className={styles.available}
						onKeyDown={(event) => {
							const moved = moveInGrid(event, grid.current, "button");
							if (!moved && event.key === "ArrowUp") search.current?.focus();
						}}
					>
						{available.map((tag, index) => (
							<button
								key={tag.id}
								type="button"
								className={`${styles.well} ${needle && index === 0 ? styles.next : ""}`}
								aria-label={`Add ${tag.label}`}
								onClick={(event) => add(tag, event.currentTarget)}
							>
								<Stamp label={tag.label} color={tag.color} seed={`add${tag.id}`} block />
							</button>
						))}
					</div>
					{available.length === 0 && needle ? (
						<p className={styles.none}>No tag to add is called “{find.trim()}”.</p>
					) : null}
					<div className={styles.foot}>
						<button
							type="button"
							className={styles.create}
							onClick={() => setCreating(find.trim())}
						>
							<PlusIcon />
							{available.length === 0 && needle ? `Create “${find.trim()}”` : "New tag"}
						</button>
						<button
							type="button"
							className={styles.done}
							onClick={() => dialog.current?.close()}
						>
							Done
						</button>
					</div>
				</>
			)}
		</dialog>
	);
}
