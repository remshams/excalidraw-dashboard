export type DrawingSummary = {
	id: string;
	name: string;
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
	name: string;
};

export type UpdateDrawingRequest = {
	name?: string;
	scene?: string;
};
