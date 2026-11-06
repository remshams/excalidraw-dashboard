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

/** One stamp or lift, or the stamps that a pick gave to the waiting drawings. */
type Stroke = { tagId: string; drawings: DrawingSummary[] };

const waitingStatus = (drawings: DrawingSummary[]) =>
	drawings.length === 1
		? `${drawings[0].name} is waiting for a tag.`
		: `${drawings.length} drawings are waiting for a tag.`;

/**
 * The stamping session: while the pad is open a click on a card stamps the picked
 * tag on the drawing or lifts it. Cards clicked before a tag is picked wait for
 * the pick, so the order doesn't matter. Cards changed in this session stay in
 * view, even if lifting the tag takes them out of the filter. The pad remembers
 * the last tag.
 */
export function useStampPad(onClose: () => void) {
	const { tags, tagsOf, toggleDrawingTag } = useMockTags();
	const [open, setOpen] = useState(false);
	const [pickedId, setPickedId] = useState<string | null>(null);
	const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
	const [fresh, setFresh] = useState<readonly string[]>([]);
	const [message, setMessage] = useState("");
	const [status, setStatus] = useState("");
	const [waiting, setWaiting] = useState<readonly DrawingSummary[]>([]);
	const [strokes, setStrokes] = useState<readonly Stroke[]>([]);
	const lastPicked = useRef<string | null>(null);
	const picked = open ? (tags.find((tag) => tag.id === pickedId) ?? null) : null;

	/** The tag is in plain sight on the pad, so its status can leave it out. */
	const say = (text: string, short = text) => {
		setMessage(text);
		setStatus(short);
	};

	const close = useCallback(() => {
		setOpen(false);
		setTouched(new Set());
		setFresh([]);
		setWaiting([]);
		setStrokes([]);
		setStatus("");
		setMessage("Stamp pad closed.");
		onClose();
	}, [onClose]);

	const apply = (tag: Tag, drawings: DrawingSummary[]) => {
		for (const drawing of drawings) toggleDrawingTag(drawing, tag.id);
		setStrokes((all) => [...all, { tagId: tag.id, drawings }]);
		setTouched((ids) => new Set([...ids, ...drawings.map(({ id }) => id)]));
		setFresh(drawings.map(({ id }) => id));
	};

	const undo = () => {
		const last = strokes[strokes.length - 1];
		if (!last) return;
		for (const drawing of last.drawings) toggleDrawingTag(drawing, last.tagId);
		setStrokes(strokes.slice(0, -1));
		setFresh([]);
		say("Undone.");
	};

	useEffect(() => {
		if (!open) return;
		const onKey = (event: KeyboardEvent) => {
			const target = event.target as HTMLInputElement;
			if (event.key === "z" && (event.ctrlKey || event.metaKey) && !event.shiftKey) {
				// A text field keeps its own undo.
				if (target.tagName === "INPUT" && target.type !== "radio") return;
				event.preventDefault();
				document.querySelector<HTMLButtonElement>("[data-stamp-undo]")?.click();
				return;
			}
			if (event.key !== "Escape") return;
			// Escape first clears a search field that has text.
			if (target.type === "search" && target.value) return;
			close();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [open, close]);

	return {
		open,
		picked,
		touched,
		fresh,
		message,
		status,
		waiting,
		canUndo: strokes.length > 0,
		cursor: picked ? stampCursor(picked.color) : undefined,
		start: () => {
			setOpen(true);
			setPickedId(lastPicked.current);
			setMessage("Stamp pad open.");
		},
		close,
		undo,
		pick: (tag: Tag) => {
			lastPicked.current = tag.id;
			setPickedId(tag.id);
			setFresh([]);
			const lacking = waiting.filter(
				(drawing) => !tagsOf(drawing).some(({ id }) => id === tag.id),
			);
			setWaiting([]);
			if (lacking.length === 0) {
				setStatus("");
				setMessage(`Picked ${tag.label}.`);
				return;
			}
			apply(tag, lacking);
			say(
				lacking.length === 1
					? `Stamped ${lacking[0].name} with ${tag.label}.`
					: `Stamped ${lacking.length} drawings with ${tag.label}.`,
				lacking.length === 1
					? `Stamped ${lacking[0].name}.`
					: `Stamped ${lacking.length} drawings.`,
			);
		},
		stamp: (drawing: DrawingSummary) => {
			if (!picked) {
				const next = waiting.includes(drawing)
					? waiting.filter((other) => other !== drawing)
					: [...waiting, drawing];
				setWaiting(next);
				say(next.length > 0 ? waitingStatus(next) : "");
				return;
			}
			const had = tagsOf(drawing).some((tag) => tag.id === picked.id);
			apply(picked, [drawing]);
			say(
				had
					? `Lifted ${picked.label} off ${drawing.name}.`
					: `Stamped ${drawing.name} with ${picked.label}.`,
				had ? `Lifted off ${drawing.name}.` : `Stamped ${drawing.name}.`,
			);
		},
	};
}
