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

/** The types of the shapes in a drawing's stored scene, without deleted ones. */
export async function storedShapeTypes(
	request: APIRequestContext,
	id: string,
): Promise<string[]> {
	const response = await request.get(`/api/drawings/${id}`);
	const drawing: StoredDrawing = await response.json();
	if (!drawing.scene) return [];
	const elements: SceneElement[] = JSON.parse(drawing.scene).elements;
	return elements
		.filter((element) => !element.isDeleted)
		.map((element) => element.type);
}
