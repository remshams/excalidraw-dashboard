import { type CSSProperties, type KeyboardEvent, useEffect, useRef, useState } from "react";
import type { DrawingSummary } from "../../../../shared/types.ts";
import { DrawingLink } from "../../DrawingLink.tsx";
import { searchByName } from "../../search.ts";
import { DeleteConfirmation } from "../DeleteConfirmation.tsx";
import { PencilIcon, PlusIcon, StampIcon, TagIcon, TrashIcon } from "../icons.tsx";
import { NameField } from "../NameField.tsx";
import { PreviewImage } from "../PreviewImage.tsx";
import { ActiveFilter } from "../tags/ActiveFilter.tsx";
import { DrawingTagsDialog } from "../tags/DrawingTagsDialog.tsx";
import { moveInGrid } from "../tags/grid-keys.ts";
import { type Tag, useMockTags } from "../tags/mock-tags.ts";
import { InkFilter, SheetStamps, Stamp } from "../tags/Stamp.tsx";
import { StampPad } from "../tags/StampPad.tsx";
import { TagTray } from "../tags/TagTray.tsx";
import { useStampPad } from "../tags/use-stamp-pad.ts";
import styles from "./DrawingList.module.css";

type DrawingListProps = {
	drawings: DrawingSummary[];
	onOpen: (id: string | null) => void;
	onCreate: (name: string) => void;
	onRename: (id: string, name: string) => void;
	onDelete: (id: string) => void;
};

type CardTask = "rename" | "delete";

/**
 * The one card that asks something, if any: the blank sheet for a new name, or
 * a drawing's card for a new name or a delete confirmation.
 */
type OpenTask = { kind: "create" } | { kind: CardTask; id: string } | null;

/**
 * The landing page: every drawing that matches the search as a sheet with its
 * preview, after a blank sheet that starts a new one.
 */
