import { useCallback, useState } from "react";
import type { Drawing, DrawingSummary } from "#shared/drawings.ts";
import styles from "./App.module.css";
import { BackIcon, SearchIcon } from "./drawings/catalog/icons.tsx";
import { useTagFilter } from "./drawings/catalog/filter/use-tag-filter.ts";
import { DrawingList } from "./drawings/catalog/list/DrawingList.tsx";
import { QuickSwitcher } from "./drawings/catalog/switcher/QuickSwitcher.tsx";
import {
	switcherShortcutHint,
	useSwitcherShortcut,
} from "./drawings/catalog/switcher/use-switcher-shortcut.ts";
import { useTags } from "./drawings/catalog/tags/use-tags.ts";
import { useDrawings } from "./drawings/catalog/use-drawings.ts";
import { DrawingLink } from "./drawings/DrawingLink.tsx";
import { Editor } from "./drawings/editor/Editor.tsx";
import { useDrawing } from "./drawings/editor/use-drawing.ts";
import { useOpenDrawingId } from "./drawings/use-open-drawing-id.ts";
import { useColorScheme } from "./use-color-scheme.ts";

/**
 * The whole client: the landing page at `/`, or the open drawing below its bar, and
 * the error banner for failed requests. It holds the drawings, the tags and the tag
 * filter, so they outlive switching between the two views.
 */
export function App() {
	const [error, setError] = useState<string | null>(null);
	// Stable, because useDrawing, useDrawings and useTags reload when their onError changes.
	const showError = useCallback((cause: unknown) => {
		setError(cause instanceof Error ? cause.message : String(cause));
	}, []);

	const theme = useColorScheme();
	const [openDrawingId, openDrawing] = useOpenDrawingId();
	const { drawing, failed } = useDrawing(openDrawingId, showError);
	const {
		drawings,
		replace,
		create,
		rename,
		remove,
		toggleTag,
		forgetTag,
		wasDeleted,
	} = useDrawings(showError);
	const { tags, changes: tagChanges } = useTags(showError, forgetTag);
	// Here rather than in the landing page, so the filter and the search stay set
	// while a drawing is open.
	const filter = useTagFilter(tags);
	const createAndOpen = (name: string) =>
		create(name).then((created) => openDrawing(created.id), showError);

	return (
		<>
			{openDrawingId ? (
				<EditorView
					drawing={drawing}
					drawings={drawings}
					failed={failed}
					theme={theme}
					onOpen={openDrawing}
					onCreate={createAndOpen}
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
						tags={tags}
						tagChanges={tagChanges}
						filter={filter}
						onOpen={openDrawing}
						onCreate={createAndOpen}
						onRename={(id, name) => rename(id, name).catch(showError)}
						onDelete={(id) => remove(id).catch(showError)}
						// The dialog says why a change failed.
						onToggleTag={toggleTag}
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
	/** Every drawing, for the quick switcher. */
	drawings: DrawingSummary[];
	failed: boolean;
	theme: "light" | "dark";
	onOpen: (id: string | null) => void;
	onCreate: (name: string) => void;
	onSaved: (summary: DrawingSummary) => void;
	/** Reports a failed save of the drawing with the given ID. */
	onError: (id: string, error: unknown) => void;
};

/**
 * The open drawing across the window, below a bar that leads back to all drawings
 * and opens the quick switcher.
 */
function EditorView({
	drawing,
	drawings,
	failed,
	theme,
	onOpen,
	onCreate,
	onSaved,
	onError,
}: EditorViewProps) {
	const [switching, setSwitching] = useState(false);
	const toggleSwitcher = useCallback(() => setSwitching((open) => !open), []);
	useSwitcherShortcut(toggleSwitcher);

	return (
		<div className={styles.editing}>
			<header className={styles.editorBar}>
				<DrawingLink
					drawingId={null}
					onOpen={onOpen}
					className={styles.barAction}
				>
					<BackIcon />
					All drawings
				</DrawingLink>
				{drawing && <h1>{drawing.name}</h1>}
				<button
					type="button"
					className={`${styles.barAction} ${styles.switch}`}
					aria-label="Switch drawing"
					aria-keyshortcuts="Control+K Meta+K"
					onClick={() => setSwitching(true)}
				>
					<SearchIcon />
					<span className={styles.switchText}>
						Switch drawing <kbd>{switcherShortcutHint()}</kbd>
					</span>
				</button>
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
			{switching && (
				<QuickSwitcher
					drawings={drawings}
					openDrawingId={drawing?.id ?? null}
					onOpen={onOpen}
					onCreate={onCreate}
					onClose={() => setSwitching(false)}
				/>
			)}
		</div>
	);
}
