import { useCallback, useState } from "react";
import { DrawingList } from "./drawings/DrawingList.tsx";
import { Editor } from "./drawings/Editor.tsx";
import { useDrawing } from "./drawings/use-drawing.ts";
import { useDrawings } from "./drawings/use-drawings.ts";
import { useHashId } from "./drawings/use-hash-id.ts";

export function App() {
	const [error, setError] = useState<string | null>(null);
	const showError = useCallback((cause: unknown) => {
		setError(cause instanceof Error ? cause.message : String(cause));
	}, []);

	const [selectedId, select] = useHashId();
	const drawing = useDrawing(selectedId, showError);
	const { drawings, replace, create, rename, remove } = useDrawings(showError);

	return (
		<div className="layout">
			<DrawingList
				drawings={drawings}
				selectedId={selectedId}
				onSelect={select}
				onCreate={(name) =>
					create(name).then((created) => select(created.id), showError)
				}
				onRename={(id, name) => rename(id, name).catch(showError)}
				onDelete={(id) =>
					remove(id).then(() => {
						if (id === selectedId) select(null);
					}, showError)
				}
			/>
			<main className="editor">
				{drawing ? (
					<Editor
						key={drawing.id}
						drawing={drawing}
						onSaved={replace}
						onError={showError}
					/>
				) : (
					<p className="placeholder">
						{selectedId ? "Loading…" : "Select or create a drawing"}
					</p>
				)}
			</main>
			{error && (
				<button type="button" className="error" onClick={() => setError(null)}>
					{error}
				</button>
			)}
		</div>
	);
}
