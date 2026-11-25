import { useState } from "react";

/** The question a drawing's card asks: a new name, or a delete confirmation. */
export type CardTask = "rename" | "delete";

/** The question a scratchpad's card asks: a name to save it under, or a discard. */
export type ScratchpadTask = "save" | "discard";

/**
 * The one question the landing page asks, if any: a drawing's card, a
 * scratchpad's card, or the scratchpads' row before discarding them all.
 */
export type OpenTask =
	| { kind: CardTask; id: string }
	| { kind: ScratchpadTask; id: string }
	| { kind: "discard-all" }
	| null;

/** The question the drawing's card asks, if any. */
export const cardTaskOf = (task: OpenTask, id: string): CardTask | null =>
	(task?.kind === "rename" || task?.kind === "delete") && task.id === id
		? task.kind
		: null;

/** The question the scratchpad's card asks, if any. */
export const scratchpadTaskOf = (
	task: OpenTask,
	id: string,
): ScratchpadTask | null =>
	(task?.kind === "save" || task?.kind === "discard") && task.id === id
		? task.kind
		: null;

/**
 * The landing page's one question. `close` closes it, and `closeToButton` also
 * gives the focus back to the button that asked it, for a question that leaves
 * that button in place, unless the user already moved the focus elsewhere.
 */
export function useOpenTask() {
	const [task, setTask] = useState<OpenTask>(null);
	// The question just closed; its button takes the focus when it returns.
	const [returnTo, setReturnTo] = useState<OpenTask>(null);

	const ask = (next: OpenTask) => {
		setReturnTo(null);
		setTask(next);
	};

	const closeToButton = () => {
		// Escape, Enter and Keep leave the focus in the question; a click elsewhere
		// or Tab has moved it, and a click starts its own question if it asks one.
		const active = document.activeElement;
		const inQuestion =
			active instanceof HTMLInputElement || active instanceof HTMLButtonElement;
		setReturnTo(inQuestion ? task : null);
		setTask(null);
	};

	return { task, returnTo, ask, close: () => ask(null), closeToButton };
}

export type OpenTaskState = ReturnType<typeof useOpenTask>;
