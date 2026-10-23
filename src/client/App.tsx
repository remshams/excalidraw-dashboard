import { useCallback, useState } from "react";
import type { Drawing, DrawingSummary } from "../shared/types.ts";
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

	const [openId, open] = useHashId();
	const drawing = useDrawing(openId, showError);
	const { drawings, replace, create, rename, remove } = useDrawings(showError);

	return (
		<>
			{openId ? (
				<EditorView
					drawing={drawing}
					onBack={() => open(null)}
					onSaved={replace}
					onError={showError}
				/>
			) : (
				<main className="gallery">
					<DrawingList
						drawings={drawings}
						onOpen={open}
						onCreate={(name) =>
							create(name).then((created) => open(created.id), showError)
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
	onBack: () => void;
	onSaved: (summary: DrawingSummary) => void;
	onError: (error: unknown) => void;
};

/** The open drawing across the whole window, below a bar that leads back to the list. */
function EditorView({ drawing, onBack, onSaved, onError }: EditorViewProps) {
	return (
		<div className="editing">
			<header className="editor-bar">
				<button type="button" className="back" onClick={onBack}>
					<BackIcon />
					All drawings
				</button>
				{drawing && <h1>{drawing.name}</h1>}
			</header>
			<main className="editor">
				{drawing ? (
					<Editor
						key={drawing.id}
						drawing={drawing}
						onSaved={onSaved}
						onError={onError}
					/>
				) : (
					<p className="placeholder">Opening drawing…</p>
				)}
			</main>
		</div>
	);
}

function BackIcon() {
	return (
		<svg
			aria-hidden="true"
			width={18}
			height={18}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.75}
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M19 12H5M11 6l-6 6 6 6" />
		</svg>
	);
}
