import { type APIRequestContext, expect } from "@playwright/test";

// The tags HTTP API, which tests use to manage tags and to read what the server
// stored. Tags belong to the dashboard; `drawings-api.ts` assigns them to a
// drawing.

type StoredTag = { id: string; label: string; color: string };

/** Creates a tag with `POST /api/tags` and returns its ID. */
export async function createTagThroughApi(
	request: APIRequestContext,
	label: string,
	color = "blue",
): Promise<string> {
	const response = await request.post("/api/tags", {
		data: { label, color },
	});
	expect(response.status()).toBe(201);
	const tag: StoredTag = await response.json();
	return tag.id;
}

/** Changes a tag's label and colour with `PUT /api/tags/:id`. */
export async function changeTagThroughApi(
	request: APIRequestContext,
	id: string,
	label: string,
	color: string,
): Promise<void> {
	const response = await request.put(`/api/tags/${id}`, {
		data: { label, color },
	});
	expect(response.ok()).toBe(true);
}

/** Deletes a tag with `DELETE /api/tags/:id`. */
export async function deleteTagThroughApi(
	request: APIRequestContext,
	id: string,
): Promise<void> {
	const response = await request.delete(`/api/tags/${id}`);
	expect(response.status()).toBe(204);
}

/** The stored tag with the ID, or undefined if there is none. */
export async function storedTag(
	request: APIRequestContext,
	id: string,
): Promise<StoredTag | undefined> {
	const response = await request.get("/api/tags");
	const tags: StoredTag[] = await response.json();
	return tags.find((tag) => tag.id === id);
}
