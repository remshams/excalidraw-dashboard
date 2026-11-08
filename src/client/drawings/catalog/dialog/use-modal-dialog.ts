import { type MouseEvent, useLayoutEffect, useRef } from "react";

/**
 * A ref for a dialog that is modal while it is mounted. The browser moves the focus
 * into the dialog on opening and gives it back on closing. A layout effect, because
 * that only works while the dialog is still in the page, and React cleans up other
 * effects after removing it.
 */
export function useModalDialog() {
	const dialog = useRef<HTMLDialogElement>(null);

	useLayoutEffect(() => {
		const element = dialog.current;
		element?.showModal();
		return () => element?.close();
	}, []);

	return dialog;
}

/**
 * A mouse-down handler for a dialog whose content covers it, so a press on the
 * dialog element itself is one on its backdrop.
 */
export const closeOnBackdropPress =
	(onClose: () => void) => (event: MouseEvent<HTMLDialogElement>) => {
		if (event.target !== event.currentTarget) return;
		// Otherwise the press takes back the focus that closing returns.
		event.preventDefault();
		onClose();
	};
