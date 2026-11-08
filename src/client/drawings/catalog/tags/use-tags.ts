import { useCallback, useEffect, useState } from "react";
import type { Tag, TagRequest } from "../../../../shared/tags.ts";
import {
	ApiError,
	createTag,
	deleteTag,
	listTags,
	updateTag,
} from "../../api.ts";

const byLabel = (a: Tag, b: Tag) =>
	a.label.localeCompare(b.label, undefined, { sensitivity: "base" });

/** The changes a user can make to the tags. Each rejects when the server refuses. */
export type TagChanges = {
	create: (request: TagRequest) => Promise<Tag>;
	update: (id: string, request: TagRequest) => Promise<Tag>;
	remove: (id: string) => Promise<void>;
};

/**
 * Loads the tags and sorts them by label as the reader expects, not by code point.
 * The list is null until they arrive, so "none yet" and "not loaded" stay apart.
 * `onGone` hears of a tag that no longer exists, deleted here or elsewhere.
 */
export function useTags(
	onError: (error: unknown) => void,
	onGone: (id: string) => void,
) {
	const [tags, setTags] = useState<Tag[] | null>(null);

	const reload = useCallback(() => {
		listTags().then((loaded) => setTags(loaded.sort(byLabel)), onError);
	}, [onError]);

	useEffect(reload, [reload]);

	/** A refusal means another tab changed the tags, so they reload. */
	const reloadingOnRefusal = async <T>(change: Promise<T>, id?: string) => {
		try {
			return await change;
		} catch (cause) {
			const status = cause instanceof ApiError ? cause.status : null;
			if (status === 404 || status === 409) reload();
			if (status === 404 && id) onGone(id);
			throw cause;
		}
	};

	/** Changes a loaded list. Without one, a change would pass for the whole list. */
	const changeList = (change: (list: Tag[]) => Tag[]) => {
		setTags((list) => list && change(list).sort(byLabel));
	};

	const create: TagChanges["create"] = async (request) => {
		const created = await reloadingOnRefusal(createTag(request));
		changeList((list) => [...list, created]);
		return created;
	};

	const update: TagChanges["update"] = async (id, request) => {
		const updated = await reloadingOnRefusal(updateTag(id, request), id);
		changeList((list) => list.map((tag) => (tag.id === id ? updated : tag)));
		return updated;
	};

	const remove: TagChanges["remove"] = async (id) => {
		await reloadingOnRefusal(deleteTag(id), id);
		changeList((list) => list.filter((tag) => tag.id !== id));
		onGone(id);
	};

	return { tags, changes: { create, update, remove } };
}
