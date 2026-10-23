export type DrawingSummary = {
	id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
	/** Whether `GET /api/drawings/:id/preview` returns a PNG of the scene. */
	hasPreview: boolean;
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
