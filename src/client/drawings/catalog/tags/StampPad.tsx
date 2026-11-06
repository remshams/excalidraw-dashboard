import { type KeyboardEvent, type RefObject, useEffect, useRef, useState } from "react";
import type { DrawingSummary } from "../../../../shared/types.ts";
import { CheckIcon, PlusIcon } from "../icons.tsx";
import { moveInGrid } from "./grid-keys.ts";
import { findTags, type Tag, useMockTags } from "./mock-tags.ts";
import { Stamp } from "./Stamp.tsx";
import styles from "./StampPad.module.css";
import { TagForm } from "./TagForm.tsx";

type StampPadProps = {
	drawings: DrawingSummary[];
	picked: Tag | null;
	/** What the last click did, or how many drawings wait for a tag. */
	status: string;
	canUndo: boolean;
	/** Cards a stamping session keeps in view though they no longer match. */
	lingering: number;
	findRef: RefObject<HTMLInputElement | null>;
	onPick: (tag: Tag) => void;
	/** Moves the focus to the cards, after a pick from the keyboard. */
	onGoToCards: () => void;
	onUndo: () => void;
	onClose: () => void;
};

/**
 * The stamp pad: every tag at a glance, one click picks the one to stamp. It lies
 * along the bottom of the window, over the page rather than beside it, so no card
 * moves when it opens. At phone width it folds down to the picked tag.
 */
