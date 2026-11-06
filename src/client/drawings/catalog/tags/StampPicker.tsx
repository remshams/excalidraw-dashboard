import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import type { DrawingSummary } from "../../../../shared/types.ts";
import { PencilIcon, PlusIcon, StampIcon } from "../icons.tsx";
import { type Tag, useMockTags } from "./mock-tags.ts";
import { InkPad } from "./Stamp.tsx";
import { StampForm } from "./StampForm.tsx";
import styles from "./StampPicker.module.css";

type View =
	| { kind: "list" }
	| { kind: "create"; label: string }
	| { kind: "edit"; tag: Tag };

type StampPickerProps = {
	/** All drawings, for counts and for deleting a stamp. */
	drawings: DrawingSummary[];
	isChecked: (tag: Tag) => boolean;
	onToggle: (tag: Tag) => void;
	showCounts?: boolean;
	/** Picks the stamp up. Without it, rows don't offer that. */
	onPickUp?: (tag: Tag) => void;
	onCreated?: (tag: Tag) => void;
	/** Shown next to "New stamp". */
	footer?: React.ReactNode;
};

/**
 * The searchable list of every stamp with a checkbox, plus cutting and changing
 * stamps. The stamp tray and a drawing's own stamps both use it.
 */
export function StampPicker({
	drawings,
	isChecked,
	onToggle,
	showCounts = false,
	onPickUp,
	onCreated,
	footer,
}: StampPickerProps) {
	const { tags, drawingCount } = useMockTags();
	const [view, setView] = useState<View>({ kind: "list" });
	const [find, setFind] = useState("");
	const search = useRef<HTMLInputElement>(null);
	const list = useRef<HTMLUListElement>(null);
	const returnTo = useRef<string | null>(null);

	useEffect(() => {
		if (view.kind !== "list") return;
		const row = returnTo.current
			? list.current?.querySelector<HTMLInputElement>(
					`[data-tag-id="${returnTo.current}"]`,
				)
			: null;
		(row ?? search.current)?.focus();
		returnTo.current = null;
	}, [view]);

	if (view.kind !== "list") {
		const tag = view.kind === "edit" ? view.tag : undefined;
		const back = (tagId?: string) => {
			returnTo.current = tagId ?? tag?.id ?? null;
			setView({ kind: "list" });
		};
		return (
			// biome-ignore lint/a11y/noStaticElementInteractions: Escape steps back to the list instead of closing.
			<div
				onKeyDown={(event: KeyboardEvent) => {
					if (event.key !== "Escape") return;
					event.preventDefault();
					event.stopPropagation();
					back();
				}}
			>
				<StampForm
					tag={tag}
					initialLabel={view.kind === "create" ? view.label : ""}
					drawings={drawings}
					onCancel={() => back()}
					onDone={(done) => {
						if (done && !tag) {
							setFind("");
							onCreated?.(done);
						}
						if (done) back(done.id);
						else {
							returnTo.current = null;
							setView({ kind: "list" });
						}
					}}
				/>
			</div>
		);
	}

	const needle = find.trim().toLocaleLowerCase();
	const shown = tags.filter((tag) =>
		tag.label.toLocaleLowerCase().includes(needle),
	);
	const newStamp = () => setView({ kind: "create", label: find.trim() });

	return (
		<>
			<input
				ref={search}
				type="search"
				className={styles.find}
				aria-label="Find a stamp"
				placeholder="Find a stamp…"
				value={find}
				onChange={(event) => setFind(event.target.value)}
				onKeyDown={(event) => {
					// Escape clears the text first, then closes what's around the picker.
					if (event.key === "Escape" && find) {
						event.preventDefault();
						event.stopPropagation();
						setFind("");
						return;
					}
					if (event.key !== "Enter") return;
					event.preventDefault();
					if (shown.length === 1) onToggle(shown[0]);
					else if (shown.length === 0) newStamp();
				}}
			/>
			<ul ref={list} className={styles.rows} aria-label="Stamps">
				{shown.map((tag) => (
					<li key={tag.id} className={styles.row}>
						<label className={styles.check}>
							<input
								type="checkbox"
								data-tag-id={tag.id}
								checked={isChecked(tag)}
								onChange={() => onToggle(tag)}
							/>
							<InkPad color={tag.color} />
							<span className={styles.label}>{tag.label}</span>
							{showCounts ? (
								<span className={styles.count}>
									{drawingCount(drawings, tag.id)}
									<span className={styles.sr}>
										{drawingCount(drawings, tag.id) === 1
											? " drawing"
											: " drawings"}
									</span>
								</span>
							) : null}
						</label>
						<button
							type="button"
							className={styles.tool}
							aria-label={`Change ${tag.label}`}
							title="Rename, recolour or delete"
							onClick={() => setView({ kind: "edit", tag })}
						>
							<PencilIcon />
						</button>
						{onPickUp ? (
							<button
								type="button"
								className={styles.tool}
								aria-label={`Stamp drawings with ${tag.label}`}
								title="Stamp drawings"
								onClick={() => onPickUp(tag)}
							>
								<StampIcon />
							</button>
						) : null}
					</li>
				))}
			</ul>
			{shown.length === 0 ? (
				<p className={styles.none}>No stamp is called “{find.trim()}”.</p>
			) : null}
			<div className={styles.footer}>
				<button type="button" className={styles.new} onClick={newStamp}>
					<PlusIcon />
					{shown.length === 0 && needle
						? `Create “${find.trim()}”`
						: "New stamp"}
				</button>
				{footer}
			</div>
		</>
	);
}
