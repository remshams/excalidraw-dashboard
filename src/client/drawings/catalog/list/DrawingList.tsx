import { type CSSProperties, useEffect, useRef, useState } from "react";
import type { DrawingSummary } from "../../../../shared/types.ts";
import { DrawingLink } from "../../DrawingLink.tsx";
import { searchByName } from "../../search.ts";
import { DeleteConfirmation } from "../DeleteConfirmation.tsx";
import { PencilIcon, PlusIcon, StampIcon, TrashIcon } from "../icons.tsx";
import { NameField } from "../NameField.tsx";
import { PreviewImage } from "../PreviewImage.tsx";
import { type Tag, useMockTags } from "../tags/mock-tags.ts";
import { InkFilter, SheetStamps, Stamp } from "../tags/Stamp.tsx";
import { StampBanner } from "../tags/StampBanner.tsx";
import { StampEditor } from "../tags/StampEditor.tsx";
import { ActiveStamps, StampFilter } from "../tags/StampFilter.tsx";
import { useStampHand } from "../tags/use-stamp-hand.ts";
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
	const stampsButton = useRef<HTMLButtonElement>(null);
	const search = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLUListElement>(null);
	const hand = useStampHand(() => stampsButton.current?.focus());
	const close = () => setTask(null);

	// A question on a card the filter hides would come back with it.
	// biome-ignore lint/correctness/useExhaustiveDependencies: runs when the filter changes.
	useEffect(() => setTask(null), [selectedTagIds]);

	// With a stamp in hand, keyboard users start at the first card.
	const heldId = hand.held?.id;
	useEffect(() => {
		if (heldId) listRef.current?.querySelector<HTMLElement>("[data-stampable]")?.focus();
	}, [heldId]);

	const filtered = store.filterBySelectedTags(drawings);
	const inView = hand.held
		? drawings.filter(
				(drawing) => filtered.includes(drawing) || hand.touched.has(drawing.id),
			)
		: filtered;
	const shown = searchByName(inView, query);
	const searched = query.trim();
	const selected = tags.filter((tag) => selectedTagIds.includes(tag.id));
	const editing = drawings.find((drawing) => drawing.id === editingId);

	return (
		<div
			className={styles.list}
			style={
				hand.cursor
					? ({ "--stamp-cursor": hand.cursor } as CSSProperties)
					: undefined
			}
		>
			<InkFilter />
			<header className={styles.header}>
				<h1>Drawings</h1>
				<div className={styles.tools}>
					<input
						ref={search}
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
					<StampFilter
						drawings={drawings}
						buttonRef={stampsButton}
						onPickUp={(tag) => {
							close();
							hand.pickUp(tag);
						}}
					/>
				</div>
			</header>
			<ActiveStamps buttonRef={stampsButton} />
			{hand.held ? (
				<StampBanner
					tag={hand.held}
					count={store.drawingCount(drawings, hand.held.id)}
					onPutDown={hand.putDown}
				/>
			) : null}
			<ul ref={listRef} aria-label="Drawings">
				<NewDrawingCard
					creating={task?.kind === "create"}
					inert={hand.held !== null}
					onStart={() => setTask({ kind: "create" })}
					onCreate={(name) => {
						close();
						onCreate(name);
					}}
					onCancel={close}
				/>
				{shown.map((drawing) =>
					hand.held ? (
						<StampableCard
							key={drawing.id}
							drawing={drawing}
							held={hand.held}
							fresh={hand.fresh === drawing.id}
							onStamp={() => hand.stamp(drawing)}
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
							onEditStamps={() => setEditingId(drawing.id)}
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
			<p role="status" className={styles.sr}>
				{hand.message}
			</p>
			{editing ? (
				<StampEditor
					drawing={editing}
					drawings={drawings}
					onClose={() => {
						setEditingId(null);
						// The card may have left the filter with the stamp it lost.
						if (document.activeElement === document.body) {
							stampsButton.current?.focus();
						}
					}}
				/>
			) : null}
		</div>
	);
}

/** Says why no drawing shows, or nothing if nothing narrows the list. */
function noMatchMessage(searched: string, selected: Tag[]) {
	const stamps =
		selected.length === 1
			? `the ${selected[0].label} stamp`
			: "any of the selected stamps";
	if (searched && selected.length > 0) {
		return `No drawing named “${searched}” has ${stamps}.`;
	}
	if (searched) return `No drawing is named “${searched}”.`;
	if (selected.length > 0) return `No drawing has ${stamps}.`;
	return null;
}

type NewDrawingCardProps = {
	/** Whether the card asks for the new drawing's name. */
	creating: boolean;
	/** With a stamp in hand the blank sheet takes no clicks. */
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
	onEditStamps: () => void;
	onRename: (name: string) => void;
	onDelete: () => void;
	onCancel: () => void;
};

function DrawingCard({
	drawing,
	task,
	onOpen,
	onStart,
	onEditStamps,
	onRename,
	onDelete,
	onCancel,
}: DrawingCardProps) {
	const { id, name } = drawing;
	const tags = useMockTags().tagsOf(drawing);

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
				<Sheet drawing={drawing} tags={tags} onShowAll={onEditStamps} />
				<span className={styles.name}>{name}</span>
				{tags.length > 0 ? (
					<span className={styles.sr}>
						{`, stamps: ${tags.map((tag) => tag.label).join(", ")}`}
					</span>
				) : null}
			</DrawingLink>
			<span className={styles.actions}>
				<button
					type="button"
					className={styles.icon}
					aria-label={`Change stamps on ${name}`}
					title="Change stamps"
					onClick={onEditStamps}
				>
					<StampIcon />
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
	held: Tag;
	/** This card was the last one clicked, so it plays the stamp's landing. */
	fresh: boolean;
	onStamp: () => void;
};

/** A card while a stamp is in hand: a click stamps it or lifts the stamp. */
function StampableCard({ drawing, held, fresh, onStamp }: StampableCardProps) {
	const tags = useMockTags().tagsOf(drawing);
	const stamped = tags.some((tag) => tag.id === held.id);
	const landing = fresh ? styles.landed : "";
	const mark = (
		<Stamp
			label={held.label}
			color={held.color}
			seed={drawing.id + held.id}
			size="large"
		/>
	);

	return (
		<li>
			<button
				type="button"
				data-stampable
				className={`${styles.open} ${styles.stampable}`}
				aria-pressed={stamped}
				aria-label={`${drawing.name}: ${held.label} stamp`}
				onClick={onStamp}
			>
				<span className={`${styles.sheetFrame} ${stamped ? landing : ""}`}>
					<Sheet drawing={drawing} tags={tags}>
						{/* Under the pointer an unstamped card previews the stamp; a card just
						    lifted plays the lift first, and keyed so it plays once. */}
						{stamped ? null : (
							<span className={`${styles.imprint} ${styles.ghost}`}>{mark}</span>
						)}
						{stamped ? (
							<span key="on" className={`${styles.imprint} ${landing}`}>
								{mark}
							</span>
						) : fresh ? (
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
 * The drawing's preview on a sheet of paper, with its stamps along the foot. A
 * sheet without a preview stays blank above them.
 */
function Sheet({ drawing, tags, onShowAll, children }: SheetProps) {
	return (
		<span className={styles.sheet}>
			<PreviewImage drawing={drawing} />
			{children}
			<SheetStamps tags={tags} seed={drawing.id} onShowAll={onShowAll} />
		</span>
	);
}
