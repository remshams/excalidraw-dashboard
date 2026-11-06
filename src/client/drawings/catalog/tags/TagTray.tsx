import { type KeyboardEvent, type RefObject, useEffect, useRef, useState } from "react";
import type { DrawingSummary } from "../../../../shared/types.ts";
import { CheckIcon, PencilIcon, PlusIcon, TagIcon } from "../icons.tsx";
import { moveInGrid } from "./grid-keys.ts";
import { findTags, type Tag, useMockTags } from "./mock-tags.ts";
import { InkPad } from "./Stamp.tsx";
import { TagForm } from "./TagForm.tsx";
import styles from "./TagTray.module.css";

type View = { kind: "list" } | { kind: "create"; label: string } | { kind: "edit"; tag: Tag };

type TagTrayProps = {
	drawings: DrawingSummary[];
	buttonRef: RefObject<HTMLButtonElement | null>;
};

/** The "Tags" button and its tray: a checklist that filters, and tag management. */
export function TagTray({ drawings, buttonRef }: TagTrayProps) {
	const { tags, selectedTagIds, toggleSelected, clearSelected, drawingCount } = useMockTags();
	const [open, setOpen] = useState(false);
	const [view, setView] = useState<View>({ kind: "list" });
	const [find, setFind] = useState("");
	const [activeId, setActiveId] = useState<string | null>(null);
	const wrap = useRef<HTMLDivElement>(null);
	const search = useRef<HTMLInputElement>(null);
	const list = useRef<HTMLUListElement>(null);
	const returnTo = useRef<string | null>(null);

	useEffect(() => {
		if (!open) return;
		const outside = (event: PointerEvent) => {
			if (!wrap.current?.contains(event.target as Node)) setOpen(false);
		};
		document.addEventListener("pointerdown", outside);
		return () => document.removeEventListener("pointerdown", outside);
	}, [open]);

	useEffect(() => {
		if (!open || view.kind !== "list") return;
		const row = returnTo.current
			? list.current?.querySelector<HTMLElement>(`[data-tag-id="${returnTo.current}"]`)
			: null;
		(row ?? search.current)?.focus();
		returnTo.current = null;
	}, [open, view]);

	const needle = find.trim().toLocaleLowerCase();
	const shown = findTags(tags, find);
	const count = selectedTagIds.length;
	const toggle = (tag: Tag) => toggleSelected(tag.id);
	const create = () => setView({ kind: "create", label: find.trim() });
	// One stop in the tab order for the checklist: the row last used, with its pencil.
	const tabRow = shown.some((tag) => tag.id === activeId) ? activeId : shown[0]?.id;

	const back = (tagId?: string | null) => {
		returnTo.current = tagId ?? null;
		setView({ kind: "list" });
	};

	const onFindKey = (event: KeyboardEvent) => {
		// Escape clears the text first, then closes the tray.
		if (event.key === "Escape" && find) {
			event.stopPropagation();
			setFind("");
		} else if (event.key === "ArrowDown") {
			event.preventDefault();
			list.current?.querySelector<HTMLElement>("input")?.focus();
		} else if (event.key === "Enter") {
			event.preventDefault();
			if (shown.length === 0) return create();
			if (!needle) return;
			toggle(shown[0]);
			setFind("");
		}
	};

	const onListKey = (event: KeyboardEvent) => {
		if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
			event.preventDefault();
			event.target.click();
			return;
		}
		const moved = moveInGrid(event, list.current, "input");
		if (!moved && event.key === "ArrowUp") search.current?.focus();
	};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: closes the tray on Escape and when focus leaves.
		<div
			ref={wrap}
			className={styles.wrap}
			onKeyDown={(event) => {
				if (event.key !== "Escape" || !open) return;
				event.stopPropagation();
				if (view.kind !== "list") return back(view.kind === "edit" ? view.tag.id : null);
				setOpen(false);
				buttonRef.current?.focus();
			}}
			onBlur={(event) => {
				const next = event.relatedTarget as Node | null;
				if (next && !wrap.current?.contains(next)) setOpen(false);
			}}
		>
			<button
				ref={buttonRef}
				type="button"
				className={styles.button}
				aria-expanded={open}
				aria-haspopup="dialog"
				aria-label={count ? `Tags, ${count} selected in the filter` : "Tags"}
				onClick={() => setOpen(!open)}
			>
				<TagIcon />
				Tags
				{count ? <span className={styles.badge}>{count}</span> : null}
			</button>
			{open ? (
				<div
					role="dialog"
					aria-label="Filter by tag"
					className={`${styles.tray} ${view.kind === "list" ? "" : styles.narrow}`}
				>
					{view.kind !== "list" ? (
						<TagForm
							tag={view.kind === "edit" ? view.tag : undefined}
							initialLabel={view.kind === "create" ? view.label : ""}
							drawings={drawings}
							onCancel={() => back(view.kind === "edit" ? view.tag.id : null)}
							onDone={(done) => {
								setFind("");
								back(done?.id);
							}}
						/>
					) : (
						<>
							<input
								ref={search}
								type="search"
								className={styles.find}
								aria-label="Find a tag"
								placeholder="Find a tag…"
								value={find}
								onChange={(event) => setFind(event.target.value)}
								onKeyDown={onFindKey}
							/>
							{/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: arrow keys move between the checkboxes. */}
							<ul ref={list} className={styles.rows} aria-label="Tags" onKeyDown={onListKey}>
								{shown.map((tag, index) => {
									const stop = tag.id === tabRow ? 0 : -1;
									const drawingsWith = drawingCount(drawings, tag.id);
									return (
										<li
											key={tag.id}
											className={`${styles.row} ${needle && index === 0 ? styles.next : ""}`}
											onFocus={() => setActiveId(tag.id)}
										>
											<label className={styles.check}>
												<input
													type="checkbox"
													tabIndex={stop}
													data-tag-id={tag.id}
													checked={selectedTagIds.includes(tag.id)}
													onChange={() => toggle(tag)}
												/>
												<span className={styles.box} aria-hidden="true">
													<CheckIcon />
												</span>
												<InkPad color={tag.color} />
												<span className={styles.label}>{tag.label}</span>
												<span className={styles.count}>
													{drawingsWith}
													<span className={styles.sr}>
														{drawingsWith === 1 ? " drawing" : " drawings"}
													</span>
												</span>
											</label>
											<button
												type="button"
												className={styles.tool}
												tabIndex={stop}
												aria-label={`Change ${tag.label}`}
												title="Rename, recolour or delete"
												onClick={() => setView({ kind: "edit", tag })}
											>
												<PencilIcon />
											</button>
										</li>
									);
								})}
							</ul>
							{shown.length === 0 ? (
								<p className={styles.none}>No tag is called “{find.trim()}”.</p>
							) : null}
							<div className={styles.footer}>
								<button type="button" className={styles.action} onClick={create}>
									<PlusIcon />
									{shown.length === 0 && needle ? `Create “${find.trim()}”` : "New tag"}
								</button>
								<span className={styles.hint}>
									{needle && shown.length > 0
										? `Enter ticks ${shown[0].label}`
										: "Drawings with any ticked tag show."}
								</span>
								{count ? (
									<button
										type="button"
										className={styles.action}
										onClick={() => {
											search.current?.focus();
											clearSelected();
										}}
									>
										Clear filter
									</button>
								) : null}
							</div>
						</>
					)}
				</div>
			) : null}
		</div>
	);
}
