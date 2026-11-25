import { useEffect, useRef, useState } from "react";
import type { DrawingSummary } from "#shared/drawings.ts";
import {
	createDrawing,
	deleteDrawing,
	listDrawings,
	setDrawingTags,
	updateDrawing,
} from "../api.ts";

// Scratchpads have no name and sort first; the landing page sorts them itself.
const byName = (a: DrawingSummary, b: DrawingSummary) =>
	(a.name ?? "").localeCompare(b.name ?? "", undefined, {
		sensitivity: "base",
	});

/** Loads the drawing list and keeps it sorted by name across changes. */
export function useDrawings(onError: (error: unknown) => void) {
	const [drawings, setDrawings] = useState<DrawingSummary[]>([]);
	const deletedIds = useRef(new Set<string>());

	useEffect(() => {
		// A new scratchpad's first save can land while the list loads; the list
		// already has it then, and it is newer than the loaded copy.
		listDrawings().then(
			(loaded) =>
				setDrawings((current) => {
					const known = new Set(current.map(({ id }) => id));
					const fresh = loaded.filter(
						({ id }) => !known.has(id) && !deletedIds.current.has(id),
					);
					return [...fresh, ...current].sort(byName);
				}),
			onError,
		);
	}, [onError]);

	/**
	 * Takes in the summary a save or a rename answered with, and adds a new
	 * scratchpad's first save to the list. The drawing keeps the tags the list
	 * has: only `toggleTag` and `forgetTag` change them, and a save that started
	 * before a tag change answers with the old ones. It also keeps a name the list
	 * has over no name: a drawing never loses its name, so an answer without one
	 * started before the rename.
	 */
	const replace = (summary: DrawingSummary) => {
		if (deletedIds.current.has(summary.id)) return;
		setDrawings((list) => {
			const listed = list.find((d) => d.id === summary.id);
			const next = listed
				? {
						...summary,
						name: summary.name ?? listed.name,
						tagIds: listed.tagIds,
					}
				: summary;
			return [...list.filter((d) => d !== listed), next].sort(byName);
		});
	};

	const create = async (name: string) => {
		const created = await createDrawing({ name });
		setDrawings((list) => [...list, created].sort(byName));
		return created;
	};

	/** Gives the listed drawing the name `to` while it still has the name `from`. */
	const swapName = (id: string, from: string | null, to: string | null) => {
		setDrawings((list) =>
			list
				.map((d) => (d.id === id && d.name === from ? { ...d, name: to } : d))
				.sort(byName),
		);
	};

	/**
	 * Shows the new name before the server answers, so a scratchpad being saved
	 * leaves the Scratchpads row, and Discard can't reach it, at once. A refused
	 * rename brings the old name back, unless something changed it since, and
	 * rejects.
	 */
	const rename = async (id: string, name: string) => {
		const listed = drawings.find((d) => d.id === id);
		if (listed) swapName(id, listed.name, name);
		try {
			replace(await updateDrawing(id, { name }));
		} catch (error) {
			if (listed) swapName(id, name, listed.name);
			throw error;
		}
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

	/** Deletes the drawings, one request each. Rejects if any of them fails. */
	const removeAll = (ids: string[]) => Promise.all(ids.map(remove));

	return {
		drawings,
		replace,
		create,
		rename,
		remove,
		removeAll,
		toggleTag,
		forgetTag,
		wasDeleted,
	};
}
