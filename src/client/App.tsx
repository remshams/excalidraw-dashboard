import { useCallback, useState } from "react";
import type { Drawing, DrawingSummary } from "../shared/types.ts";
import { DrawingList } from "./drawings/DrawingList.tsx";
import { Editor } from "./drawings/Editor.tsx";
import { QuickSwitcher } from "./drawings/QuickSwitcher.tsx";
import { useDrawing } from "./drawings/use-drawing.ts";
import { useDrawings } from "./drawings/use-drawings.ts";
import { useHashId } from "./drawings/use-hash-id.ts";
import { useSwitcherShortcut } from "./drawings/use-switcher-shortcut.ts";

export function App() {
	const [error, setError] = useState<string | null>(null);
	const showError = useCallback((cause: unknown) => {
		setError(cause instanceof Error ? cause.message : String(cause));
	}, []);

	const [openId, open] = useHashId();
	const drawing = useDrawing(openId, showError);
	const { drawings, replace, create, rename, remove } = useDrawings(showError);
	const createAndOpen = (name: string) =>
		create(name).then((created) => open(created.id), showError);

	return (
		<>
			{openId ? (
				<EditorView
					openId={openId}
					drawing={drawing}
					drawings={drawings}
					onBack={() => open(null)}
					onOpen={open}
					onCreate={createAndOpen}
					onSaved={replace}
					onError={showError}
				/>
			) : (
				<main className="gallery">
					<DrawingList
						drawings={drawings}
						onOpen={open}
						onCreate={createAndOpen}
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
	openId: string;
	/** The open drawing, or null while it loads. */
	drawing: Drawing | null;
	/** Every drawing, to switch between them. */
	drawings: DrawingSummary[];
	onBack: () => void;
	onOpen: (id: string) => void;
	onCreate: (name: string) => void;
	onSaved: (summary: DrawingSummary) => void;
	onError: (error: unknown) => void;
};

/**
 * The open drawing across the whole window, below a bar that leads back to the
 * list or, through the quick switcher, to another drawing.
 */
function EditorView({
	openId,
	drawing,
	drawings,
	onBack,
	onOpen,
	onCreate,
	onSaved,
	onError,
}: EditorViewProps) {
	const [switching, setSwitching] = useState(false);
	const toggleSwitcher = useCallback(() => setSwitching((open) => !open), []);
	useSwitcherShortcut(toggleSwitcher);

	return (
		<div className="editing">
			<header className="editor-bar">
				<button type="button" className="back" onClick={onBack}>
					<BackIcon />
					All drawings
				</button>
				{drawing && <h1>{drawing.name}</h1>}
				<button
					type="button"
					className="switch"
					aria-keyshortcuts="Control+K Meta+K"
					onClick={toggleSwitcher}
				>
					<SearchIcon />
					Switch drawing
					<kbd>{shortcutLabel}</kbd>
				</button>
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
			{switching && (
				<QuickSwitcher
					drawings={drawings}
					currentId={openId}
					onOpen={onOpen}
					onCreate={onCreate}
					onClose={() => setSwitching(false)}
				/>
			)}
		</div>
	);
}

const shortcutLabel = /Mac|iP(hone|ad)/.test(navigator.platform)
	? "⌘K"
	: "Ctrl K";

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

function BackIcon() {
	return (
		<svg aria-hidden="true" {...iconProps}>
			<path d="M19 12H5M11 6l-6 6 6 6" />
		</svg>
	);
}

function SearchIcon() {
	return (
		<svg aria-hidden="true" {...iconProps}>
			<path d="M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM15.5 15.5 20 20" />
		</svg>
	);
}
