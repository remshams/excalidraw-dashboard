import type {
	Drawing,
	DrawingSummary,
	UpdateDrawingRequest,
} from "../../shared/types.ts";

async function request<T>(
	path: string,
	init: RequestInit = {},
	contentType = "application/json",
): Promise<T> {
	const response = await fetch(`/api${path}`, {
		...init,
		headers: { "Content-Type": contentType },
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

/** URL of the PNG preview. It changes with every update, so browsers can cache it. */
export const previewUrl = ({ id, updatedAt }: DrawingSummary) =>
	`/api/drawings/${id}/preview?v=${encodeURIComponent(updatedAt)}`;

export const savePreview = (id: string, png: Blob) =>
	request<DrawingSummary>(
		`/drawings/${id}/preview`,
		{ method: "PUT", body: png },
		"image/png",
	);

export const deletePreview = (id: string) =>
	request<DrawingSummary>(`/drawings/${id}/preview`, { method: "DELETE" });
