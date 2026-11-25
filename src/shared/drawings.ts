export type DrawingSummary = {
	id: string;
	/** The drawing's name, or null for a scratchpad: a drawing nobody has named yet. */
	name: string | null;
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
