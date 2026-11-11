import { useState } from "react";

/**
 * The state of the drawing's name in the editor bar: whether the name field is
 * open, and the name to show. While a rename is saving, that is the new name, so
 * the bar doesn't fall back to the old one until the list has the new one.
 */
export function useDrawingTitle(
	name: string,
	onRename: (name: string) => Promise<void>,
) {
	const [editing, setEditing] = useState(false);
	const [savingName, setSavingName] = useState<string | null>(null);
	// Whether the name takes the focus back when the field closes.
	const [refocus, setRefocus] = useState(false);

	const close = () => {
		// Enter and Escape close the field while it still has the focus. A click
		// elsewhere has already moved the focus, and the bar leaves it there.
		setRefocus(document.activeElement instanceof HTMLInputElement);
		setEditing(false);
	};

	const save = (newName: string) => {
		close();
		setSavingName(newName);
		onRename(newName).finally(() => setSavingName(null));
	};

	return {
		editing,
		shownName: savingName ?? name,
		refocus,
		start: () => setEditing(true),
		save,
		cancel: close,
	};
}
