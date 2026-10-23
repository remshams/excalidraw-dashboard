import { useEffect, useId, useRef, useState } from "react";
import type { DrawingSummary } from "../../shared/types.ts";
import { previewUrl } from "./api.ts";
import { searchByName } from "./search.ts";

type QuickSwitcherProps = {
	drawings: DrawingSummary[];
	/** The drawing open in the editor, marked in the results. */
	currentId: string;
	onOpen: (id: string) => void;
	onCreate: (name: string) => void;
	onClose: () => void;
};

type Result =
	| { kind: "drawing"; drawing: DrawingSummary }
	| { kind: "create"; name: string };

const byRecency = (a: DrawingSummary, b: DrawingSummary) =>
	b.updatedAt.localeCompare(a.updatedAt);

/** Matching drawings, most recent first, then a create entry unless a name matches exactly. */
export function switcherResults(
	drawings: DrawingSummary[],
	query: string,
): Result[] {
	const name = query.trim();
	const results: Result[] = searchByName(drawings, name)
		.sort(byRecency)
		.map((drawing) => ({ kind: "drawing", drawing }));
	const taken = drawings.some(
		(drawing) => drawing.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
	);
	if (name && !taken) results.push({ kind: "create", name });
	return results;
}

/** A search over all drawings that opens one, or creates one from the typed name. */
export function QuickSwitcher({
	drawings,
	currentId,
	onOpen,
	onCreate,
	onClose,
}: QuickSwitcherProps) {
	const [query, setQuery] = useState("");
	const [active, setActive] = useState(0);
	const input = useRef<HTMLInputElement>(null);
	const ids = useId();

	const results = switcherResults(drawings, query);
	const selected = Math.min(active, results.length - 1);
	const optionId = (index: number) => `${ids}-${index}`;

	// Focus the search, and give focus back to what had it once the switcher closes.
	useEffect(() => {
		const previous = document.activeElement;
		input.current?.focus();
		return () => {
			if (previous instanceof HTMLElement) previous.focus();
		};
	}, []);

	const choose = (result: Result | undefined) => {
		if (!result) return;
		onClose();
		if (result.kind === "create") onCreate(result.name);
		else onOpen(result.drawing.id);
	};

	const move = (step: number) => {
		if (results.length === 0) return;
		setActive((selected + step + results.length) % results.length);
	};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: clicking beside the switcher closes it, as Escape does.
		<div
			className="switcher-backdrop"
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
			onKeyDown={(event) => {
				// Keep the keys from Excalidraw's shortcuts while the switcher is open.
				event.stopPropagation();
				if (event.key === "Escape") onClose();
			}}
		>
			<div
				className="switcher"
				role="dialog"
				aria-modal="true"
				aria-label="Switch drawing"
			>
				<input
					ref={input}
					role="combobox"
					aria-label="Find or create a drawing"
					aria-controls={`${ids}-results`}
					aria-expanded="true"
					aria-activedescendant={selected >= 0 ? optionId(selected) : undefined}
					placeholder="Find or create a drawing…"
					value={query}
					onChange={(event) => {
						setQuery(event.target.value);
						setActive(0);
					}}
					onKeyDown={(event) => {
						if (event.key === "ArrowDown") move(1);
						else if (event.key === "ArrowUp") move(-1);
						else if (event.key === "Enter") choose(results[selected]);
						else return;
						event.preventDefault();
					}}
				/>
				<div
					id={`${ids}-results`}
					className="results"
					role="listbox"
					aria-label="Drawings"
				>
					{results.map((result, index) => (
						// biome-ignore lint/a11y/useKeyWithClickEvents: the search field handles the keyboard through aria-activedescendant.
						<div
							key={result.kind === "create" ? "" : result.drawing.id}
							id={optionId(index)}
							role="option"
							tabIndex={-1}
							aria-selected={index === selected}
							onMouseEnter={() => setActive(index)}
							onClick={() => choose(result)}
						>
							{result.kind === "create" ? (
								<CreateOption name={result.name} />
							) : (
								<DrawingOption
									drawing={result.drawing}
									current={result.drawing.id === currentId}
								/>
							)}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

function DrawingOption({
	drawing,
	current,
}: {
	drawing: DrawingSummary;
	current: boolean;
}) {
	return (
		<>
			<span className="thumb">
				{drawing.hasPreview && <img src={previewUrl(drawing)} alt="" />}
			</span>
			<span className="name">{drawing.name}</span>
			{current && <span className="hint">Open</span>}
		</>
	);
}

function CreateOption({ name }: { name: string }) {
	return (
		<>
			<span className="thumb blank" aria-hidden="true">
				+
			</span>
			<span className="name">Create “{name}”</span>
		</>
	);
}
