import { type RefObject, useEffect, useLayoutEffect, useRef } from "react";

type Target = { tagId: string; drawingId?: string };

/**
 * Keeps the focus on a tag after it toggled the filter. The tag moves within its
 * card or row when it joins the filter or leaves it, and a card can leave the page
 * with it. The focus then goes to the tag on the same card if it still shows there,
 * else to the tag in the "Filter by" row.
 */
export function useTagRefocus() {
	const page = useRef<HTMLDivElement>(null);
	const target = useRef<Target | null>(null);

	useLayoutEffect(() => {
		const wanted = target.current;
		target.current = null;
		if (!wanted || !page.current) return;
		const toggle = `[data-tag-toggle="${wanted.tagId}"]`;
		const onCard = wanted.drawingId
			? page.current.querySelector<HTMLElement>(
					`[data-card="${wanted.drawingId}"] ${toggle}`,
				)
			: null;
		const inRow = page.current.querySelector<HTMLElement>(
			`[data-filter-row] ${toggle}`,
		);
		(onCard ?? inRow)?.focus();
	});

	/** Asks for the focus on the tag once the page shows the new filter. */
	const refocus = (tagId: string, drawingId?: string) => {
		target.current = { tagId, drawingId };
	};

	return { page, refocus };
}

/**
 * Gives the focus to the fallback after a dialog closes, when the browser had no
 * element to return it to. That happens when the dialog took the card it opened
 * from off the page, such as by removing the tag the filter shows it for.
 */
export function useFocusAfterDialog(
	open: boolean,
	fallback: RefObject<HTMLElement | null>,
) {
	const wasOpen = useRef(false);

	useEffect(() => {
		const closed = wasOpen.current && !open;
		wasOpen.current = open;
		const focused = document.activeElement;
		if (closed && (!focused || focused === document.body)) {
			fallback.current?.focus();
		}
	});
}
