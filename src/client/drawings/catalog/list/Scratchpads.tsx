import { useId } from "react";
import type { DrawingSummary } from "#shared/drawings.ts";
import { DrawingLink } from "../../DrawingLink.tsx";
import { CheckIcon, TrashIcon } from "../../icons.tsx";
import { NameField } from "../../NameField.tsx";
import { editedAt, scratchpadName, scratchpadsOf } from "../../scratchpad.ts";
import { DeleteConfirmation } from "../DeleteConfirmation.tsx";
import { PreviewImage } from "../PreviewImage.tsx";
import styles from "./DrawingList.module.css";
import {
	type OpenTask,
	type ScratchpadTask,
	scratchpadTaskOf,
} from "./open-task.ts";

type ScratchpadsProps = {
	/** Every drawing; the row shows the scratchpads among them. */
	drawings: DrawingSummary[];
	/** The landing page's one question, which the row may ask or change. */
	task: OpenTask;
	onTask: (task: OpenTask) => void;
	onOpen: (id: string | null) => void;
	/** Names the scratchpad, which makes it a drawing. */
	onSave: (id: string, name: string) => void;
	onDiscard: (id: string) => void;
	/** Deletes every scratchpad with the given IDs. */
	onDiscardAll: (ids: string[]) => void;
};

/**
 * The scratchpads above the drawings, most recently edited first: drawings
 * nobody has named yet, each with actions to save it under a name or discard
 * it, and one to discard them all. Without scratchpads, it shows nothing.
 */
export function Scratchpads({
	drawings,
	task,
	onTask,
	onOpen,
	onSave,
	onDiscard,
	onDiscardAll,
}: ScratchpadsProps) {
	const heading = useId();
	const scratchpads = scratchpadsOf(drawings);
	const count = scratchpads.length;
	const close = () => onTask(null);

	if (count === 0) return null;

	return (
		<section className={styles.scratchpads} aria-labelledby={heading}>
			<div className={styles.sectionHeader}>
				<h2 id={heading}>Scratchpads</h2>
				{task?.kind === "discard-all" ? (
					<DeleteConfirmation
						question={
							count === 1
								? "Discard the scratchpad?"
								: `Discard all ${count} scratchpads?`
						}
						action="Discard all"
						inline
						onConfirm={() => {
							close();
							onDiscardAll(scratchpads.map(({ id }) => id));
						}}
						onCancel={close}
					/>
				) : (
					<button
						type="button"
						className={styles.discardAll}
						onClick={() => onTask({ kind: "discard-all" })}
					>
						Discard all
					</button>
				)}
			</div>
			<ul className={styles.cards} aria-label="Scratchpads">
				{scratchpads.map((scratchpad) => (
					<ScratchpadCard
						key={scratchpad.id}
						scratchpad={scratchpad}
						task={scratchpadTaskOf(task, scratchpad.id)}
						onOpen={onOpen}
						onStart={(kind) => onTask({ kind, id: scratchpad.id })}
						onSave={(name) => {
							close();
							onSave(scratchpad.id, name);
						}}
						onDiscard={() => {
							close();
							onDiscard(scratchpad.id);
						}}
						onCancel={close}
					/>
				))}
			</ul>
		</section>
	);
}

type ScratchpadCardProps = {
	scratchpad: DrawingSummary;
	task: ScratchpadTask | null;
	onOpen: (id: string | null) => void;
	onStart: (task: ScratchpadTask) => void;
	onSave: (name: string) => void;
	onDiscard: () => void;
	onCancel: () => void;
};

/**
 * A scratchpad's card: its sheet and when it was last edited, as a link that
 * opens it, and its actions. While it saves or discards, the question replaces
 * the link.
 */
function ScratchpadCard({
	scratchpad,
	task,
	onOpen,
	onStart,
	onSave,
	onDiscard,
	onCancel,
}: ScratchpadCardProps) {
	const name = scratchpadName(scratchpad);
	const sheet = (
		<span className={styles.sheet}>
			<PreviewImage drawing={scratchpad} />
		</span>
	);

	if (task === "save") {
		return (
			<li>
				{sheet}
				<NameField
					label="Name of the drawing"
					onSubmit={onSave}
					onCancel={onCancel}
				/>
			</li>
		);
	}

	if (task === "discard") {
		return (
			<li>
				{sheet}
				<DeleteConfirmation
					question="Discard this scratchpad?"
					action="Discard"
					onConfirm={onDiscard}
					onCancel={onCancel}
				/>
			</li>
		);
	}

	return (
		<li>
			<DrawingLink
				drawingId={scratchpad.id}
				onOpen={onOpen}
				className={styles.open}
				aria-label={name}
			>
				{sheet}
				<span className={styles.name}>{editedAt(scratchpad)}</span>
			</DrawingLink>
			<span className={styles.actions}>
				<button
					type="button"
					className={styles.icon}
					aria-label={`Save ${name} as drawing`}
					title="Save as drawing"
					onClick={() => onStart("save")}
				>
					<CheckIcon />
				</button>
				<button
					type="button"
					className={styles.icon}
					aria-label={`Discard ${name}`}
					title="Discard"
					onClick={() => onStart("discard")}
				>
					<TrashIcon />
				</button>
			</span>
		</li>
	);
}
