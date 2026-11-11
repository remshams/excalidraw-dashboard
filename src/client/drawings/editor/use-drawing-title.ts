import { useEffect, useRef, useState } from "react";

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
	const title = useRef<HTMLDivElement>(null);
	const button = useRef<HTMLButtonElement>(null);
	// Enter and Escape keep the focus in the field until it closes; a click
	// elsewhere has already moved it, and the bar leaves it there.
	const refocus = useRef(false);

	useEffect(() => {
		if (editing || !refocus.current) return;
		refocus.current = false;
		button.current?.focus();
	}, [editing]);

	const close = () => {
		refocus.current = title.current?.contains(document.activeElement) ?? false;
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
		title,
		button,
		start: () => setEditing(true),
		save,
		cancel: close,
	};
}
