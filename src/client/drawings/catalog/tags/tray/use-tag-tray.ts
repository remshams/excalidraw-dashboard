import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import type { Tag, TagRequest } from "#shared/tags.ts";
import { useModalDialog } from "../../dialog/use-modal-dialog.ts";
import { findTags } from "../find-tags.ts";
import { moveInGrid } from "../grid-keys.ts";
import type { TagChanges } from "../use-tags.ts";

/** The open form: the tag to change, or the label to start a new one with. */
type TrayForm = { tag?: Tag; label?: string };

/**
 * The state of an open tag tray: its modal dialog, whether it shows the form, the
 * find text, the tags it finds and where the focus goes between them.
 */
export function useTagTray(tags: Tag[] | null, changes: TagChanges) {
	const dialog = useModalDialog();
	const findField = useRef<HTMLInputElement>(null);
	const rows = useRef<HTMLUListElement>(null);
	const [form, setForm] = useState<TrayForm | null>(null);
	const [find, setFindText] = useState("");
	const [notice, setNotice] = useState<string | null>(null);
	const [activeId, setActiveId] = useState<string | null>(null);
	// Whether going back to the list focuses a row rather than the find field.
	const returnToRow = useRef(false);

	const shown = findTags(tags ?? [], find);
	// One stop in the tab order for the rows: the one last used.
	const tabStopId = shown.some(({ id }) => id === activeId)
		? activeId
		: (shown[0]?.id ?? null);

	useEffect(() => {
		if (form) return;
		const target = returnToRow.current
			? rows.current?.querySelector<HTMLElement>('[tabindex="0"]')
			: findField.current;
		target?.focus();
	}, [form]);

	const setFind = (text: string) => {
		setFindText(text);
		setNotice(null);
	};

	const backToRow = (id: string) => {
		setActiveId(id);
		returnToRow.current = true;
		setForm(null);
	};

	const backToFind = () => {
		returnToRow.current = false;
		setForm(null);
	};

	/** Clears the find text, so that the row of a saved tag is sure to show. */
	const announce = (message: string) => {
		setFindText("");
		setNotice(message);
	};

	const startNew = () => {
		setNotice(null);
		setForm({ label: find.trim() });
	};

	const startEdit = (tag: Tag) => {
		setNotice(null);
		setForm({ tag });
	};

	const cancel = () => {
		if (form?.tag) backToRow(form.tag.id);
		else backToFind();
	};

	const save = async (request: TagRequest) => {
		const editing = form?.tag;
		const saved = editing
			? await changes.update(editing.id, request)
			: await changes.create(request);
		announce(`${saved.label} ${editing ? "saved" : "created"}.`);
		backToRow(saved.id);
	};

	const remove = async ({ id, label }: Tag) => {
		await changes.remove(id);
		announce(`${label} deleted.`);
		backToFind();
	};

	const gone = () => {
		announce("This tag was deleted elsewhere.");
		backToFind();
	};

	/** Undoes one layer: the form, then the find text, then the tray. */
	const goBack = (onClose: () => void) => {
		if (form) cancel();
		else if (find) setFind("");
		else onClose();
	};

	const onFindKey = (event: KeyboardEvent) => {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			rows.current?.querySelector("button")?.focus();
		} else if (event.key === "Enter" && tags && shown.length === 0) {
			// Otherwise the same key press reaches the form's focused field and submits it.
			event.preventDefault();
			startNew();
		}
	};

	const onRowsKey = (event: KeyboardEvent<HTMLElement>) => {
		const moved = moveInGrid(event, event.currentTarget);
		if (!moved && event.key === "ArrowUp") findField.current?.focus();
	};

	return {
		dialog,
		findField,
		rows,
		form,
		find,
		setFind,
		shown,
		notice,
		tabStopId,
		setActiveId,
		startNew,
		startEdit,
		cancel,
		save,
		remove,
		gone,
		goBack,
		onFindKey,
		onRowsKey,
	};
}
