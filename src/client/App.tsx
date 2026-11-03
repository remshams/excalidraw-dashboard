import { useCallback, useState } from "react";
import { DrawingList } from "./drawings/catalog/DrawingList.tsx";
import { useDrawings } from "./drawings/catalog/use-drawings.ts";
import { Editor } from "./drawings/editor/Editor.tsx";
import { useDrawing } from "./drawings/editor/use-drawing.ts";
import { useOpenDrawingId } from "./drawings/use-open-drawing-id.ts";
import { Sidebar } from "./sidebar/Sidebar.tsx";
import { useColorScheme } from "./use-color-scheme.ts";

export function App() {
	const [error, setError] = useState<string | null>(null);
	// Stable, because useDrawing and useDrawings reload when their onError changes.
	const showError = useCallback((cause: unknown) => {
		setError(cause instanceof Error ? cause.message : String(cause));
	}, []);

	const theme = useColorScheme();
	const [openDrawingId, openDrawing] = useOpenDrawingId();
	const drawing = useDrawing(openDrawingId, showError);
	const { drawings, replace, create, rename, remove, wasDeleted } =
		useDrawings(showError);

	return (
		<div className="layout">
			<Sidebar label="drawings">
				{(hideButton) => (
					<DrawingList
						drawings={drawings}
						selectedId={openDrawingId}
						headerAction={hideButton}
						onSelect={openDrawing}
						onCreate={(name) =>
							create(name).then((created) => openDrawing(created.id), showError)
						}
						onRename={(id, name) => rename(id, name).catch(showError)}
						onDelete={(id) =>
							remove(id).then(() => {
								if (id === openDrawingId) openDrawing(null);
							}, showError)
						}
					/>
				)}
			</Sidebar>
			<main className="editor">
				{drawing ? (
					<Editor
						key={drawing.id}
						drawing={drawing}
						theme={theme}
						onSaved={replace}
						onError={(cause) => {
							// Closing a deleted drawing flushes its last edit, which then fails.
							if (!wasDeleted(drawing.id)) showError(cause);
						}}
					/>
				) : (
					<p className="placeholder">
						{openDrawingId
							? "Opening drawing…"
							: "Open a drawing from the list or start a new one."}
					</p>
				)}
			</main>
			{error && (
				<div className="error" role="alert">
					<p>{error}</p>
					<button type="button" onClick={() => setError(null)}>
						Dismiss
					</button>
				</div>
			)}
		</div>
	);
}