export function DrawingList({
	drawings,
	onOpen,
	onCreate,
	onRename,
	onDelete,
}: DrawingListProps) {
	const store = useMockTags();
	const { query, setQuery, selectedTagIds, tags } = store;
	const [task, setTask] = useState<OpenTask>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const tagsButton = useRef<HTMLButtonElement>(null);
	const padButton = useRef<HTMLButtonElement>(null);
	const padFind = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLUListElement>(null);
	const pad = useStampPad(() => padButton.current?.focus());
	const close = () => setTask(null);

	// A question on a card the filter hides would come back with it.
	// biome-ignore lint/correctness/useExhaustiveDependencies: runs when the filter changes.
	useEffect(() => setTask(null), [selectedTagIds]);

	const filtered = store.filterBySelectedTags(drawings);
	const inView = pad.open
		? drawings.filter(
				(drawing) => filtered.includes(drawing) || pad.touched.has(drawing.id),
			)
		: filtered;
	const shown = searchByName(inView, query);
	const searched = query.trim();
	const selected = tags.filter((tag) => selectedTagIds.includes(tag.id));
	const editing = drawings.find((drawing) => drawing.id === editingId);
	const lingering = selected.length
		? shown.filter((drawing) => !filtered.includes(drawing)).length
		: 0;
	const narrowed = selected.length > 0 || searched !== "";

	const goToCards = () => {
		const cards = listRef.current;
		const last = pad.fresh
			? cards?.querySelector<HTMLElement>(`[data-stampable="${pad.fresh}"]`)
			: null;
		(last ?? cards?.querySelector<HTMLElement>("[data-stampable]"))?.focus();
	};

	// With the pad open: arrows move between cards, typing goes to the pad's find field.
	const onCardsKey = (event: KeyboardEvent) => {
		if (!pad.open) return;
		if (moveInGrid(event, listRef.current, "[data-stampable]")) return;
		const typed = event.key.length === 1 && event.key !== " ";
		if (typed && !event.altKey && !event.ctrlKey && !event.metaKey) {
			padFind.current?.focus();
		}
	};

	return (
		<div
			className={`${styles.list} ${pad.open ? styles.docked : ""}`}
			style={
				pad.cursor
					? ({ "--stamp-cursor": pad.cursor } as CSSProperties)
					: undefined
			}
		>
			<InkFilter />
			<header className={styles.header}>
				<h1>Drawings</h1>
				<div className={styles.tools}>
					<input
						type="search"
						className={styles.search}
						aria-label="Search drawings"
						placeholder="Search…"
						value={query}
						onChange={(event) => {
							setQuery(event.target.value);
							// A question on a card the search hides would come back with it.
							close();
						}}
					/>
					<TagTray drawings={drawings} buttonRef={tagsButton} />
					<button
						ref={padButton}
						type="button"
						className={styles.padButton}
						aria-expanded={pad.open}
						aria-controls={pad.open ? "stamp-pad" : undefined}
						onClick={() => {
							close();
							if (pad.open) pad.close();
							else pad.start();
						}}
					>
						<StampIcon />
						Stamp drawings
					</button>
				</div>
			</header>
			{pad.open ? (
				<StampPad
					drawings={drawings}
					picked={pad.picked}
					nudges={pad.nudges}
					findRef={padFind}
					onPick={pad.pick}
					onGoToCards={goToCards}
					onClose={pad.close}
				/>
			) : null}
			<ActiveFilter
				buttonRef={tagsButton}
				searched={searched}
				shown={shown.length}
				total={drawings.length}
				lingering={lingering}
			/>
			{/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: arrow keys and type-to-find while stamping; the cards are the controls. */}
			<ul ref={listRef} className={styles.cards} aria-label="Drawings" onKeyDown={onCardsKey}>
				<NewDrawingCard
					creating={task?.kind === "create"}
					inert={pad.open}
					onStart={() => setTask({ kind: "create" })}
					onCreate={(name) => {
						close();
						onCreate(name);
					}}
					onCancel={close}
				/>
				{shown.map((drawing) =>
					pad.open ? (
						<StampableCard
							key={drawing.id}
							drawing={drawing}
							picked={pad.picked}
							fresh={pad.fresh === drawing.id}
							onStamp={() => {
								if (pad.picked) pad.stamp(drawing);
								else pad.nudge();
							}}
						/>
					) : (
						<DrawingCard
							key={drawing.id}
							drawing={drawing}
							task={
								task && task.kind !== "create" && task.id === drawing.id
									? task.kind
									: null
							}
							onOpen={onOpen}
							onStart={(kind) => setTask({ kind, id: drawing.id })}
							onEditTags={() => setEditingId(drawing.id)}
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
					),
				)}
			</ul>
			{/* Always rendered, so screen readers announce the message when it
			    appears. */}
			<p role="status" className={styles.status}>
				{shown.length === 0 ? noMatchMessage(searched, selected) : null}
			</p>
			{shown.length === 0 && narrowed ? (
				<button
					type="button"
					className={styles.showAll}
					onClick={() => {
						setQuery("");
						store.clearSelected();
					}}
				>
					Show all drawings
				</button>
			) : null}
			<p role="status" className={styles.sr}>
				{pad.message ||
					(narrowed && shown.length > 0
						? `${shown.length} of ${drawings.length} drawings shown.`
						: "")}
			</p>
			{editing ? (
				<DrawingTagsDialog
					drawing={editing}
					drawings={drawings}
					onClose={() => {
						setEditingId(null);
						// The card may have left the filter with the tag it lost.
						if (document.activeElement === document.body) {
							tagsButton.current?.focus();
						}
					}}
				/>
			) : null}
		</div>
	);
}

const orList = (tags: Tag[]) => {
	const labels = tags.map((tag) => tag.label);
	if (labels.length === 1) return `the ${labels[0]} tag`;
	return `${labels.slice(0, -1).join(", ")} or ${labels[labels.length - 1]}`;
};

/** Says why no drawing shows: what the search and the filter asked for together. */
function noMatchMessage(searched: string, selected: Tag[]) {
	if (searched && selected.length > 0) {
		return `No drawing with ${orList(selected)} has “${searched}” in its name.`;
	}
	if (searched) return `No drawing has “${searched}” in its name.`;
	if (selected.length > 0) return `No drawing has ${orList(selected)}.`;
	return null;
}

/** The tags of a card with the ones the filter selected first, so a match never hides behind "+N". */
const selectedFirst = (tags: Tag[], selected: readonly string[]) => [
	...tags.filter((tag) => selected.includes(tag.id)),
	...tags.filter((tag) => !selected.includes(tag.id)),
];

type NewDrawingCardProps = {
	/** Whether the card asks for the new drawing's name. */
	creating: boolean;
	/** While the stamp pad is open the blank sheet takes no clicks. */
	inert: boolean;
	onStart: () => void;
	onCreate: (name: string) => void;
	onCancel: () => void;
};

