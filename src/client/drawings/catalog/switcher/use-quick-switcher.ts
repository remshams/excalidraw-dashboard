import { useState } from "react";
import type { DrawingSummary } from "../../../../shared/drawings.ts";
import { searchByName } from "../../search.ts";
import { useModalDialog } from "../dialog/use-modal-dialog.ts";

export type SwitcherResult =
	| { kind: "drawing"; drawing: DrawingSummary }
	| { kind: "create"; name: string };

/** Identifies a row across changes to the list. */
export const resultKey = (result: SwitcherResult) =>
	result.kind === "create" ? "create" : result.drawing.id;

/**
 * The drawings that match, most recently edited first, and last an offer to
 * create the query as a new drawing unless a drawing already has that name.
 */
function switcherResults(
	drawings: DrawingSummary[],
	query: string,
): SwitcherResult[] {
	const found: SwitcherResult[] = searchByName(drawings, query)
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
		.map((drawing) => ({ kind: "drawing", drawing }));
	const name = query.trim();
	const taken = drawings.some(
		(drawing) => drawing.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
	);
	return name && !taken ? [...found, { kind: "create", name }] : found;
}

const firstKey = ([first]: SwitcherResult[]) =>
	first ? resultKey(first) : null;

/**
 * The state of an open quick switcher: its modal dialog, the query, the rows and
 * the selected row. The selection follows its row, not a position, because a save
 * of the open drawing can reorder the rows while the switcher is open.
 */
export function useQuickSwitcher(drawings: DrawingSummary[]) {
	const dialog = useModalDialog();
	const [query, setQuery] = useState("");
	const results = switcherResults(drawings, query);
	const [selectedKey, setSelectedKey] = useState(() => firstKey(results));
	// While the list is still loading, or once the row is gone, the first row is
	// selected.
	const selected = Math.max(
		results.findIndex((result) => resultKey(result) === selectedKey),
		0,
	);

	return {
		dialog,
		query,
		results,
		selected,
		search: (next: string) => {
			setQuery(next);
			setSelectedKey(firstKey(switcherResults(drawings, next)));
		},
		select: (result: SwitcherResult) => setSelectedKey(resultKey(result)),
		/** Moves the selection by the given number of rows and wraps around. */
		move: (step: number) => {
			const count = results.length;
			const next = results[(selected + step + count) % count];
			if (next) setSelectedKey(resultKey(next));
		},
	};
}
