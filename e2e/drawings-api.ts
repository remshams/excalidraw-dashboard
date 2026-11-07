import { type APIRequestContext, expect } from "@playwright/test";

// The drawings HTTP API, which tests use to set up drawings and to read what
// the server stored. The types cover only the fields the tests read.

type StoredDrawing = { id: string; name: string; scene: string | null };

type SceneElement = { type: string; isDeleted?: boolean };

/** Creates a drawing with `POST /api/drawings` and returns its ID. */
export async function createDrawingThroughApi(
	request: APIRequestContext,
	name: string,
): Promise<string> {
	const response = await request.post("/api/drawings", { data: { name } });
	expect(response.status()).toBe(201);
	const drawing: StoredDrawing = await response.json();
	return drawing.id;
}

/** Deletes a drawing with `DELETE /api/drawings/:id`, as another tab would. */
export async function deleteDrawingThroughApi(
	request: APIRequestContext,
	id: string,
): Promise<void> {
	const response = await request.delete(`/api/drawings/${id}`);
	expect(response.ok()).toBe(true);
}

/** Stores a scene with `PUT /api/drawings/:id`, as another tab would. */
export async function storeSceneThroughApi(
	request: APIRequestContext,
	id: string,
	scene: string,
): Promise<void> {
	const response = await request.put(`/api/drawings/${id}`, {
		data: { scene },
	});
	expect(response.ok()).toBe(true);
}

/** A drawing's stored scene, or null if it has none. */
export async function storedScene(
	request: APIRequestContext,
	id: string,
): Promise<string | null> {
	const response = await request.get(`/api/drawings/${id}`);
	const drawing: StoredDrawing = await response.json();
	return drawing.scene;
}

/** The types of the shapes in a drawing's stored scene, without deleted ones. */
export async function storedShapeTypes(
	request: APIRequestContext,
	id: string,
): Promise<string[]> {
	const scene = await storedScene(request, id);
	if (!scene) return [];
	const elements: SceneElement[] = JSON.parse(scene).elements;
	return elements
		.filter((element) => !element.isDeleted)
		.map((element) => element.type);
}

/**
 * The media type of a drawing's stored preview, or null if it has none. The
 * request context keeps no HTTP cache, so the URL needs no version.
 */
export async function storedPreviewType(
	request: APIRequestContext,
	id: string,
): Promise<string | null> {
	const response = await request.get(`/api/drawings/${id}/preview`);
	if (response.status() === 404) return null;
	expect(response.ok()).toBe(true);
	expect((await response.body()).length).toBeGreaterThan(0);
	return response.headers()["content-type"] ?? null;
}

// A drawing keeps the IDs of its tags, so assigning them is a drawing route.

type StoredSummary = { id: string; updatedAt: string; tagIds: string[] };

/** Replaces a drawing's tags with `PUT /api/drawings/:id/tags`. */
export async function assignTagsThroughApi(
	request: APIRequestContext,
	id: string,
	tagIds: string[],
): Promise<void> {
	const response = await request.put(`/api/drawings/${id}/tags`, {
		data: { tagIds },
	});
	expect(response.ok()).toBe(true);
}

/** A drawing's summary as the list of drawings shows it. */
export async function storedSummary(
	request: APIRequestContext,
	id: string,
): Promise<StoredSummary | undefined> {
	const response = await request.get("/api/drawings");
	const drawings: StoredSummary[] = await response.json();
	return drawings.find((drawing) => drawing.id === id);
}
