import { useEffect, useRef, useState } from "react";
import { newScratchpadId } from "./scratchpad.ts";

const PREFIX = "/drawings/";

/** The ID to open for a new scratchpad. Its path is `/drawings/new`. */
export const NEW_SCRATCHPAD = "new";

/** The URL path that opens a drawing, or `/` for none. */
export const drawingPath = (id: string | null) =>
	id === null ? "/" : `${PREFIX}${encodeURIComponent(id)}`;

/** The ID in a `/drawings/<id>` path, or null for any other path. */
const readId = () => {
	const { pathname } = window.location;
	const encoded = pathname.slice(PREFIX.length);
	if (!pathname.startsWith(PREFIX) || !encoded || encoded.includes("/")) {
		return null;
	}
	try {
		return decodeURIComponent(encoded);
	} catch {
		// A hand-edited path such as /drawings/%E0 names no drawing.
		return null;
	}
};

/**
 * The open drawing, or none. A new scratchpad gets its ID here, and `isNew`
 * stays true while the editor that started it is open, even after its first save.
 */
type Opened = { id: string | null; isNew: boolean };

const opened = (id: string | null): Opened =>
	id === NEW_SCRATCHPAD
		? { id: newScratchpadId(), isNew: true }
		: { id, isNew: false };

/**
 * Keeps the open drawing's ID in the URL path, `/drawings/<id>`, so reloads,
 * links and the back button reopen it. `/` means no drawing is open, and
 * `/drawings/new` starts a new scratchpad.
 */
export function useOpenDrawingId() {
	const [open, setOpen] = useState(() => opened(readId()));
	// The open drawing now, for a save that answers after the user moved on.
	const current = useRef(open);
	current.current = open;

	useEffect(() => {
		const onPopState = () => setOpen(opened(readId()));
		window.addEventListener("popstate", onPopState);
		return () => window.removeEventListener("popstate", onPopState);
	}, []);

	const openDrawing = (next: string | null) => {
		const path = drawingPath(next);
		if (path !== window.location.pathname) {
			window.history.pushState(null, "", path);
		}
		setOpen(opened(next));
	};

	/**
	 * Puts the stored scratchpad's own path in place of `/drawings/new`, so a
	 * reload or the back button reopens it instead of starting another.
	 */
	const markStored = (id: string) => {
		const newPath = drawingPath(NEW_SCRATCHPAD);
		if (current.current.id === id && window.location.pathname === newPath) {
			window.history.replaceState(null, "", drawingPath(id));
		}
	};

	return { openId: open.id, isNew: open.isNew, openDrawing, markStored };
}
