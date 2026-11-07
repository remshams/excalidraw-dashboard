import { type KeyboardEvent, useId } from "react";
import type { DrawingSummary } from "../../../../shared/drawings.ts";
import { PlusIcon, SearchIcon } from "../icons.tsx";
import { PreviewImage } from "../PreviewImage.tsx";
import styles from "./QuickSwitcher.module.css";
import {
	resultKey,
	type SwitcherResult,
	useQuickSwitcher,
} from "./use-quick-switcher.ts";

type QuickSwitcherProps = {
	drawings: DrawingSummary[];
	/** The drawing the editor shows, or null while it loads. */
	openDrawingId: string | null;
	onOpen: (id: string) => void;
	onCreate: (name: string) => void;
	onClose: () => void;
};

/**
 * A modal search over the drawings that opens one or creates one. The focus stays
 * in the search field, which points at the selected row for screen readers.
 */
export function QuickSwitcher({
	drawings,
	openDrawingId,
	onOpen,
	onCreate,
	onClose,
}: QuickSwitcherProps) {
	const { dialog, query, results, selected, search, select, move } =
		useQuickSwitcher(drawings);
	const ids = useId();
	const optionId = (index: number) => `${ids}-option-${index}`;

	const choose = (result: SwitcherResult | undefined) => {
		if (!result) return;
		onClose();
		if (result.kind === "create") onCreate(result.name);
		else onOpen(result.drawing.id);
	};

	const onKeyDown = (event: KeyboardEvent) => {
		// Keeps the keys from listeners on the document, such as Excalidraw's.
		event.stopPropagation();
		// An input method uses these keys to edit and confirm its composition.
		if (event.nativeEvent.isComposing || event.keyCode === 229) return;
		switch (event.key) {
			case "ArrowDown":
				move(1);
				break;
			case "ArrowUp":
				move(-1);
				break;
			case "Enter":
				// A held Enter would go on to reopen the switcher and choose again.
				if (!event.repeat) choose(results[selected]);
				break;
			case "Escape":
				onClose();
				break;
			case "Tab":
				// The search field is the only stop, so the arrow keys keep working.
				break;
			default:
				return;
		}
		event.preventDefault();
	};

	return (
		<dialog
			ref={dialog}
			className={styles.switcher}
			aria-label="Switch drawing"
			onKeyDown={onKeyDown}
			onKeyUp={(event) => event.stopPropagation()}
			// Escape from outside the search field, or the Android back gesture.
			onCancel={onClose}
			onMouseDown={(event) => {
				if (event.target !== event.currentTarget) return;
				// Otherwise the press takes back the focus that closing returns.
				event.preventDefault();
				onClose();
			}}
		>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: it only keeps the focus in the search field, which handles the keyboard. */}
			<div
				className={styles.page}
				// Keeps the focus in the search field, so the arrow keys keep working. A
				// press in the field itself still places the caret.
				onMouseDown={(event) => {
					if (!(event.target instanceof HTMLInputElement))
						event.preventDefault();
				}}
			>
				<div className={styles.line}>
					<SearchIcon />
					<input
						className={styles.search}
						role="combobox"
						aria-label="Find or create a drawing"
						aria-expanded="true"
						aria-controls={`${ids}-results`}
						aria-autocomplete="list"
						aria-activedescendant={
							results[selected] ? optionId(selected) : undefined
						}
						placeholder="Find or create a drawing…"
						value={query}
						onChange={(event) => search(event.target.value)}
					/>
				</div>
				<div
					id={`${ids}-results`}
					className={styles.results}
					role="listbox"
					aria-label="Drawings"
				>
					{results.map((result, index) => (
						// biome-ignore lint/a11y/useKeyWithClickEvents: the search field handles the keyboard through aria-activedescendant.
						<div
							key={resultKey(result)}
							id={optionId(index)}
							className={styles.option}
							role="option"
							tabIndex={-1}
							aria-selected={index === selected}
							ref={
								index === selected
									? (row) => row?.scrollIntoView({ block: "nearest" })
									: undefined
							}
							// Not mouseenter: that also fires when the arrow keys scroll a row
							// under a pointer at rest, which would move the selection back.
							onMouseMove={() => select(result)}
							onClick={() => choose(result)}
						>
							{result.kind === "create" ? (
								<>
									<span className={`${styles.sheet} ${styles.blank}`}>
										<PlusIcon />
									</span>
									<span className={styles.name}>Create “{result.name}”</span>
								</>
							) : (
								<>
									<span className={styles.sheet}>
										<PreviewImage drawing={result.drawing} />
									</span>
									<span className={styles.name}>{result.drawing.name}</span>{" "}
									{result.drawing.id === openDrawingId && (
										<span className={styles.openLabel}>Open</span>
									)}
								</>
							)}
						</div>
					))}
				</div>
			</div>
		</dialog>
	);
}
