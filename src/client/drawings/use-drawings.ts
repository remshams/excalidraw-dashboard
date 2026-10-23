import { useCallback, useEffect, useState } from "react";
import type { DrawingSummary } from "../../shared/types.ts";
import {
	createDrawing,
	deleteDrawing,
	listDrawings,
	updateDrawing,
} from "./api.ts";

const byName = (a: DrawingSummary, b: DrawingSummary) =>
	a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

/** Loads the drawing list and keeps it sorted by name across changes. */
export function useDrawings(onError: (error: unknown) => void) {
	const [drawings, setDrawings] = useState<DrawingSummary[]>([]);

	useEffect(() => {
		listDrawings().then(setDrawings, onError);
	}, [onError]);

	const replace = useCallback((summary: DrawingSummary) => {
		setDrawings((list) =>
			list.map((d) => (d.id === summary.id ? summary : d)).sort(byName),
		);
	}, []);

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
		setDrawings((list) => list.filter((d) => d.id !== id));
	};

	return { drawings, replace, create, rename, remove };
}
