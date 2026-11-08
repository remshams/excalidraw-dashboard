import { useEffect, useState } from "react";
import type { Tag } from "../../../../shared/tags.ts";
import { listTags } from "../../api.ts";

const byLabel = (a: Tag, b: Tag) =>
	a.label.localeCompare(b.label, undefined, { sensitivity: "base" });

/**
 * Loads the tags and sorts them by label as the reader expects, not by code point.
 * The list is null until they arrive, so "none yet" and "not loaded" stay apart.
 */
export function useTags(onError: (error: unknown) => void) {
	const [tags, setTags] = useState<Tag[] | null>(null);

	useEffect(() => {
		listTags().then((loaded) => setTags(loaded.sort(byLabel)), onError);
	}, [onError]);

	return { tags };
}
