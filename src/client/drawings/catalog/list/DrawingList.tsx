import { useState } from "react";
import type { DrawingSummary } from "../../../../shared/drawings.ts";
import { DrawingLink } from "../../DrawingLink.tsx";
import { searchByName } from "../../search.ts";
import { DeleteConfirmation } from "../DeleteConfirmation.tsx";
import { PencilIcon, PlusIcon, TrashIcon } from "../icons.tsx";
import { NameField } from "../NameField.tsx";
import { PreviewImage } from "../PreviewImage.tsx";
import styles from "./DrawingList.module.css";

type DrawingListProps = {
	drawings: DrawingSummary[];
	onOpen: (id: string | null) => void;
	onCreate: (name: string) => void;
	onRename: (id: string, name: string) => void;
	onDelete: (id: string) => void;
};

type CardTask = "rename" | "delete";

/**
 * The one card that asks something, if any: the blank sheet for a new name, or
 * a drawing's card for a new name or a delete confirmation.
 */
type OpenTask = { kind: "create" } | { kind: CardTask; id: string } | null;

/**
 * The landing page: every drawing that matches the search as a sheet with its
 * preview, after a blank sheet that starts a new one.
 */
export function DrawingList({
	drawings,
	onOpen,
	onCreate,
	onRename,
	onDelete,
}: DrawingListProps) {
	const [task, setTask] = useState<OpenTask>(null);
	const [query, setQuery] = useState("");
	const close = () => setTask(null);
	const shown = searchByName(drawings, query);
	const searched = query.trim();

	return (
		<div className={styles.list}>
			<header className={styles.header}>
				<h1>Drawings</h1>
				<input
					type="search"
					className={styles.search}
					aria-label="Search drawings"
					placeholder="Search…"
					value={query}
					onChange={(event) => {
						setQuery(event.target.value);
						// A question on a card the search hides would come back with it.
						close();
					}}
				/>
			</header>
			<ul aria-label="Drawings">
				<NewDrawingCard
					creating={task?.kind === "create"}
					onStart={() => setTask({ kind: "create" })}
					onCreate={(name) => {
						close();
						onCreate(name);
					}}
					onCancel={close}
				/>
				{shown.map((drawing) => (
					<DrawingCard
						key={drawing.id}
						drawing={drawing}
						task={
							task && task.kind !== "create" && task.id === drawing.id
								? task.kind
								: null
						}
						onOpen={onOpen}
						onStart={(kind) => setTask({ kind, id: drawing.id })}
						onRename={(name) => {
							close();
							onRename(drawing.id, name);
						}}
						onDelete={() => {
							close();
							onDelete(drawing.id);
						}}
						onCancel={close}
					/>
				))}
			</ul>
			{/* Always rendered, so screen readers announce the message when it
			    appears. */}
			<p role="status" className={styles.status}>
				{searched && shown.length === 0
					? `No drawing is named “${searched}”.`
					: null}
			</p>
		</div>
	);
}

type NewDrawingCardProps = {
	/** Whether the card asks for the new drawing's name. */
	creating: boolean;
	onStart: () => void;
	onCreate: (name: string) => void;
	onCancel: () => void;
};

/** A blank sheet that asks for a name and creates the drawing. */
function NewDrawingCard({
	creating,
	onStart,
	onCreate,
	onCancel,
}: NewDrawingCardProps) {
	const sheet = (
		<span className={`${styles.sheet} ${styles.blank}`}>
			<PlusIcon />
		</span>
	);

	return (
		<li>
			{creating ? (
				<>
					{sheet}
					<NameField
						label="Name of the new drawing"
						onSubmit={onCreate}
						onCancel={onCancel}
					/>
				</>
			) : (
				<button type="button" className={styles.open} onClick={onStart}>
					{sheet}
					<span className={styles.name}>New drawing</span>
				</button>
			)}
		</li>
	);
}

type DrawingCardProps = {
	drawing: DrawingSummary;
	/** The question the card asks below its sheet, if any. */
	task: CardTask | null;
	onOpen: (id: string | null) => void;
	onStart: (task: CardTask) => void;
	onRename: (name: string) => void;
	onDelete: () => void;
	onCancel: () => void;
};

function DrawingCard({
	drawing,
	task,
	onOpen,
	onStart,
	onRename,
	onDelete,
	onCancel,
}: DrawingCardProps) {
	const { id, name } = drawing;

	if (task === "rename" || task === "delete") {
		return (
			<li>
				<Sheet drawing={drawing} />
				{task === "rename" ? (
					<NameField
						label={`New name for ${name}`}
						initialName={name}
						onSubmit={onRename}
						onCancel={onCancel}
					/>
				) : (
					<DeleteConfirmation
						name={name}
						onConfirm={onDelete}
						onCancel={onCancel}
					/>
				)}
			</li>
		);
	}

	return (
		<li>
			<DrawingLink drawingId={id} onOpen={onOpen} className={styles.open}>
				<Sheet drawing={drawing} />
				<span className={styles.name}>{name}</span>
			</DrawingLink>
			<span className={styles.actions}>
				<button
					type="button"
					className={styles.icon}
					aria-label={`Rename ${name}`}
					onClick={() => onStart("rename")}
				>
					<PencilIcon />
				</button>
				<button
					type="button"
					className={styles.icon}
					aria-label={`Delete ${name}`}
					onClick={() => onStart("delete")}
				>
					<TrashIcon />
				</button>
			</span>
		</li>
	);
}

/** The drawing's preview on a sheet of paper, or a blank sheet without one. */
function Sheet({ drawing }: { drawing: DrawingSummary }) {
	return (
		<span className={styles.sheet}>
			<PreviewImage drawing={drawing} />
		</span>
	);
}
