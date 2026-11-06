import { useSyncExternalStore } from "react";
import type { DrawingSummary } from "../../../../shared/types.ts";

/**
 * PoC only: tags live in this module's memory, so they survive opening a drawing
 * and coming back, and a reload restores the seed. The final solution starts from
 * scratch with real persistence.
 */

export const TAG_COLORS = [
	"red",
	"orange",
	"yellow",
	"green",
	"teal",
	"blue",
	"violet",
	"pink",
] as const;

export type TagColor = (typeof TAG_COLORS)[number];

export type Tag = { id: string; label: string; color: TagColor };

/** CSS variables of a tag's colour, as defined in `styles.css`. */
export const tagColorVars = (color: TagColor) => ({
	bg: `var(--tag-${color}-bg)`,
	ink: `var(--tag-${color}-ink)`,
	solid: `var(--tag-${color}-solid)`,
});

const MAX_LABEL_LENGTH = 30;

const SEED_TAGS: [string, TagColor][] = [
	["Work", "blue"],
	["Personal", "pink"],
	["Architecture", "violet"],
	["API", "teal"],
	["Database", "orange"],
	["Frontend", "green"],
	["Infrastructure", "red"],
	["Network", "teal"],
	["Security", "red"],
	["Sequence", "yellow"],
	["Wireframe", "blue"],
	["Sketch", "orange"],
	["Meeting notes", "yellow"],
	["Roadmap", "violet"],
	["Idea", "yellow"],
	["Draft", "orange"],
	["Done", "green"],
	["Home", "pink"],
	["Travel", "teal"],
	["Garden", "green"],
	["Recipes", "red"],
	["Learning", "blue"],
	["Book notes", "violet"],
	["Reference", "pink"],
];

/** Seed assignments by drawing name; `scripts/seed-poc-drawings.ts` creates the drawings. */
const SEED_ASSIGNMENTS: Record<string, string[]> = {
	"Auth flow": ["Work", "Security", "Sequence", "API"],
	"Billing service": ["Work", "Architecture", "API", "Database"],
	"Checkout wireframe": ["Work", "Frontend", "Wireframe", "Draft"],
	"Data model v2": ["Work", "Database", "Architecture"],
	"Deployment pipeline": ["Work", "Infrastructure", "Done"],
	"Design system map": ["Work", "Frontend", "Reference"],
	"Garden beds 2027": ["Personal", "Garden", "Sketch", "Home"],
	"Home network": ["Personal", "Home", "Network", "Infrastructure", "Done"],
	"Incident timeline": ["Work", "Meeting notes", "Sequence"],
	"Japan itinerary": ["Personal", "Travel", "Draft"],
	"Kitchen remodel": ["Personal", "Home", "Sketch", "Idea"],
	"Learning Rust": ["Personal", "Learning", "Reference"],
	"Onboarding flow": ["Work", "Frontend", "Wireframe", "Done"],
	"Q1 roadmap": ["Work", "Roadmap", "Meeting notes"],
	"Reading list map": ["Personal", "Book notes"],
	"Sourdough timing": ["Personal", "Recipes", "Sequence"],
	"Team offsite ideas": ["Work", "Idea"],
	"Thinking in systems": ["Personal", "Book notes", "Learning"],
	"Untitled sketch": [],
	Whiteboard: [],
};

let nextId = 1;
const newId = () => `tag-${nextId++}`;

type State = {
	tags: Tag[];
	/** Tag IDs by drawing ID; drawings not in here fall back to the seed by name. */
	assignments: Record<string, string[]>;
	selectedTagIds: string[];
	query: string;
};

let state: State = {
	tags: SEED_TAGS.map(([label, color]) => ({ id: newId(), label, color })),
	assignments: {},
	selectedTagIds: [],
	query: "",
};

const listeners = new Set<() => void>();

