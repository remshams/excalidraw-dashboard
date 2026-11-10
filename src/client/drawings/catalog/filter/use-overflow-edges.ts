import { type RefObject, useEffect } from "react";

type Scroll = { scrollLeft: number; scrollWidth: number; clientWidth: number };

/**
 * Which edges of a sideways scrolling box cut something off: the start once it
 * is scrolled away from there, the end while more lies to the right. Both are
 * false when everything fits. Browsers round the sizes, so one pixel is slack.
 */
export function overflowEdges({
	scrollLeft,
	scrollWidth,
	clientWidth,
}: Scroll): { start: boolean; end: boolean } {
	return {
		start: scrollLeft > 1,
		end: scrollLeft + clientWidth < scrollWidth - 1,
	};
}

/**
 * Sets `data-fade-start` and `data-fade-end` on the element while tags are cut
 * off at that edge. It looks again on scroll, on resize and when `count` changes.
 */
export function useOverflowEdges(
	ref: RefObject<HTMLElement | null>,
	count: number,
) {
	// biome-ignore lint/correctness/useExhaustiveDependencies: a changed count adds or removes tags, so the edges need another look.
	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		const update = () => {
			const { start, end } = overflowEdges(element);
			element.toggleAttribute("data-fade-start", start);
			element.toggleAttribute("data-fade-end", end);
		};
		update();
		element.addEventListener("scroll", update);
		const observer = new ResizeObserver(update);
		observer.observe(element);
		return () => {
			element.removeEventListener("scroll", update);
			observer.disconnect();
		};
	}, [ref, count]);
}
