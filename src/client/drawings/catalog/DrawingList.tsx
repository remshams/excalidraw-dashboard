import { useState } from "react";
import type { DrawingSummary } from "../../../shared/types.ts";
import { previewUrl } from "../api.ts";
import { DrawingLink } from "../DrawingLink.tsx";
import { DeleteConfirmation } from "./DeleteConfirmation.tsx";
import { PencilIcon, PlusIcon, TrashIcon } from "./icons.tsx";
import { NameField } from "./NameField.tsx";

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

/** The landing page: every drawing as a sheet with its preview, after a blank sheet that starts a new one. */
export function DrawingList({
	drawings,
	onOpen,
	onCreate,
	onRename,
	onDelete,
}: DrawingListProps) {
	const [task, setTask] = useState<OpenTask>(null);
	const close = () => setTask(null);

	return (
		<div className="drawing-list">
			<h1>Drawings</h1>
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
				{drawings.map((drawing) => (
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
		<span className="sheet blank">
			<PlusIcon />
		</span>
	);

	return (
		<li className="new">
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
				<button type="button" className="open" onClick={onStart}>
					{sheet}
					<span className="name">New drawing</span>
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
			<DrawingLink drawingId={id} onOpen={onOpen} className="open">
				<Sheet drawing={drawing} />
				<span className="name">{name}</span>
			</DrawingLink>
			<span className="actions">
				<button
					type="button"
					className="icon"
					aria-label={`Rename ${name}`}
					onClick={() => onStart("rename")}
				>
					<PencilIcon />
				</button>
				<button
					type="button"
					className="icon"
					aria-label={`Delete ${name}`}
					onClick={() => onStart("delete")}
				>
					<TrashIcon />
				</button>
			</span>
		</li>
	);
}

/**
 * The drawing's preview on a sheet of paper. The sheet stays blank while the
 * drawing has no preview, and when the preview fails to load.
 */
function Sheet({ drawing }: { drawing: DrawingSummary }) {
	const url = previewUrl(drawing);
	const [failedUrl, setFailedUrl] = useState<string | null>(null);

	return (
		<span className="sheet">
			{url && url !== failedUrl && (
				<img
					src={url}
					alt=""
					loading="lazy"
					onError={() => setFailedUrl(url)}
				/>
			)}
		</span>
	);
}