const setState = (next: Partial<State>) => {
	state = { ...state, ...next };
	for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

const seededTagIds = (name: string) =>
	(SEED_ASSIGNMENTS[name] ?? []).flatMap((label) => {
		const tag = state.tags.find((candidate) => candidate.label === label);
		return tag ? [tag.id] : [];
	});

const tagIdsOf = (drawing: DrawingSummary) =>
	state.assignments[drawing.id] ?? seededTagIds(drawing.name);

/** The error to show for a label, or null if it is valid. */
function labelError(label: string, ignoredId?: string): string | null {
	const trimmed = label.trim();
	if (!trimmed) return "Enter a label.";
	if (trimmed.length > MAX_LABEL_LENGTH) {
		return `Use at most ${MAX_LABEL_LENGTH} characters.`;
	}
	const taken = state.tags.some(
		(tag) =>
			tag.id !== ignoredId &&
			tag.label.toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
	);
	return taken ? `A tag named “${trimmed}” already exists.` : null;
}

/** Sorted by label, the order every tag list should show. */
const byLabel = (a: Tag, b: Tag) =>
	a.label.localeCompare(b.label, undefined, { sensitivity: "base" });

const actions = {
	/** Sets the landing page's search text. It survives opening a drawing. */
	setQuery: (query: string) => setState({ query }),

	toggleSelected: (tagId: string) =>
		setState({
			selectedTagIds: state.selectedTagIds.includes(tagId)
				? state.selectedTagIds.filter((id) => id !== tagId)
				: [...state.selectedTagIds, tagId],
		}),

	clearSelected: () => setState({ selectedTagIds: [] }),

	/** Returns the new tag, or the error to show. */
	createTag: (label: string, color: TagColor): Tag | { error: string } => {
		const error = labelError(label);
		if (error) return { error };
		const tag = { id: newId(), label: label.trim(), color };
		setState({ tags: [...state.tags, tag].sort(byLabel) });
		return tag;
	},

	/** Returns the error to show, or null if the tag changed. */
	updateTag: (id: string, label: string, color: TagColor): string | null => {
		const error = labelError(label, id);
		if (error) return error;
		setState({
			tags: state.tags
				.map((tag) =>
					tag.id === id ? { ...tag, label: label.trim(), color } : tag,
				)
				.sort(byLabel),
		});
		return null;
	},

	/** Deletes the tag and removes it from every drawing and from the filter. */
	deleteTag: (id: string, drawings: DrawingSummary[]) => {
		const assignments: Record<string, string[]> = {};
		// Freeze the seed first: it looks tags up by label, and the tag goes away.
		for (const drawing of drawings) {
			assignments[drawing.id] = tagIdsOf(drawing).filter((t) => t !== id);
		}
		setState({
			tags: state.tags.filter((tag) => tag.id !== id),
			assignments,
			selectedTagIds: state.selectedTagIds.filter((t) => t !== id),
		});
	},

	/** Adds the tag to the drawing, or removes it if the drawing has it. */
	toggleDrawingTag: (drawing: DrawingSummary, tagId: string) => {
		const current = tagIdsOf(drawing);
		setState({
			assignments: {
				...state.assignments,
				[drawing.id]: current.includes(tagId)
					? current.filter((id) => id !== tagId)
					: [...current, tagId],
			},
		});
	},
};

/** The drawing's tags, sorted by label. */
const tagsOf = (drawing: DrawingSummary) => {
	const ids = tagIdsOf(drawing);
	return state.tags.filter((tag) => ids.includes(tag.id));
};

/**
 * The drawings that have any selected tag, or every drawing when none is
 * selected. Apply it together with `searchByName`.
 */
const filterBySelectedTags = (drawings: DrawingSummary[]) =>
	state.selectedTagIds.length === 0
		? drawings
		: drawings.filter((drawing) =>
				tagIdsOf(drawing).some((id) => state.selectedTagIds.includes(id)),
			);

/** How many of the drawings have the tag, for counts in a filter. */
const drawingCount = (drawings: DrawingSummary[], tagId: string) =>
	drawings.filter((drawing) => tagIdsOf(drawing).includes(tagId)).length;

state = { ...state, tags: [...state.tags].sort(byLabel) };

/** The mock tag store. Re-renders the component when anything in it changes. */
export function useMockTags() {
	const current = useSyncExternalStore(subscribe, () => state);
	return {
		tags: current.tags,
		selectedTagIds: current.selectedTagIds,
		query: current.query,
		tagsOf,
		filterBySelectedTags,
		drawingCount,
		...actions,
	};
}