export function StampPad({
	drawings,
	picked,
	status,
	canUndo,
	lingering,
	findRef,
	onPick,
	onGoToCards,
	onUndo,
	onClose,
}: StampPadProps) {
	const { tags, drawingCount } = useMockTags();
	const [find, setFind] = useState("");
	const [creating, setCreating] = useState<string | null>(null);
	const [folded, setFolded] = useState(picked !== null);
	const pad = useRef<HTMLElement>(null);
	const wells = useRef<HTMLDivElement>(null);

	// A touch screen would raise its keyboard over the cards, so only the pad gets focus.
	// biome-ignore lint/correctness/useExhaustiveDependencies: runs when the pad opens and when a form closes.
	useEffect(() => {
		if (creating !== null) return;
		if (matchMedia("(pointer: coarse)").matches) pad.current?.focus();
		else findRef.current?.focus();
	}, [creating]);

	const needle = find.trim().toLocaleLowerCase();
	const shown = findTags(tags, find);

	const onFindKey = (event: KeyboardEvent) => {
		if (event.key === "Escape" && find) {
			event.stopPropagation();
			setFind("");
		} else if (event.key === "ArrowDown") {
			event.preventDefault();
			const target =
				wells.current?.querySelector<HTMLElement>("input:checked") ??
				wells.current?.querySelector<HTMLElement>("input");
			target?.focus();
		} else if (event.key === "Enter") {
			event.preventDefault();
			if (shown.length === 0) return setCreating(find.trim());
			onPick(shown[0]);
			setFind("");
			onGoToCards();
		}
	};

	const onWellKey = (event: KeyboardEvent) => {
		if (event.key === "Enter") {
			event.preventDefault();
			onGoToCards();
			return;
		}
		const moved = moveInGrid(event, wells.current, "input");
		if (moved) moved.click();
		else if (event.key === "ArrowUp") findRef.current?.focus();
	};

	return (
		<aside
			ref={pad}
			id="stamp-pad"
			tabIndex={-1}
			aria-label="Stamp pad"
			className={`${styles.pad} ${folded && picked ? styles.folded : ""}`}
		>
			<div className={styles.hand}>
				<h2>Stamp drawings</h2>
				{picked ? (
					<div className={styles.inHand}>
						<Stamp
							label={picked.label}
							color={picked.color}
							seed={`pad${picked.id}`}
							size="large"
							inked
						/>
						<button type="button" className={styles.change} onClick={() => setFolded(false)}>
							Change
						</button>
					</div>
				) : (
					<div className={styles.empty}>No tag picked</div>
				)}
				<p className={styles.tally}>
					{picked
						? `On ${drawingCount(drawings, picked.id)} of ${drawings.length} drawings`
						: "Pick a tag. Drawings you click first get it too."}
				</p>
				{/* The page's status region announces this; here it is for the eye. */}
				<p className={styles.status}>
					<span aria-hidden="true" className={styles.statusText}>
						{status || (picked ? "Click drawings to stamp or lift." : "")}
					</span>
					{canUndo ? (
						<button
							type="button"
							data-stamp-undo
							className={styles.undo}
							aria-keyshortcuts="Control+Z"
							title="Undo the last stamp or lift (Ctrl+Z)"
							onClick={onUndo}
						>
							Undo
						</button>
					) : null}
				</p>
			</div>
			<div className={styles.work}>
			<div className={styles.line}>
				{creating === null ? (
					<>
						<input
							ref={findRef}
							type="search"
							className={styles.find}
							aria-label="Find a tag to stamp"
							placeholder="Find a tag…"
							value={find}
							onChange={(event) => setFind(event.target.value)}
							onKeyDown={onFindKey}
						/>
						<button
							type="button"
							className={styles.create}
							onClick={() => setCreating(find.trim())}
						>
							<PlusIcon />
							{shown.length === 0 && needle ? `Create “${find.trim()}”` : "New tag"}
						</button>
						<p className={styles.keys}>
							{lingering > 0
								? lingering === 1
									? "1 changed drawing no longer matches and stays until you finish."
									: `${lingering} changed drawings no longer match and stay until you finish.`
								: needle && shown.length > 0
									? `Enter picks ${shown[0].label}`
									: "On a drawing, type to find a tag. Arrows move, Space stamps."}
						</p>
					</>
				) : null}
				<button
					type="button"
					className={styles.done}
					aria-keyshortcuts="Escape"
					onClick={onClose}
				>
					Done
					<kbd aria-hidden="true">Esc</kbd>
				</button>
			</div>
			{creating !== null ? (
				// biome-ignore lint/a11y/noStaticElementInteractions: Escape goes back to the tags and leaves the pad open.
				<div
					className={styles.form}
					onKeyDown={(event) => {
						if (event.key !== "Escape") return;
						event.stopPropagation();
						setCreating(null);
					}}
				>
					<TagForm
						initialLabel={creating}
						drawings={drawings}
						onCancel={() => setCreating(null)}
						onDone={(done) => {
							setFind("");
							setCreating(null);
							if (done) onPick(done);
						}}
					/>
				</div>
			) : (
				<div className={styles.choose}>
					{/* biome-ignore lint/a11y/noStaticElementInteractions: arrow keys move through the grid of radio buttons. */}
					<div
						ref={wells}
						role="radiogroup"
						aria-label="Tag to stamp with"
						className={styles.wells}
						onKeyDown={onWellKey}
					>
							{shown.map((tag, index) => {
								const isPicked = tag.id === picked?.id;
								return (
									<label
										key={tag.id}
										className={`${styles.well} ${needle && index === 0 ? styles.next : ""}`}
									>
										<input
											type="radio"
											name="stamp-pad-tag"
											checked={isPicked}
											onChange={() => onPick(tag)}
											onClick={(event) => {
												// A key press also clicks; only a pointer or tap has a position.
												if (event.detail > 0) setFolded(true);
											}}
										/>
										<Stamp
											label={tag.label}
											color={tag.color}
											seed={`well${tag.id}`}
											inked={isPicked}
											block
										/>
										{isPicked ? (
											<span className={styles.tick}>
												<CheckIcon />
											</span>
										) : null}
									</label>
								);
							})}
					</div>
					{shown.length === 0 ? (
						<p className={styles.none}>No tag is called “{find.trim()}”.</p>
					) : null}
				</div>
			)}
			</div>
		</aside>
	);
}
