import { useEffect, useState } from "react";

const PREFIX = "/drawings/";

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

/** Turns an old `/#<id>` link into `/drawings/<id>`, without a history entry. */
const replaceHashLink = () => {
	const id = window.location.hash.slice(1);
	if (id && window.location.pathname === "/") {
		window.history.replaceState(null, "", drawingPath(id));
	}
};

/**
 * Keeps the open drawing's ID in the URL path, `/drawings/<id>`, so reloads,
 * links and the back button reopen it. `/` means no drawing is open.
 */
export function useOpenDrawingId(): [
	string | null,
	(id: string | null) => void,
] {
	const [id, setId] = useState(() => {
		replaceHashLink();
		return readId();
	});

	useEffect(() => {
		// Old /#<id> entries can still be in the tab's history.
		const onPopState = () => {
			replaceHashLink();
			setId(readId());
		};
		window.addEventListener("popstate", onPopState);
		return () => window.removeEventListener("popstate", onPopState);
	}, []);

	const openDrawing = (next: string | null) => {
		const path = drawingPath(next);
		if (path !== window.location.pathname) {
			window.history.pushState(null, "", path);
		}
		setId(next);
	};

	return [id, openDrawing];
}
