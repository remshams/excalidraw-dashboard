import type { DrawingSummary } from "../../shared/types.ts";

type DrawingListProps = {
	drawings: DrawingSummary[];
	selectedId: string | null;
	onSelect: (id: string) => void;
	onCreate: (name: string) => void;
	onRename: (id: string, name: string) => void;
	onDelete: (id: string) => void;
};

export function DrawingList({
	drawings,
	selectedId,
	onSelect,
	onCreate,
	onRename,
	onDelete,
}: DrawingListProps) {
	const create = () => {
		const name = window.prompt("Name of the new drawing");
		if (name !== null) onCreate(name);
	};

	const rename = (drawing: DrawingSummary) => {
		const name = window.prompt("New name", drawing.name);
		if (name?.trim()) onRename(drawing.id, name);
	};

	const remove = (drawing: DrawingSummary) => {
		if (window.confirm(`Delete "${drawing.name}"?`)) onDelete(drawing.id);
	};

	return (
		<nav className="drawing-list" aria-label="Drawings">
			<button type="button" onClick={create}>
				New drawing
			</button>
			<ul>
				{drawings.map((drawing) => (
					<li key={drawing.id} aria-current={drawing.id === selectedId}>
						<button
							type="button"
							className="name"
							onClick={() => onSelect(drawing.id)}
						>
							{drawing.name}
						</button>
						<button
							type="button"
							aria-label={`Rename ${drawing.name}`}
							onClick={() => rename(drawing)}
						>
							✎
						</button>
						<button
							type="button"
							aria-label={`Delete ${drawing.name}`}
							onClick={() => remove(drawing)}
						>
							🗑
						</button>
					</li>
				))}
			</ul>
		</nav>
	);
}
