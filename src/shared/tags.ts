/** The open-color hues a tag can have. Each has a light and a dark variant. */
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

/** Counted in UTF-16 code units. */
export const MAX_TAG_LABEL_LENGTH = 30;

export type Tag = {
	id: string;
	label: string;
	color: TagColor;
};

/** The body of `POST /api/tags` and `PUT /api/tags/:id`. */
export type TagRequest = {
	label: string;
	color: TagColor;
};

/** The body of `PUT /api/drawings/:id/tags`. */
export type DrawingTagsRequest = {
	tagIds: string[];
};

type TagLabelProblem = "empty" | "too-long";

/** What is wrong with a label, or null if it is valid. Uniqueness needs the other tags, so it is checked apart. */
export function tagLabelProblem(label: string): TagLabelProblem | null {
	const trimmed = label.trim();
	if (trimmed === "") return "empty";
	return trimmed.length > MAX_TAG_LABEL_LENGTH ? "too-long" : null;
}

/** Why a label with this problem is rejected, in the words client and server share. */
export const tagLabelMessage = (problem: TagLabelProblem): string =>
	problem === "empty"
		? "A tag needs a label"
		: `A tag label has at most ${MAX_TAG_LABEL_LENGTH} characters`;

/** Why a label another tag has is rejected. */
export const labelTakenMessage = (label: string): string =>
	`A tag named "${label}" already exists`;

/** Two labels with the same key name the same tag, whatever their case. */
export const tagLabelKey = (label: string): string =>
	label.trim().toLowerCase();

export const isTagColor = (value: unknown): value is TagColor =>
	(TAG_COLORS as readonly unknown[]).includes(value);
