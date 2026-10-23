import type { ReactNode } from "react";
import { useState } from "react";
import type { DrawingSummary } from "../../shared/types.ts";
import { NameField } from "./NameField.tsx";

type DrawingListProps = {
	drawings: DrawingSummary[];
	selectedId: string | null;
	onSelect: (id: string) => void;
	onCreate: (name: string) => void;
	onRename: (id: string, name: string) => void;
	onDelete: (id: string) => void;
	/** Shown at the end of the header, e.g. a button that hides the list. */
	headerAction?: ReactNode;
};

type RowTask = "rename" | "delete";

/** The row that asks for a new name or a delete confirmation, if any. */
type OpenTask = { kind: RowTask; id: string } | null;

export function DrawingList({
	drawings,
	selectedId,
	onSelect,
	onCreate,
	onRename,
	onDelete,
	headerAction,
}: DrawingListProps) {
	const [task, setTask] = useState<OpenTask>(null);
	const close = () => setTask(null);

	return (
		<nav className="drawing-list" aria-label="Drawings">
			<ListHeader onCreate={onCreate} action={headerAction} />
			<ul>
				{drawings.map((drawing) => (
					<DrawingRow
						key={drawing.id}
						drawing={drawing}
						selected={drawing.id === selectedId}
						task={task?.id === drawing.id ? task.kind : null}
						onSelect={() => onSelect(drawing.id)}
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
		</nav>
	);
}

/** The list's heading, with the button and field that create a drawing. */
type ListHeaderProps = Pick<DrawingListProps, "onCreate"> & {
	action: ReactNode;
};

function ListHeader({ onCreate, action }: ListHeaderProps) {
	const [creating, setCreating] = useState(false);

	return (
		<>
			<header>
				<h1>Drawings</h1>
				<button type="button" className="new" onClick={() => setCreating(true)}>
					<PlusIcon />
					New drawing
				</button>
				{action}
			</header>
			{creating && (
				<NameField
					label="Name of the new drawing"
					onSubmit={(name) => {
						setCreating(false);
						onCreate(name);
					}}
					onCancel={() => setCreating(false)}
				/>
			)}
		</>
	);
}

type DrawingRowProps = {
	drawing: DrawingSummary;
	selected: boolean;
	/** The question the row asks instead of showing the drawing, if any. */
	task: RowTask | null;
	onSelect: () => void;
	onStart: (task: RowTask) => void;
	onRename: (name: string) => void;
	onDelete: () => void;
	onCancel: () => void;
};

function DrawingRow({
	drawing,
	selected,
	task,
	onSelect,
	onStart,
	onRename,
	onDelete,
	onCancel,
}: DrawingRowProps) {
	return (
		<li aria-current={selected}>
			{task === "rename" ? (
				<NameField
					label={`New name for ${drawing.name}`}
					initialName={drawing.name}
					onSubmit={onRename}
					onCancel={onCancel}
				/>
			) : task === "delete" ? (
				<DeleteConfirmation
					name={drawing.name}
					onConfirm={onDelete}
					onCancel={onCancel}
				/>
			) : (
				<DrawingEntry
					name={drawing.name}
					onSelect={onSelect}
					onStart={onStart}
				/>
			)}
		</li>
	);
}

type DrawingEntryProps = Pick<DrawingRowProps, "onSelect" | "onStart"> & {
	name: string;
};

/** A drawing's name, with its rename and delete actions. */
function DrawingEntry({ name, onSelect, onStart }: DrawingEntryProps) {
	return (
		<>
			<button type="button" className="name" onClick={onSelect}>
				<span>{name}</span>
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
