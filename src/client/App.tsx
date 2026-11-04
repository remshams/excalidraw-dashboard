import { useCallback, useState } from "react";
import type { Drawing, DrawingSummary } from "../shared/types.ts";
import styles from "./App.module.css";
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
	const { drawing, failed } = useDrawing(openDrawingId, showError);
	const { drawings, replace, create, rename, remove, wasDeleted } =
		useDrawings(showError);

	return (
		<>
			{openDrawingId ? (
				<EditorView
					drawing={drawing}
					failed={failed}
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
				<main className={styles.gallery}>
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
				<div className={styles.error} role="alert">
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
	/** The open drawing, or null while it loads or when loading failed. */
	drawing: Drawing | null;
	failed: boolean;
	theme: "light" | "dark";
	onOpen: (id: string | null) => void;
	onSaved: (summary: DrawingSummary) => void;
	/** Reports a failed save of the drawing with the given ID. */
	onError: (id: string, error: unknown) => void;
};

/** The open drawing across the window, below a bar that leads back to all drawings. */
function EditorView({
	drawing,
	failed,
	theme,
	onOpen,
	onSaved,
	onError,
}: EditorViewProps) {
	return (
		<div className={styles.editing}>
			<header className={styles.editorBar}>
				<DrawingLink drawingId={null} onOpen={onOpen} className={styles.back}>
					<BackIcon />
					All drawings
				</DrawingLink>
				{drawing && <h1>{drawing.name}</h1>}
			</header>
			<main className={styles.editor}>
				{drawing ? (
					<Editor
						key={drawing.id}
						drawing={drawing}
						theme={theme}
						onSaved={onSaved}
						onError={(cause) => onError(drawing.id, cause)}
					/>
				) : (
					<p className={styles.placeholder}>
						{failed ? "This drawing couldn't be opened." : "Opening drawing…"}
					</p>
				)}
			</main>
		</div>
	);
}
