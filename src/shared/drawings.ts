/** What every drawing summary has, whether the drawing has a name or not. */
type DrawingSummaryFields = {
	id: string;
	createdAt: string;
	updatedAt: string;
	/**
	 * When the PNG preview was last set, or null if the drawing has none. Clients
	 * must add it to the preview URL as a version; see ADR 0001.
	 */
	previewUpdatedAt: string | null;
	/** The IDs of the drawing's tags, sorted by ID. Clients sort them for display. */
	tagIds: string[];
};

/** A drawing the user has named. */
export type SavedDrawingSummary = DrawingSummaryFields & { name: string };

/**
 * A scratchpad: a drawing nobody has named yet. The server refuses tags for it,
 * so its `tagIds` stay empty; the type doesn't enforce that.
 */
export type ScratchpadSummary = DrawingSummaryFields & { name: null };

/** A drawing without its scene. `name` tells a saved drawing from a scratchpad. */
export type DrawingSummary = SavedDrawingSummary | ScratchpadSummary;

export type Drawing = DrawingSummary & {
	/** Serialized Excalidraw scene (output of `serializeAsJSON`), or null for a new drawing. */
	scene: string | null;
};

export type CreateDrawingRequest = {
	/** The ID the client chose, a UUID. The server picks one when it is absent. */
	id?: string;
	/** A blank or absent name makes the drawing a scratchpad. */
	name?: string;
	/** The first scene, for a scratchpad stored on its first edit. */
	scene?: string;
};

export type UpdateDrawingRequest = {
	name?: string;
	scene?: string;
};
