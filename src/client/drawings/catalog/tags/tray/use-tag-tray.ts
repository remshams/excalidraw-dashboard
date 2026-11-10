import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import type { Tag, TagRequest } from "#shared/tags.ts";
import { useModalDialog } from "../../dialog/use-modal-dialog.ts";
import { findTags } from "../find-tags.ts";
import { moveInGrid } from "../grid-keys.ts";
import type { TagChanges } from "../use-tags.ts";

/** The open form: the tag to change, or the label to start a new one with. */
type TrayForm = { tag?: Tag; label?: string };

/** The two buttons of a row: the tag, which filters by it, and its pencil. */
export type RowPart = "toggle" | "pencil";

type RowButton = { id: string; part: RowPart };

/**
 * The state of an open tag tray: its modal dialog, whether it shows the form, the
 * find text, the tags it finds and where the focus goes between them.
 */
export function useTagTray(
	tags: Tag[] | null,
	changes: TagChanges,
	selectedTagIds: string[],
	onToggleFilter: (tagId: string) => void,
) {
	const dialog = useModalDialog();
	const findField = useRef<HTMLInputElement>(null);
	const rows = useRef<HTMLUListElement>(null);
	const [form, setForm] = useState<TrayForm | null>(null);
	const [find, setFindText] = useState("");
	const [notice, setNotice] = useState<string | null>(null);
	const [active, setActive] = useState<RowButton | null>(null);
	// Whether going back to the list focuses a row rather than the find field.
	const returnToRow = useRef(false);

	const shown = findTags(tags ?? [], find);
	// One stop in the tab order for the rows: the button last used.
	const first: RowButton | null = shown[0]
		? { id: shown[0].id, part: "toggle" }
		: null;
	const tabStop = shown.some(({ id }) => id === active?.id) ? active : first;

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
		setActive({ id, part: "pencil" });
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

	/** Puts the top match in the filter or takes it out, and says which. */
	const toggleTopMatch = ({ id, label }: Tag) => {
		onToggleFilter(id);
		announce(
			selectedTagIds.includes(id)
				? `${label} is out of the filter.`
				: `${label} is in the filter.`,
		);
	};

	/**
	 * ArrowDown goes to the first row. Enter toggles the top match in the filter, or
	 * opens the form for a new tag when no tag matches.
	 */
	const onFindKey = (event: KeyboardEvent) => {
		// An input method uses these keys to edit and confirm its composition.
		if (event.nativeEvent.isComposing || event.keyCode === 229) return;
		if (event.key === "ArrowDown") {
			event.preventDefault();
			rows.current?.querySelector("button")?.focus();
		} else if (event.key === "Enter" && tags) {
			// Otherwise the same key press reaches the form's focused field and submits it.
			event.preventDefault();
			if (!shown[0]) startNew();
			else if (find.trim()) toggleTopMatch(shown[0]);
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
		tabStop,
		setActive,
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
