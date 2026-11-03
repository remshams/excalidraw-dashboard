import { useCallback, useState } from "react";
import type { Drawing, DrawingSummary } from "../shared/types.ts";
import { DrawingList } from "./drawings/catalog/DrawingList.tsx";
import { BackIcon } from "./drawings/catalog/icons.tsx";
import { useDrawings } from "./drawings/catalog/use-drawings.ts";
import { DrawingLink } from "./drawings/DrawingLink.tsx";
import { Editor } from "./drawings/editor/Editor.tsx";
import { useDrawing } from "./drawings/editor/use-drawing.ts";
import { useOpenDrawingId } from "./drawings/use-open-drawing-id.ts";
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
		<>
			{openDrawingId ? (
				<EditorView
					drawing={drawing}
					theme={theme}
					onOpen={openDrawing}
					onSaved={replace}
					onError={(id, cause) => {
						// The last save can still be in flight when the user deletes the
						// drawing right after leaving it; that save then fails.
						if (!wasDeleted(id)) showError(cause);
					}}
				/>
			) : (
				<main className="gallery">
					<DrawingList
						drawings={drawings}
						onOpen={openDrawing}
						onCreate={(name) =>
							create(name).then((created) => openDrawing(created.id), showError)
						}
						onRename={(id, name) => rename(id, name).catch(showError)}
						onDelete={(id) => remove(id).catch(showError)}
					/>
				</main>
			)}
			{error && (
				<div className="error" role="alert">
					<p>{error}</p>
					<button type="button" onClick={() => setError(null)}>
						Dismiss
					</button>
				</div>
			)}
		</>
	);
}

type EditorViewProps = {
	/** The open drawing, or null while it loads. */
	drawing: Drawing | null;
	theme: "light" | "dark";
	onOpen: (id: string | null) => void;
	onSaved: (summary: DrawingSummary) => void;
	/** Reports a failed save of the drawing with the given ID. */
	onError: (id: string, error: unknown) => void;
};

/** The open drawing across the window, below a bar that leads back to all drawings. */
function EditorView({
	drawing,
	theme,
	onOpen,
	onSaved,
	onError,
}: EditorViewProps) {
	return (
		<div className="editing">
			<header className="editor-bar">
				<DrawingLink drawingId={null} onOpen={onOpen} className="back">
					<BackIcon />
					All drawings
				</DrawingLink>
				{drawing && <h1>{drawing.name}</h1>}
			</header>
			<main className="editor">
				{drawing ? (
					<Editor
						key={drawing.id}
						drawing={drawing}
						theme={theme}
						onSaved={onSaved}
						onError={(cause) => onError(drawing.id, cause)}
					/>
				) : (
					<p className="placeholder">Opening drawing…</p>
				)}
			</main>
		</div>
	);
}
