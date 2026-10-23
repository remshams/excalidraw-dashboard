import type { ReactNode } from "react";
import { useState } from "react";
import type { DrawingSummary } from "../../shared/types.ts";
import { previewUrl } from "./api.ts";
import { NameField } from "./NameField.tsx";

type DrawingListProps = {
	drawings: DrawingSummary[];
	onOpen: (id: string) => void;
	onCreate: (name: string) => void;
	onRename: (id: string, name: string) => void;
	onDelete: (id: string) => void;
};

type CardTask = "rename" | "delete";

/** The card that asks for a new name or a delete confirmation, if any. */
type OpenTask = { kind: CardTask; id: string } | null;

/** The landing page: every drawing as a sheet with a preview, plus a blank one to start a new drawing. */
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
			<ul>
				<NewDrawingCard onCreate={onCreate} />
				{drawings.map((drawing) => (
					<DrawingCard
						key={drawing.id}
						drawing={drawing}
						task={task?.id === drawing.id ? task.kind : null}
						onOpen={() => onOpen(drawing.id)}
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

/** A blank sheet that asks for a name and creates the drawing. */
function NewDrawingCard({ onCreate }: Pick<DrawingListProps, "onCreate">) {
	const [creating, setCreating] = useState(false);
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
						onSubmit={(name) => {
							setCreating(false);
							onCreate(name);
						}}
						onCancel={() => setCreating(false)}
					/>
				</>
			) : (
				<button
					type="button"
					className="open"
					onClick={() => setCreating(true)}
				>
					{sheet}
					<span className="name">New drawing</span>
				</button>
			)}
		</li>
	);
}

type DrawingCardProps = {
	drawing: DrawingSummary;
	/** The question the card asks below its preview, if any. */
	task: CardTask | null;
	onOpen: () => void;
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
	const sheet = <Sheet drawing={drawing} />;

	return (
		<li>
			{task === "rename" ? (
				<>
					{sheet}
					<NameField
						label={`New name for ${drawing.name}`}
						initialName={drawing.name}
						onSubmit={onRename}
						onCancel={onCancel}
					/>
				</>
			) : task === "delete" ? (
				<>
					{sheet}
					<DeleteConfirmation
						name={drawing.name}
						onConfirm={onDelete}
						onCancel={onCancel}
					/>
				</>
			) : (
				<DrawingEntry
					name={drawing.name}
					sheet={sheet}
					onOpen={onOpen}
					onStart={onStart}
				/>
			)}
		</li>
	);
}

/** The drawing's preview on a sheet of paper; blank until a preview exists. */
function Sheet({ drawing }: { drawing: DrawingSummary }) {
	return (
		<span className="sheet">
			{drawing.hasPreview && <img src={previewUrl(drawing)} alt="" />}
		</span>
	);
}

type DrawingEntryProps = Pick<DrawingCardProps, "onOpen" | "onStart"> & {
	name: string;
	sheet: ReactNode;
};

/** The sheet and name that open the drawing, with its rename and delete actions. */
function DrawingEntry({ name, sheet, onOpen, onStart }: DrawingEntryProps) {
	return (
		<>
			<button type="button" className="open" onClick={onOpen}>
				{sheet}
				<span className="name">{name}</span>
			</button>
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
		</>
	);
}

type DeleteConfirmationProps = {
	name: string;
	onConfirm: () => void;
	onCancel: () => void;
};

function DeleteConfirmation({
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

const iconProps = {
	width: 18,
	height: 18,
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 1.75,
	strokeLinecap: "round",
	strokeLinejoin: "round",
} as const;

function PlusIcon() {
	return (
		<svg aria-hidden="true" {...iconProps}>
			<path d="M12 5v14M5 12h14" />
		</svg>
	);
}

function PencilIcon() {
	return (
		<svg aria-hidden="true" {...iconProps}>
			<path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z" />
			<path d="M14.5 6.5l3 3" />
		</svg>
	);
}

function TrashIcon() {
	return (
		<svg aria-hidden="true" {...iconProps}>
			<path d="M4 7h16M10 11v6M14 11v6" />
			<path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
		</svg>
	);
}
