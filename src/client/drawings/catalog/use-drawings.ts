import { useEffect, useRef, useState } from "react";
import type { DrawingSummary } from "#shared/drawings.ts";
import {
	createDrawing,
	deleteDrawing,
	listDrawings,
	setDrawingTags,
	updateDrawing,
} from "../api.ts";

const byName = (a: DrawingSummary, b: DrawingSummary) =>
	a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

/** Loads the drawing list and keeps it sorted by name across changes. */
export function useDrawings(onError: (error: unknown) => void) {
	const [drawings, setDrawings] = useState<DrawingSummary[]>([]);
	const deletedIds = useRef(new Set<string>());

	useEffect(() => {
		listDrawings().then(setDrawings, onError);
	}, [onError]);

	const replace = (summary: DrawingSummary) => {
		setDrawings((list) =>
			list.map((d) => (d.id === summary.id ? summary : d)).sort(byName),
		);
	};

	const create = async (name: string) => {
		const created = await createDrawing(name);
		setDrawings((list) => [...list, created].sort(byName));
		return created;
	};

	const rename = async (id: string, name: string) => {
		replace(await updateDrawing(id, { name }));
	};

	const remove = async (id: string) => {
		await deleteDrawing(id);
		deletedIds.current.add(id);
		setDrawings((list) => list.filter((d) => d.id !== id));
	};

	/** Changes the tag IDs of one drawing in the list, from the ones it has now. */
	const changeTagIds = (id: string, change: (tagIds: string[]) => string[]) => {
		setDrawings((list) =>
			list.map((d) => (d.id === id ? { ...d, tagIds: change(d.tagIds) } : d)),
		);
	};

	/**
	 * Gives a drawing the tag, or takes it off, and shows that before the server
	 * answers, so a second click right after builds on the first. If the server
	 * refuses, only this change goes back, and the promise rejects.
	 */
	const toggleTag = async ({ id, tagIds }: DrawingSummary, tagId: string) => {
		const toggle = (ids: string[]) =>
			ids.includes(tagId) ? ids.filter((t) => t !== tagId) : [...ids, tagId];
		changeTagIds(id, toggle);
		try {
			await setDrawingTags(id, toggle(tagIds));
		} catch (cause) {
			changeTagIds(id, toggle);
			throw cause;
		}
	};

	/** Takes a deleted tag off the drawings that carry it, as the server already did. */
	const forgetTag = (tagId: string) => {
		setDrawings((list) =>
			list.map((d) => ({
				...d,
				tagIds: d.tagIds.filter((id) => id !== tagId),
			})),
		);
	};

	/** Whether this app deleted the drawing, so later errors about it don't matter. */
	const wasDeleted = (id: string) => deletedIds.current.has(id);

	return {
		drawings,
		replace,
		create,
		rename,
		remove,
		toggleTag,
		forgetTag,
		wasDeleted,
	};
}
