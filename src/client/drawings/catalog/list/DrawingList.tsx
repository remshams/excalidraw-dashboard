import { useRef, useState } from "react";
import type { DrawingSummary } from "#shared/drawings.ts";
import type { Tag } from "#shared/tags.ts";
import { DrawingLink } from "../../DrawingLink.tsx";
import { searchByName } from "../../search.ts";
import { DeleteConfirmation } from "../DeleteConfirmation.tsx";
import { FilterRow } from "../filter/FilterRow.tsx";
import { filterDrawings } from "../filter/tag-filter.ts";
import { TagToggles } from "../filter/TagToggles.tsx";
import type { TagFilter } from "../filter/use-tag-filter.ts";
import { PencilIcon, PlusIcon, TagIcon, TrashIcon } from "../../icons.tsx";
import { NameField } from "../../NameField.tsx";
import { PreviewImage } from "../PreviewImage.tsx";
import { DrawingTagsDialog } from "../tags/drawing-tags/DrawingTagsDialog.tsx";
import { TagInkFilter } from "../tags/TagMark.tsx";
import { TagTray } from "../tags/tray/TagTray.tsx";
import type { TagChanges } from "../tags/use-tags.ts";
import styles from "./DrawingList.module.css";
import { shownCardTags } from "./card-tags.ts";
import { noMatchMessage } from "./no-match-message.ts";
import { useFocusAfterDialog, useTagRefocus } from "./use-tag-refocus.ts";

type DrawingListProps = {
	drawings: DrawingSummary[];
	/** Every tag, or null while they load or when loading failed. */
	tags: Tag[] | null;
	tagChanges: TagChanges;
	/** The tag filter and the search, which `App` keeps while a drawing is open. */
	filter: TagFilter;
	onOpen: (id: string | null) => void;
	onCreate: (name: string) => void;
	onRename: (id: string, name: string) => void;
	onDelete: (id: string) => void;
	/** Gives the drawing the tag or takes it off. Rejects when the server refuses. */
	onToggleTag: (drawing: DrawingSummary, tagId: string) => Promise<void>;
};

/** How many tags a card shows before it counts the rest. */
const CARD_TAGS = 3;

type CardTask = "rename" | "delete";

/**
 * The one card that asks something, if any: the blank sheet for a new name, or
 * a drawing's card for a new name or a delete confirmation.
 */
type OpenTask = { kind: "create" } | { kind: CardTask; id: string } | null;

/**
 * The landing page: every drawing in the tag filter that matches the search, as a
 * sheet with its preview, after a blank sheet that starts a new one.
 */
export function DrawingList({
	drawings,
	tags,
	tagChanges,
	filter,
	onOpen,
	onCreate,
	onRename,
	onDelete,
	onToggleTag,
}: DrawingListProps) {
	const [task, setTask] = useState<OpenTask>(null);
	const [taggingId, setTaggingId] = useState<string | null>(null);
	const tagging = drawings.find(({ id }) => id === taggingId);
	const searchField = useRef<HTMLInputElement>(null);
	const { page, refocus } = useTagRefocus();
	const tagsButton = useRef<HTMLButtonElement>(null);
	useFocusAfterDialog(tagging !== undefined, tagsButton);
	const close = () => setTask(null);
	const shown = filterDrawings(drawings, filter.selectedTagIds, filter.query);

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
			<ul className={styles.cards} aria-label="Drawings">
				<NewDrawingCard
					creating={task?.kind === "create"}
					onStart={() => setTask({ kind: "create" })}
					onCreate={(name) => {
						close();
						onCreate(name);
					}}
					onCancel={close}
				/>
				{shown.map((drawing) => (
					<DrawingCard
						key={drawing.id}
						drawing={drawing}
						tags={(tags ?? []).filter(({ id }) => drawing.tagIds.includes(id))}
						selectedTagIds={filter.selectedTagIds}
						task={
							task && task.kind !== "create" && task.id === drawing.id
								? task.kind
								: null
						}
						onOpen={onOpen}
						onStart={(kind) => setTask({ kind, id: drawing.id })}
						onEditTags={() => setTaggingId(drawing.id)}
						onToggleTag={(tagId) => {
							refocus(tagId, drawing.id);
							toggleFilter(tagId);
						}}
						onRename={(name) => {
							close();
							onRename(drawing.id, name);
						}}
						onDelete={() => {
							close();
							onDelete(drawing.id);
						}}
						onCancel={close}
					/>
				))}
			</ul>
			<NoMatch
				drawings={drawings}
				shown={shown}
				filter={filter}
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

type NewDrawingCardProps = {
	/** Whether the card asks for the new drawing's name. */
	creating: boolean;
	onStart: () => void;
	onCreate: (name: string) => void;
	onCancel: () => void;
};

/** A blank sheet that asks for a name and creates the drawing. */
function NewDrawingCard({
	creating,
	onStart,
	onCreate,
	onCancel,
}: NewDrawingCardProps) {
	const sheet = (
		<span className={`${styles.sheet} ${styles.blank}`}>
			<PlusIcon />
		</span>
	);

	return (
		<li>
			{creating ? (
				<>
					{sheet}
					<NameField
						label="Name of the new drawing"
						onSubmit={onCreate}
						onCancel={onCancel}
					/>
				</>
			) : (
				<button type="button" className={styles.open} onClick={onStart}>
					{sheet}
					<span className={styles.name}>New drawing</span>
				</button>
			)}
		</li>
	);
}

type NoMatchProps = {
	drawings: DrawingSummary[];
	shown: DrawingSummary[];
	filter: TagFilter;
	onClearFilter: () => void;
};

/**
 * Says why no drawing shows, if none does. When the filter hides drawings the
 * search finds, it offers to clear the filter and keep the search.
 */
function NoMatch({ drawings, shown, filter, onClearFilter }: NoMatchProps) {
	const searched = filter.query.trim();
	const selected = filter.selectedTags;
	const asked = searched !== "" || selected.length > 0;
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
	drawing: DrawingSummary;
	/** The drawing's tags, sorted by label. */
	tags: Tag[];
	selectedTagIds: string[];
	/** The question the card asks below its sheet, if any. */
	task: CardTask | null;
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
						name={name}
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
					onClick={() => onStart("rename")}
				>
					<PencilIcon />
				</button>
				<button
					type="button"
					className={styles.icon}
					aria-label={`Delete ${name}`}
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
	drawing: DrawingSummary;
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
