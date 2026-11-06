import { useCallback, useEffect, useState } from "react";
import type { DrawingSummary } from "../../../../shared/types.ts";
import { type Tag, type TagColor, useMockTags } from "./mock-tags.ts";

/** A rubber stamp as a pointer, in the ink of the stamp in hand. */
function stampCursor(color: TagColor) {
	const ink = getComputedStyle(document.documentElement)
		.getPropertyValue(`--tag-${color}-solid`)
		.trim();
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g stroke="#fff" stroke-width="1"><circle cx="16" cy="7" r="5" fill="#343a40"/><rect x="13" y="11" width="6" height="8" fill="#343a40"/><rect x="5" y="18" width="22" height="6" rx="1.5" fill="#343a40"/><rect x="6" y="25" width="20" height="4" rx="1" fill="${ink}"/></g></svg>`;
	return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 16 30`;
}

/**
 * The stamp in hand: while one is held, a click on a card stamps the drawing or
 * lifts the stamp. Cards touched in this pass stay in view, even if lifting the
 * stamp takes them out of the filter.
 */
export function useStampHand(onPutDown: () => void) {
	const { tags, tagsOf, toggleDrawingTag } = useMockTags();
	const [heldId, setHeldId] = useState<string | null>(null);
	const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
	const [fresh, setFresh] = useState<string | null>(null);
	const [message, setMessage] = useState("");
	const held = tags.find((tag) => tag.id === heldId) ?? null;

	const putDown = useCallback(() => {
		setHeldId(null);
		setTouched(new Set());
		setFresh(null);
		setMessage("Stamp put down.");
		onPutDown();
	}, [onPutDown]);

	useEffect(() => {
		if (!heldId) return;
		const escape = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			const target = event.target as HTMLInputElement;
			// Escape first clears a search field that has text.
			if (target.type === "search" && target.value) return;
			putDown();
		};
		document.addEventListener("keydown", escape);
		return () => document.removeEventListener("keydown", escape);
	}, [heldId, putDown]);

	return {
		held,
		touched,
		fresh,
		message,
		cursor: held ? stampCursor(held.color) : undefined,
		pickUp: (tag: Tag) => {
			setHeldId(tag.id);
			setTouched(new Set());
			setFresh(null);
			setMessage(`Holding the ${tag.label} stamp.`);
		},
		putDown,
		stamp: (drawing: DrawingSummary) => {
			if (!held) return;
			const had = tagsOf(drawing).some((tag) => tag.id === held.id);
			toggleDrawingTag(drawing, held.id);
			setTouched((ids) => new Set(ids).add(drawing.id));
			setFresh(drawing.id);
			setMessage(
				had
					? `Lifted ${held.label} off ${drawing.name}.`
					: `Stamped ${drawing.name} with ${held.label}.`,
			);
		},
	};
}
