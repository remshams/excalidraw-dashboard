import { useRef, useState } from "react";
import type { DrawingSummary, SavedDrawingSummary } from "#shared/drawings.ts";
import type { Tag } from "#shared/tags.ts";
import { DrawingLink } from "../../DrawingLink.tsx";
import { PencilIcon, PlusIcon, TagIcon, TrashIcon } from "../../icons.tsx";
import { NameField } from "../../NameField.tsx";
import { isSaved } from "../../scratchpad.ts";
import { searchByName } from "../../search.ts";
import { NEW_SCRATCHPAD } from "../../use-open-drawing-id.ts";
import { DeleteConfirmation } from "../DeleteConfirmation.tsx";
import { FilterRow } from "../filter/FilterRow.tsx";
import { TagToggles } from "../filter/TagToggles.tsx";
import { filterDrawings } from "../filter/tag-filter.ts";
import type { TagFilter } from "../filter/use-tag-filter.ts";
import { PreviewImage } from "../PreviewImage.tsx";
import { DrawingTagsDialog } from "../tags/drawing-tags/DrawingTagsDialog.tsx";
import { TagInkFilter } from "../tags/TagMark.tsx";
import { TagTray } from "../tags/tray/TagTray.tsx";
import type { TagChanges } from "../tags/use-tags.ts";
import { shownCardTags } from "./card-tags.ts";
import styles from "./DrawingList.module.css";
import { noMatchMessage } from "./no-match-message.ts";
import { Scratchpads } from "./Scratchpads.tsx";
import { type CardTask, cardTaskOf, useOpenTask } from "./use-open-task.ts";
import { useFocusAfterDialog, useTagRefocus } from "./use-tag-refocus.ts";

type DrawingListProps = {
	drawings: DrawingSummary[];
	/** Every tag, or null while they load or when loading failed. */
	tags: Tag[] | null;
	tagChanges: TagChanges;
	/** The tag filter and the search, which `App` keeps while a drawing is open. */
	filter: TagFilter;
	onOpen: (id: string | null) => void;
	onRename: (id: string, name: string) => void;
	onDelete: (id: string) => void;
	/** Deletes every scratchpad with the given IDs. */
	onDiscardAll: (ids: string[]) => void;
	/** Gives the drawing the tag or takes it off. Rejects when the server refuses. */
	onToggleTag: (drawing: DrawingSummary, tagId: string) => Promise<void>;
};

/** How many tags a card shows before it counts the rest. */
const CARD_TAGS = 3;

/**
 * The landing page: the scratchpads, then every drawing in the tag filter that
 * matches the search, as a sheet with its preview, after a blank sheet that
 * starts a new scratchpad. A search or a filter hides the scratchpads, which
 * have neither a name nor tags to match.
 */
