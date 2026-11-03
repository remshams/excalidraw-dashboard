import type {
	Drawing,
	DrawingSummary,
	UpdateDrawingRequest,
} from "../../shared/types.ts";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
	const response = await fetch(`/api${path}`, {
		headers: { "Content-Type": "application/json" },
		...init,
	});
	if (!response.ok) {
		throw new Error(
			`${init.method ?? "GET"} ${path} failed with ${response.status}`,
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
