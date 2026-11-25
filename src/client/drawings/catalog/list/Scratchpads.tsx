import { useId } from "react";
import type { DrawingSummary, ScratchpadSummary } from "#shared/drawings.ts";
import { DrawingLink } from "../../DrawingLink.tsx";
import { CheckIcon, TrashIcon } from "../../icons.tsx";
import { NameField } from "../../NameField.tsx";
import { editedAt, scratchpadName, scratchpadsOf } from "../../scratchpad.ts";
import { DeleteConfirmation } from "../DeleteConfirmation.tsx";
import { PreviewImage } from "../PreviewImage.tsx";
import styles from "./DrawingList.module.css";
import {
	type OpenTaskState,
	type ScratchpadTask,
	scratchpadTaskOf,
} from "./use-open-task.ts";

type ScratchpadsProps = {
	/** Every drawing; the row shows the scratchpads among them. */
	drawings: DrawingSummary[];
	/** The landing page's one question, which the row may ask or close. */
	questions: OpenTaskState;
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
	questions: { task, returnTo, ask, close, closeToButton },
	onOpen,
	onSave,
	onDiscard,
	onDiscardAll,
}: ScratchpadsProps) {
	const heading = useId();
	const scratchpads = scratchpadsOf(drawings);
	const count = scratchpads.length;

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
						onCancel={closeToButton}
					/>
				) : (
					<button
						type="button"
						className={styles.discardAll}
						// biome-ignore lint/a11y/noAutofocus: the focus comes back from the question the user just closed.
						autoFocus={returnTo?.kind === "discard-all"}
						onClick={() => ask({ kind: "discard-all" })}
					>
						Discard all
					</button>
				)}
			</div>
			<ul className={styles.cards} aria-label="Scratchpads">
				{scratchpads.map((scratchpad, index) => (
					<ScratchpadCard
						key={scratchpad.id}
						scratchpad={scratchpad}
						name={scratchpadName(scratchpad, index + 1)}
						task={scratchpadTaskOf(task, scratchpad.id)}
						refocus={scratchpadTaskOf(returnTo, scratchpad.id)}
						onOpen={onOpen}
						onStart={(kind) => ask({ kind, id: scratchpad.id })}
						onSave={(name) => {
							close();
							onSave(scratchpad.id, name);
						}}
						onDiscard={() => {
							close();
							onDiscard(scratchpad.id);
						}}
						onCancel={closeToButton}
					/>
				))}
			</ul>
		</section>
	);
}

type ScratchpadCardProps = {
	scratchpad: ScratchpadSummary;
	/** What the card and its actions are called. */
	name: string;
	task: ScratchpadTask | null;
	/** The question just closed, whose button takes the focus back. */
	refocus: ScratchpadTask | null;
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
	name,
	task,
	refocus,
	onOpen,
	onStart,
	onSave,
	onDiscard,
	onCancel,
}: ScratchpadCardProps) {
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
					// biome-ignore lint/a11y/noAutofocus: the focus comes back from the question the user just closed.
					autoFocus={refocus === "save"}
					onClick={() => onStart("save")}
				>
					<CheckIcon />
				</button>
				<button
					type="button"
					className={styles.icon}
					aria-label={`Discard ${name}`}
					title="Discard"
					// biome-ignore lint/a11y/noAutofocus: the focus comes back from the question the user just closed.
					autoFocus={refocus === "discard"}
					onClick={() => onStart("discard")}
				>
					<TrashIcon />
				</button>
			</span>
		</li>
	);
}
