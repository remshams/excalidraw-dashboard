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
