import type {
	Drawing,
	DrawingSummary,
	UpdateDrawingRequest,
} from "../../shared/drawings.ts";
import type { DrawingTagsRequest, Tag, TagRequest } from "../../shared/tags.ts";

/** A request the server answered with an error, and the reason it gave. */
export class ApiError extends Error {
	readonly status: number;
	readonly text: string;

	constructor(message: string, status: number, text: string) {
		super(message);
		this.status = status;
		this.text = text;
	}
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
	const response = await fetch(`/api${path}`, {
		headers: { "Content-Type": "application/json" },
		...init,
	});
	if (!response.ok) {
		throw new ApiError(
			`${init.method ?? "GET"} ${path} failed with ${response.status}`,
			response.status,
			await response.text(),
		);
	}
	return response.status === 204 ? (undefined as T) : response.json();
}

export const listDrawings = () => request<DrawingSummary[]>("/drawings");

export const getDrawing = (id: string) => request<Drawing>(`/drawings/${id}`);

export const createDrawing = (name: string) =>
	request<Drawing>("/drawings", {
		method: "POST",
		body: JSON.stringify({ name }),
	});

export const updateDrawing = (id: string, changes: UpdateDrawingRequest) =>
	request<DrawingSummary>(`/drawings/${id}`, {
		method: "PUT",
		body: JSON.stringify(changes),
	});

export const deleteDrawing = (id: string) =>
	request<void>(`/drawings/${id}`, { method: "DELETE" });

export const savePreview = (id: string, png: Blob) =>
	request<DrawingSummary>(`/drawings/${id}/preview`, {
		method: "PUT",
		body: png,
		headers: { "Content-Type": "image/png" },
	});

export const deletePreview = (id: string) =>
	request<DrawingSummary>(`/drawings/${id}/preview`, { method: "DELETE" });

/** Gives the drawing exactly these tags. Its `updatedAt` stays the same. */
export const setDrawingTags = (id: string, tagIds: string[]) =>
	request<DrawingSummary>(`/drawings/${id}/tags`, {
		method: "PUT",
		body: JSON.stringify({ tagIds } satisfies DrawingTagsRequest),
	});

export const listTags = () => request<Tag[]>("/tags");

export const createTag = (tag: TagRequest) =>
	request<Tag>("/tags", { method: "POST", body: JSON.stringify(tag) });

export const updateTag = (id: string, tag: TagRequest) =>
	request<Tag>(`/tags/${id}`, { method: "PUT", body: JSON.stringify(tag) });

export const deleteTag = (id: string) =>
	request<void>(`/tags/${id}`, { method: "DELETE" });

/**
 * The URL of a drawing's PNG preview, or null if it has none. It carries
 * `previewUpdatedAt` as a version, because the server lets browsers cache a
 * preview forever (ADR 0001).
 */
export const previewUrl = ({ id, previewUpdatedAt }: DrawingSummary) =>
	previewUpdatedAt === null
		? null
		: `/api/drawings/${id}/preview?v=${encodeURIComponent(previewUpdatedAt)}`;