export function DrawingList({
	drawings,
	tags,
	tagChanges,
	filter,
	onOpen,
	onRename,
	onDelete,
	onDiscardAll,
	onToggleTag,
}: DrawingListProps) {
	const questions = useOpenTask();
	const { task, returnTo, ask, close, closeToButton } = questions;
	const [taggingId, setTaggingId] = useState<string | null>(null);
	const saved = drawings.filter(isSaved);
	const tagging = saved.find(({ id }) => id === taggingId);
	const searchField = useRef<HTMLInputElement>(null);
	const { page, refocus } = useTagRefocus();
	const tagsButton = useRef<HTMLButtonElement>(null);
	useFocusAfterDialog(tagging !== undefined, tagsButton);
	const shown = filterDrawings(saved, filter.selectedTagIds, filter.query);
	const asked = filter.query.trim() !== "" || filter.selectedTagIds.length > 0;

	// A question on a card the search or the filter hides would come back with it.
	const toggleFilter = (tagId: string) => {
		close();
		filter.toggle(tagId);
	};
	const clearFilter = () => {
		close();
		filter.clear();
	};

	return (
		<div ref={page} className={styles.list}>
			<header className={styles.header}>
				<h1>Drawings</h1>
				<div className={styles.tools}>
					<input
						ref={searchField}
						type="search"
						className={styles.search}
						aria-label="Search drawings"
						placeholder="Search…"
						value={filter.query}
						onChange={(event) => {
							filter.setQuery(event.target.value);
							close();
						}}
					/>
					<TagTray
						ref={tagsButton}
						tags={tags}
						drawings={drawings}
						changes={tagChanges}
						selectedTagIds={filter.selectedTagIds}
						onToggleFilter={toggleFilter}
						onClearFilter={clearFilter}
					/>
					<TagInkFilter />
				</div>
			</header>
			<FilterRow
				filter={filter}
				onToggle={(tagId) => {
					refocus(tagId);
					toggleFilter(tagId);
				}}
				onClear={clearFilter}
			/>
			{!asked && (
				<Scratchpads
					drawings={drawings}
					questions={questions}
					onOpen={onOpen}
					onSave={onRename}
					onDiscard={onDelete}
					onDiscardAll={onDiscardAll}
				/>
			)}
			<ul className={styles.cards} aria-label="Drawings">
				<NewDrawingCard onOpen={onOpen} />
				{shown.map((drawing) => (
					<DrawingCard
						key={drawing.id}
						drawing={drawing}
						tags={(tags ?? []).filter(({ id }) => drawing.tagIds.includes(id))}
						selectedTagIds={filter.selectedTagIds}
						task={cardTaskOf(task, drawing.id)}
						refocus={cardTaskOf(returnTo, drawing.id)}
						onOpen={onOpen}
						onStart={(kind) => ask({ kind, id: drawing.id })}
						onEditTags={() => setTaggingId(drawing.id)}
						onToggleTag={(tagId) => {
							refocus(tagId, drawing.id);
							toggleFilter(tagId);
						}}
						onRename={(name) => {
							closeToButton();
							onRename(drawing.id, name);
						}}
						onDelete={() => {
							close();
							onDelete(drawing.id);
						}}
						onCancel={closeToButton}
					/>
				))}
			</ul>
			<NoMatch
				drawings={saved}
				shown={shown}
				filter={filter}
				asked={asked}
				onClearFilter={() => {
					searchField.current?.focus();
					clearFilter();
				}}
			/>
			{tagging && (
				<DrawingTagsDialog
					drawing={tagging}
					tags={tags}
					changes={tagChanges}
					onToggle={(tagId) => onToggleTag(tagging, tagId)}
					onClose={() => setTaggingId(null)}
				/>
			)}
		</div>
	);
}

/**
 * A blank sheet that opens the editor on a new scratchpad. The server stores it
 * once the user draws something.
 */
function NewDrawingCard({ onOpen }: { onOpen: (id: string | null) => void }) {
	return (
		<li>
			<DrawingLink
				drawingId={NEW_SCRATCHPAD}
				onOpen={onOpen}
				className={styles.open}
			>
				<span className={`${styles.sheet} ${styles.blank}`}>
					<PlusIcon />
				</span>
				<span className={styles.name}>New drawing</span>
			</DrawingLink>
		</li>
	);
}

type NoMatchProps = {
	drawings: SavedDrawingSummary[];
	shown: SavedDrawingSummary[];
	filter: TagFilter;
	/** Whether a search or a tag filter is set. */
	asked: boolean;
	onClearFilter: () => void;
};

/**
 * Says why no drawing shows, if none does. When the filter hides drawings the
 * search finds, it offers to clear the filter and keep the search.
 */
function NoMatch({
	drawings,
	shown,
	filter,
	asked,
	onClearFilter,
}: NoMatchProps) {
	const searched = filter.query.trim();
	const selected = filter.selectedTags;
	const empty = asked && shown.length === 0;
	// The drawings the search would find if the filter weren't in the way.
	const outside =
		empty && searched && selected.length > 0
			? searchByName(drawings, searched).length
			: 0;

	return (
		<div className={styles.empty}>
			{/* Always rendered, so screen readers announce the message when it
			    appears. */}
			<p role="status" className={styles.status}>
				{empty ? noMatchMessage(searched, selected, outside) : null}
			</p>
			{outside > 0 && (
				<button
					type="button"
					className={styles.clearFilter}
					onClick={onClearFilter}
				>
					Clear filter
				</button>
			)}
		</div>
	);
}

type DrawingCardProps = {
	drawing: SavedDrawingSummary;
	/** The drawing's tags, sorted by label. */
	tags: Tag[];
	selectedTagIds: string[];
	/** The question the card asks below its sheet, if any. */
	task: CardTask | null;
	/** The question just closed, whose button takes the focus back. */
	refocus: CardTask | null;
	onOpen: (id: string | null) => void;
	onStart: (task: CardTask) => void;
	onEditTags: () => void;
	/** Puts the tag in the filter or takes it out. */
	onToggleTag: (tagId: string) => void;
	onRename: (name: string) => void;
	onDelete: () => void;
	onCancel: () => void;
};

