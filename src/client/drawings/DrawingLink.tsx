import type { ReactNode } from "react";
import { drawingPath } from "./use-open-drawing-id.ts";

type DrawingLinkProps = {
	/** The drawing to open, or null for the landing page. */
	drawingId: string | null;
	onOpen: (id: string | null) => void;
	className?: string;
	children: ReactNode;
};

/**
 * A link to a drawing's URL. A plain click opens the drawing without loading
 * the page; a middle click or a click with a modifier key stays with the
 * browser, so the drawing can open in a new tab.
 */
export function DrawingLink({
	drawingId,
	onOpen,
	className,
	children,
}: DrawingLinkProps) {
	return (
		<a
			href={drawingPath(drawingId)}
			className={className}
			onClick={(event) => {
				const modified =
					event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
				if (event.button !== 0 || modified) return;
				event.preventDefault();
				onOpen(drawingId);
			}}
		>
			{children}
		</a>
	);
}
