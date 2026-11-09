import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import type { DrawingSummary } from "#shared/drawings.ts";
import { type Tag, type TagRequest, tagLabelKey } from "#shared/tags.ts";
import { ApiError } from "../../../api.ts";
import { useModalDialog } from "../../dialog/use-modal-dialog.ts";
import { findTags } from "../find-tags.ts";
import { moveInGrid } from "../grid-keys.ts";
import type { TagChanges } from "../use-tags.ts";

export type DrawingTagsProps = {
	drawing: DrawingSummary;
	/** Every tag, or null while they load or when loading failed. */
	tags: Tag[] | null;
	/** To create a tag in place. */
	changes: TagChanges;
	/** Gives the drawing the tag or takes it off. Rejects when the server refuses. */
	onToggle: (tagId: string) => Promise<void>;
};

/** Why giving or taking off a tag failed, in words the dialog can show. */
const toggleFailure = (cause: unknown) =>
	cause instanceof ApiError && (cause.status === 400 || cause.status === 404)
		? "The drawing or its tags changed elsewhere. Reload the page."
		: "The change failed. Try again.";

/**
 * The state of the dialog that changes one drawing's tags: the tags it has, the ones
 * to add that match the find text, the form for a new tag and why a change failed.
 */
export function useDrawingTags({
	drawing,
	tags,
	changes,
	onToggle,
}: DrawingTagsProps) {
	const dialog = useModalDialog();
	const findField = useRef<HTMLInputElement>(null);
	const toAdd = useRef<HTMLFieldSetElement>(null);
	const [find, setFindText] = useState("");
	// The label a new tag starts with while its form is open, or null.
	const [creating, setCreating] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	// What the last change did, for screen readers, which hear no other sign of it.
	const [notice, setNotice] = useState<string | null>(null);

	const current = (tags ?? []).filter(({ id }) => drawing.tagIds.includes(id));
	const available = findTags(
		(tags ?? []).filter(({ id }) => !drawing.tagIds.includes(id)),
		find,
	);
	const searched = find.trim();
	// The drawing has a tag with exactly this label, so there is nothing to add or create.
	const alreadyHas =
		searched !== "" &&
		current.some(({ label }) => tagLabelKey(label) === tagLabelKey(searched));

	useEffect(() => {
		if (creating === null) findField.current?.focus();
	}, [creating]);

	const setFind = (text: string) => {
		setFindText(text);
		setError(null);
		setNotice(null);
	};

	/**
	 * Gives the drawing the tag or takes it off. The tag's button moves to the other
	 * group, so the focus goes to a neighbour, or to the find field.
	 */
	const toggle = (tag: Tag, button?: HTMLElement) => {
		const neighbour =
			button?.nextElementSibling ?? button?.previousElementSibling;
		(neighbour instanceof HTMLElement ? neighbour : findField.current)?.focus();
		const removing = drawing.tagIds.includes(tag.id);
		setError(null);
		setNotice(`${tag.label} ${removing ? "removed" : "added"}.`);
		onToggle(tag.id).catch((cause) => {
			setNotice(null);
			setError(toggleFailure(cause));
		});
	};

	const startNew = () => {
		setError(null);
		setNotice(null);
		setCreating(searched);
	};

	const backToList = () => setCreating(null);

	/** Creates the tag and gives it to the drawing. A refusal stays in the form. */
	const create = async (request: TagRequest) => {
		const created = await changes.create(request);
		setFindText("");
		backToList();
		toggle(created);
	};

	/** Undoes one layer: the form, then the find text, then the dialog. */
	const goBack = (onClose: () => void) => {
		if (creating !== null) backToList();
		else if (find) setFind("");
		else onClose();
	};

	const onFindKey = (event: KeyboardEvent) => {
		// An input method uses these keys to edit and confirm its composition.
		if (event.nativeEvent.isComposing || event.keyCode === 229) return;
		if (event.key === "ArrowDown") {
			event.preventDefault();
			toAdd.current?.querySelector("button")?.focus();
		} else if (event.key === "Enter") {
			// Otherwise the same key press reaches the form's focused field and submits it.
			event.preventDefault();
			if (!searched || !tags) return;
			if (available.length > 0) {
				toggle(available[0]);
				setFindText("");
			} else if (!alreadyHas) startNew();
		}
	};

	const onAddKey = (event: KeyboardEvent<HTMLElement>) => {
		const moved = moveInGrid(event, event.currentTarget);
		if (!moved && event.key === "ArrowUp") findField.current?.focus();
	};

	return {
		dialog,
		findField,
		toAdd,
		find,
		setFind,
		searched,
		alreadyHas,
		current,
		available,
		creating,
		error,
		notice,
		toggle,
		startNew,
		backToList,
		create,
		goBack,
		onFindKey,
		onAddKey,
	};
}