/**
 * A drawing's card: its sheet and name as a link that opens it, its tags as filter
 * buttons and its actions. While it renames or deletes, the question replaces the link.
 */
function DrawingCard({
	drawing,
	tags,
	selectedTagIds,
	task,
	refocus,
	onOpen,
	onStart,
	onEditTags,
	onToggleTag,
	onRename,
	onDelete,
	onCancel,
}: DrawingCardProps) {
	const { id, name } = drawing;
	const tagged = tags.length > 0;
	// Outside the link, so a click on a tag filters and doesn't open the drawing.
	const cardTags = tagged && (
		<CardTags
			drawing={drawing}
			tags={tags}
			selectedTagIds={selectedTagIds}
			onToggle={onToggleTag}
		/>
	);

	if (task === "rename" || task === "delete") {
		return (
			<li>
				<Sheet drawing={drawing} tagged={tagged} />
				{cardTags}
				{task === "rename" ? (
					<NameField
						label={`New name for ${name}`}
						initialName={name}
						onSubmit={onRename}
						onCancel={onCancel}
					/>
				) : (
					<DeleteConfirmation
						question={`Delete “${name}”?`}
						action="Delete"
						onConfirm={onDelete}
						onCancel={onCancel}
					/>
				)}
			</li>
		);
	}

	return (
		<li>
			<DrawingLink
				drawingId={id}
				onOpen={onOpen}
				className={styles.open}
				// The sheet shows only the first tags; the name lists them all.
				aria-label={
					tagged
						? `${name}, tags: ${tags.map(({ label }) => label).join(", ")}`
						: undefined
				}
			>
				<Sheet drawing={drawing} tagged={tagged} />
				<span className={styles.name}>{name}</span>
			</DrawingLink>
			{cardTags}
			<span className={styles.actions}>
				<button
					type="button"
					className={styles.icon}
					aria-label={`Change tags of ${name}`}
					aria-haspopup="dialog"
					title="Change tags"
					onClick={onEditTags}
				>
					<TagIcon />
				</button>
				<button
					type="button"
					className={styles.icon}
					aria-label={`Rename ${name}`}
					// biome-ignore lint/a11y/noAutofocus: the focus comes back from the question the user just closed.
					autoFocus={refocus === "rename"}
					onClick={() => onStart("rename")}
				>
					<PencilIcon />
				</button>
				<button
					type="button"
					className={styles.icon}
					aria-label={`Delete ${name}`}
					// biome-ignore lint/a11y/noAutofocus: the focus comes back from the question the user just closed.
					autoFocus={refocus === "delete"}
					onClick={() => onStart("delete")}
				>
					<TrashIcon />
				</button>
			</span>
		</li>
	);
}

/** The drawing's preview on a sheet of paper, or a blank sheet without one. */
function Sheet({
	drawing,
	tagged,
}: {
	drawing: DrawingSummary;
	/** Leaves the foot of the sheet to the tags. */
	tagged: boolean;
}) {
	return (
		<span className={`${styles.sheet} ${tagged ? styles.tagged : ""}`}>
			<PreviewImage drawing={drawing} />
		</span>
	);
}

type CardTagsProps = {
	drawing: SavedDrawingSummary;
	/** The drawing's tags, sorted by label. */
	tags: Tag[];
	selectedTagIds: string[];
	onToggle: (tagId: string) => void;
};

/**
 * A card's first tags along the foot of its sheet, as buttons that toggle them in
 * the filter, then "+2" for the rest. They lie over the sheet but outside the
 * card's link, whose name lists every tag.
 */
function CardTags({ drawing, tags, selectedTagIds, onToggle }: CardTagsProps) {
	const hidden = tags.length - CARD_TAGS;
	return (
		<div className={styles.tagLayer} data-card={drawing.id}>
			<TagToggles
				tags={shownCardTags(tags, selectedTagIds, CARD_TAGS)}
				selectedTagIds={selectedTagIds}
				seed={drawing.id}
				size="small"
				className={styles.strip}
				aria-label={`Tags of ${drawing.name}`}
				onToggle={onToggle}
			>
				{hidden > 0 && (
					<span className={styles.more} aria-hidden="true">
						+{hidden}
					</span>
				)}
			</TagToggles>
		</div>
	);
}
