import type { Drawing, DrawingSummary } from "#shared/drawings.ts";

/** A drawing the user has named, as opposed to a scratchpad. */
export type SavedDrawing = DrawingSummary & { name: string };

export const isSaved = (drawing: DrawingSummary): drawing is SavedDrawing =>
	drawing.name !== null;

/** The scratchpads among the drawings, most recently edited first. */
export const scratchpadsOf = (drawings: DrawingSummary[]): DrawingSummary[] =>
	drawings
		.filter((drawing) => !isSaved(drawing))
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

/** When the scratchpad was last edited, such as "25 Nov 2026, 16:40". */
export const editedAt = ({ updatedAt }: DrawingSummary): string =>
	new Date(updatedAt).toLocaleString(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	});

/** What a scratchpad's card and actions are called, as it has no name. */
export const scratchpadName = (scratchpad: DrawingSummary): string =>
	`Scratchpad edited ${editedAt(scratchpad)}`;

/**
 * A scratchpad that the server doesn't have yet. The editor stores it, with this
 * ID, on its first save.
 */
export function newScratchpad(id: string): Drawing {
	const now = new Date().toISOString();
	return {
		id,
		name: null,
		scene: null,
		createdAt: now,
		updatedAt: now,
		previewUpdatedAt: null,
		tagIds: [],
	};
}

/**
 * A random UUID for a new scratchpad. `crypto.randomUUID` needs a secure
 * context, which the app lacks when served over plain HTTP on a local network.
 */
export function newScratchpadId(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
	bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
	const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
	const part = (from: number, to: number) => hex.slice(from, to).join("");
	return [part(0, 4), part(4, 6), part(6, 8), part(8, 10), part(10, 16)].join(
		"-",
	);
}
