import { useCallback, useEffect, useRef, useState } from "react";
import type { DrawingSummary } from "../../../../shared/types.ts";
import { type Tag, type TagColor, useMockTags } from "./mock-tags.ts";

/** A rubber stamp as a pointer, in the colour of the picked tag. */
function stampCursor(color: TagColor) {
	const ink = getComputedStyle(document.documentElement)
		.getPropertyValue(`--tag-${color}-solid`)
		.trim();
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g stroke="#fff" stroke-width="1"><circle cx="16" cy="7" r="5" fill="#343a40"/><rect x="13" y="11" width="6" height="8" fill="#343a40"/><rect x="5" y="18" width="22" height="6" rx="1.5" fill="#343a40"/><rect x="6" y="25" width="20" height="4" rx="1" fill="${ink}"/></g></svg>`;
	return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 16 30`;
}

/**
 * The stamping session: while the pad is open a click on a card stamps the picked
 * tag on the drawing or lifts it. Cards changed in this session stay in view, even
 * if lifting the tag takes them out of the filter. The pad remembers the last tag.
 */
export function useStampPad(onClose: () => void) {
	const { tags, tagsOf, toggleDrawingTag } = useMockTags();
	const [open, setOpen] = useState(false);
	const [pickedId, setPickedId] = useState<string | null>(null);
	const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
	const [fresh, setFresh] = useState<string | null>(null);
	const [message, setMessage] = useState("");
	const [nudges, setNudges] = useState(0);
	const lastPicked = useRef<string | null>(null);
	const picked = open ? (tags.find((tag) => tag.id === pickedId) ?? null) : null;

	const close = useCallback(() => {
		setOpen(false);
		setTouched(new Set());
		setFresh(null);
		setMessage("Stamp pad closed.");
		onClose();
	}, [onClose]);

	useEffect(() => {
		if (!open) return;
		const escape = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			const target = event.target as HTMLInputElement;
			// Escape first clears a search field that has text.
			if (target.type === "search" && target.value) return;
			close();
		};
		document.addEventListener("keydown", escape);
		return () => document.removeEventListener("keydown", escape);
	}, [open, close]);

	return {
		open,
		picked,
		touched,
		fresh,
		message,
		nudges,
		cursor: picked ? stampCursor(picked.color) : undefined,
		start: () => {
			setOpen(true);
			setPickedId(lastPicked.current);
			setMessage("Stamp pad open.");
		},
		close,
		pick: (tag: Tag) => {
			lastPicked.current = tag.id;
			setPickedId(tag.id);
			setFresh(null);
			setMessage(`Picked ${tag.label}.`);
		},
		nudge: () => {
			setNudges((count) => count + 1);
			setMessage("Pick a tag on the stamp pad first.");
		},
		stamp: (drawing: DrawingSummary) => {
			if (!picked) return;
			const had = tagsOf(drawing).some((tag) => tag.id === picked.id);
			toggleDrawingTag(drawing, picked.id);
			setTouched((ids) => new Set(ids).add(drawing.id));
			setFresh(drawing.id);
			setMessage(
				had
					? `Lifted ${picked.label} off ${drawing.name}.`
					: `Stamped ${drawing.name} with ${picked.label}.`,
			);
		},
	};
}
