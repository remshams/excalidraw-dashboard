import { useCallback, useMemo, useState } from "react";
import type { Drawing, DrawingSummary } from "#shared/drawings.ts";
import type { Tag } from "#shared/tags.ts";
import styles from "./App.module.css";
import { useTagFilter } from "./drawings/catalog/filter/use-tag-filter.ts";
import { DrawingList } from "./drawings/catalog/list/DrawingList.tsx";
import { QuickSwitcher } from "./drawings/catalog/switcher/QuickSwitcher.tsx";
import {
	switcherShortcutHint,
	useSwitcherShortcut,
} from "./drawings/catalog/switcher/use-switcher-shortcut.ts";
import { DrawingTagsButton } from "./drawings/catalog/tags/drawing-tags/DrawingTagsButton.tsx";
import { type TagChanges, useTags } from "./drawings/catalog/tags/use-tags.ts";
import { useDrawings } from "./drawings/catalog/use-drawings.ts";
import { DrawingLink } from "./drawings/DrawingLink.tsx";
import { DiscardScratchpad } from "./drawings/editor/DiscardScratchpad.tsx";
import { DrawingTitle } from "./drawings/editor/DrawingTitle.tsx";
import { Editor } from "./drawings/editor/Editor.tsx";
import { useDrawing } from "./drawings/editor/use-drawing.ts";
import { BackIcon, SearchIcon } from "./drawings/icons.tsx";
import { isSaved, newScratchpad } from "./drawings/scratchpad.ts";
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
	const { openId, isNew, openDrawing, markStored } = useOpenDrawingId();
	// A new scratchpad starts in the editor; the server has nothing to load yet.
	const loaded = useDrawing(isNew ? null : openId, showError);
	const scratchpad = useMemo(
		() => (isNew && openId ? newScratchpad(openId) : null),
		[isNew, openId],
	);
	const drawing = scratchpad ?? loaded.drawing;
	const {
		drawings,
		replace,
		create,
		rename,
		remove,
		removeAll,
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
	const renameDrawing = (id: string, name: string) =>
		rename(id, name).catch(showError);
	const deleteDrawing = (id: string) => remove(id).catch(showError);

	return (
		<>
			{openId ? (
				<EditorView
					drawing={drawing}
					isNew={isNew}
					drawings={drawings}
					tagging={{ tags, changes: tagChanges, onToggle: toggleTag }}
					failed={loaded.failed}
					theme={theme}
					onOpen={openDrawing}
					onCreate={createAndOpen}
					onRename={renameDrawing}
					onDiscard={(id) => {
						// The delete goes out before the editor closes and flushes its last
						// edit; that save then fails with 404, which onError ignores.
						openDrawing(null);
						deleteDrawing(id);
					}}
					onSaved={(summary) => {
						replace(summary);
						markStored(summary.id);
					}}
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
						onRename={renameDrawing}
						onDelete={deleteDrawing}
						onDiscardAll={(ids) => removeAll(ids).catch(showError)}
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

/** What the editor bar needs to show and change the open drawing's tags. */
type Tagging = {
	/** Every tag, or null while they load or when loading failed. */
	tags: Tag[] | null;
	changes: TagChanges;
	/**
	 * Gives the drawing the tag or takes it off. Rejects when the server refuses;
	 * the dialog says why.
	 */
	onToggle: (drawing: DrawingSummary, tagId: string) => Promise<void>;
};

type EditorViewProps = {
	/** The open drawing, or null while it loads or when loading failed. */
	drawing: Drawing | null;
	/** Whether the drawing is a scratchpad the user started in this editor. */
	isNew: boolean;
	/** Every drawing, for the quick switcher. */
	drawings: DrawingSummary[];
	tagging: Tagging;
	failed: boolean;
	theme: "light" | "dark";
	onOpen: (id: string | null) => void;
	onCreate: (name: string) => void;
	/** Renames a drawing; resolves once the rename succeeded or failed. */
	onRename: (id: string, name: string) => Promise<void>;
	/** Deletes the open scratchpad and leaves it. */
	onDiscard: (id: string) => void;
	onSaved: (summary: DrawingSummary) => void;
	/** Reports a failed save of the drawing with the given ID. */
	onError: (id: string, error: unknown) => void;
};

/**
 * The open drawing across the window, below a bar that leads back to all drawings,
 * names the drawing and its tags, and opens the quick switcher.
 */
function EditorView({
	drawing,
	isNew,
	drawings,
	tagging,
	failed,
	theme,
	onOpen,
	onCreate,
	onRename,
	onDiscard,
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
				{drawing && (
					<BarDrawing
						key={drawing.id}
						drawing={drawing}
						drawings={drawings}
						tagging={tagging}
						onRename={onRename}
						onDiscard={onDiscard}
					/>
				)}
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
						isNew={isNew}
						theme={theme}
						onSaved={onSaved}
						onError={(cause) => onError(drawing.id, cause)}
					/>
				) : (
					<EditorPlaceholder failed={failed} />
				)}
			</main>
			{switching && (
				<QuickSwitcher
					drawings={drawings.filter(isSaved)}
					openDrawingId={drawing?.id ?? null}
					onOpen={onOpen}
					onCreate={onCreate}
					onClose={() => setSwitching(false)}
				/>
			)}
		</div>
	);
}

/** Takes the editor's place while the drawing loads, or says it couldn't. */
function EditorPlaceholder({ failed }: { failed: boolean }) {
	return (
		<p className={styles.placeholder}>
			{failed ? "This drawing couldn't be opened." : "Opening drawing…"}
		</p>
	);
}

type BarDrawingProps = {
	/** The open drawing as it was loaded. */
	drawing: Drawing;
	drawings: DrawingSummary[];
	tagging: Tagging;
	onRename: (id: string, name: string) => Promise<void>;
	onDiscard: (id: string) => void;
};

/**
 * The open drawing's name in the bar, then its tags once the list and the tags
 * have loaded. A scratchpad shows "Save as drawing" and "Discard" instead, once
 * the server has stored it.
 */
function BarDrawing({
	drawing,
	drawings,
	tagging: { tags, changes, onToggle },
	onRename,
	onDiscard,
}: BarDrawingProps) {
	// The list has the name after a rename and the tags after a change; the loaded
	// drawing keeps the ones it opened with. The list can still be loading, and a
	// new scratchpad joins it with its first save.
	const listed = drawings.find(({ id }) => id === drawing.id);
	const name = listed ? listed.name : drawing.name;
	return (
		<div className={styles.barDrawing}>
			<DrawingTitle
				name={name}
				canSave={listed !== undefined}
				buttonClassName={styles.barAction}
				onRename={(newName) => onRename(drawing.id, newName)}
			/>
			{listed && name === null && (
				<DiscardScratchpad
					className={styles.barAction}
					onDiscard={() => onDiscard(drawing.id)}
				/>
			)}
			{listed && isSaved(listed) && tags && (
				<DrawingTagsButton
					drawing={listed}
					tags={tags}
					changes={changes}
					onToggle={(tagId) => onToggle(listed, tagId)}
				/>
			)}
		</div>
	);
}