/** A blank sheet that asks for a name and creates the drawing. */
function NewDrawingCard({
	creating,
	inert,
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
		<li inert={inert} className={inert ? styles.resting : undefined}>
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

type DrawingCardProps = {
	drawing: DrawingSummary;
	/** The question the card asks below its sheet, if any. */
	task: CardTask | null;
	onOpen: (id: string | null) => void;
	onStart: (task: CardTask) => void;
	onEditTags: () => void;
	onRename: (name: string) => void;
	onDelete: () => void;
	onCancel: () => void;
};

function DrawingCard({
	drawing,
	task,
	onOpen,
	onStart,
	onEditTags,
	onRename,
	onDelete,
	onCancel,
}: DrawingCardProps) {
	const { id, name } = drawing;
	const { tagsOf, selectedTagIds } = useMockTags();
	const tags = selectedFirst(tagsOf(drawing), selectedTagIds);

	if (task === "rename" || task === "delete") {
		return (
			<li>
				<Sheet drawing={drawing} tags={tags} />
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
			<DrawingLink drawingId={id} onOpen={onOpen} className={styles.open}>
				<Sheet drawing={drawing} tags={tags} onShowAll={onEditTags} />
				<span className={styles.name}>{name}</span>
				{tags.length > 0 ? (
					<span className={styles.sr}>
						{`, tags: ${tags.map((tag) => tag.label).join(", ")}`}
					</span>
				) : null}
			</DrawingLink>
			<span className={styles.actions}>
				<button
					type="button"
					className={styles.icon}
					aria-label={`Change tags of ${name}`}
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

type StampableCardProps = {
	drawing: DrawingSummary;
	picked: Tag | null;
	/** This card was the last one clicked, so it plays the stamp's landing. */
	fresh: boolean;
	onStamp: () => void;
};

/** A card while the pad is open: a click stamps the picked tag or lifts it. */
function StampableCard({ drawing, picked, fresh, onStamp }: StampableCardProps) {
	const { tagsOf, selectedTagIds } = useMockTags();
	const all = selectedFirst(tagsOf(drawing), selectedTagIds);
	const stamped = picked !== null && all.some((tag) => tag.id === picked.id);
	// The picked tag shows as the large imprint, so the foot of the sheet skips it.
	const rest = all.filter((tag) => tag.id !== picked?.id);
	const landing = fresh ? styles.landed : "";
	const mark = picked ? (
		<Stamp
			label={picked.label}
			color={picked.color}
			seed={drawing.id + picked.id}
			size="large"
		/>
	) : null;

	return (
		<li>
			<button
				type="button"
				data-stampable={drawing.id}
				className={`${styles.open} ${styles.stampable}`}
				aria-pressed={picked ? stamped : undefined}
				aria-disabled={picked ? undefined : true}
				aria-label={
					picked
						? `Stamp ${drawing.name} with ${picked.label}`
						: `${drawing.name}: pick a tag on the stamp pad first`
				}
				onClick={onStamp}
			>
				<span className={`${styles.sheetFrame} ${stamped ? landing : ""}`}>
					<Sheet drawing={drawing} tags={rest}>
						{/* Under the pointer an unstamped card previews the stamp; a card just
						    lifted plays the lift first, and keyed so it plays once. */}
						{mark && !stamped ? (
							<span className={`${styles.imprint} ${styles.ghost}`}>{mark}</span>
						) : null}
						{mark && stamped ? (
							<span key="on" className={`${styles.imprint} ${landing}`}>
								{mark}
							</span>
						) : mark && fresh ? (
							<span key="off" className={`${styles.imprint} ${styles.lifted}`}>
								{mark}
							</span>
						) : null}
					</Sheet>
				</span>
				<span className={styles.name}>{drawing.name}</span>
			</button>
		</li>
	);
}

type SheetProps = {
	drawing: DrawingSummary;
	tags: Tag[];
	onShowAll?: () => void;
	children?: React.ReactNode;
};

/**
 * The drawing's preview on a sheet of paper, with its tags along the foot. A
 * sheet without a preview stays blank above them.
 */
function Sheet({ drawing, tags, onShowAll, children }: SheetProps) {
	const { selectedTagIds } = useMockTags();
	return (
		<span className={styles.sheet}>
			<PreviewImage drawing={drawing} />
			{children}
			<SheetStamps
				tags={tags}
				seed={drawing.id}
				matched={selectedTagIds}
				onShowAll={onShowAll}
			/>
		</span>
	);
}
