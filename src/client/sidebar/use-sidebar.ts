import type { KeyboardEvent, PointerEvent } from "react";
import { useEffect, useRef, useState } from "react";

export const DEFAULT_WIDTH = 272;
export const MIN_WIDTH = 192;
export const MAX_WIDTH = 512;
const KEY_STEPS: Record<string, number> = { ArrowLeft: -16, ArrowRight: 16 };
const STORAGE_KEY = "sidebar";

type SidebarState = { width: number; collapsed: boolean };

const clamp = (width: number) =>
	Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width)));

function load(): SidebarState {
	try {
		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
		return {
			width:
				typeof stored.width === "number" ? clamp(stored.width) : DEFAULT_WIDTH,
			collapsed: stored.collapsed === true,
		};
	} catch {
		return { width: DEFAULT_WIDTH, collapsed: false };
	}
}

/** Width and collapsed state of the sidebar, kept across reloads. */
export function useSidebar() {
	const [state, setState] = useState(load);
	const drag = useRef<{ x: number; width: number } | null>(null);

	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	}, [state]);

	const setWidth = (width: number) =>
		setState((current) => ({ ...current, width: clamp(width) }));

	const endDrag = () => {
		drag.current = null;
		document.documentElement.classList.remove("resizing");
	};

	/** Props for the element that resizes the sidebar by pointer or arrow keys. */
	const resizeHandle = {
		onPointerDown: (event: PointerEvent<HTMLElement>) => {
			event.preventDefault();
			event.currentTarget.setPointerCapture?.(event.pointerId);
			drag.current = { x: event.clientX, width: state.width };
			document.documentElement.classList.add("resizing");
		},
		onPointerMove: (event: PointerEvent<HTMLElement>) => {
			if (drag.current) {
				setWidth(drag.current.width + event.clientX - drag.current.x);
			}
		},
		onPointerUp: endDrag,
		onPointerCancel: endDrag,
		onDoubleClick: () => setWidth(DEFAULT_WIDTH),
		onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
			const step = KEY_STEPS[event.key];
			if (step === undefined) return;
			event.preventDefault();
			setWidth(state.width + step);
		},
	};

	return {
		width: state.width,
		collapsed: state.collapsed,
		setCollapsed: (collapsed: boolean) =>
			setState((current) => ({ ...current, collapsed })),
		resizeHandle,
	};
}
