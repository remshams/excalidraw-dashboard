import { type RefObject, useEffect, useRef, useState } from "react";
import type { DrawingSummary } from "../../../../shared/types.ts";
import { CloseIcon, StampIcon } from "../icons.tsx";
import { type Tag, useMockTags } from "./mock-tags.ts";
import { Stamp } from "./Stamp.tsx";
import styles from "./StampFilter.module.css";
import { StampPicker } from "./StampPicker.tsx";

type StampFilterProps = {
	drawings: DrawingSummary[];
	buttonRef: RefObject<HTMLButtonElement | null>;
	onPickUp: (tag: Tag) => void;
};

/** The "Stamps" button with the tray it opens. */
export function StampFilter({ drawings, buttonRef, onPickUp }: StampFilterProps) {
	const { selectedTagIds, toggleSelected, clearSelected } = useMockTags();
	const [open, setOpen] = useState(false);
	const wrap = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const outside = (event: PointerEvent) => {
			if (!wrap.current?.contains(event.target as Node)) setOpen(false);
		};
		document.addEventListener("pointerdown", outside);
		return () => document.removeEventListener("pointerdown", outside);
	}, [open]);

	const count = selectedTagIds.length;

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: closes the tray on Escape and when focus leaves.
		<div
			ref={wrap}
			className={styles.wrap}
			onKeyDown={(event) => {
				if (event.key !== "Escape" || !open) return;
				event.stopPropagation();
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
				aria-label={count ? `Stamps, ${count} selected` : "Stamps"}
				onClick={() => setOpen(!open)}
			>
				<StampIcon />
				Stamps
				{count ? <span className={styles.count}>{count}</span> : null}
			</button>
			{open ? (
				<div role="dialog" aria-label="Stamp tray" className={styles.tray}>
					<StampPicker
						drawings={drawings}
						showCounts
						isChecked={(tag) => selectedTagIds.includes(tag.id)}
						onToggle={(tag) => toggleSelected(tag.id)}
						onPickUp={(tag) => {
							setOpen(false);
							onPickUp(tag);
						}}
						footer={
							<span className={styles.hint}>
								<StampIcon /> picks up a stamp
							</span>
						}
					/>
					{count ? (
						<button
							type="button"
							className={styles.clear}
							onClick={() => {
								// The button goes away with the selection.
								wrap.current
									?.querySelector<HTMLElement>("input[type=search]")
									?.focus();
								clearSelected();
							}}
						>
							Clear selection
						</button>
					) : null}
				</div>
			) : null}
		</div>
	);
}

type RemovableStampProps = {
	tag: Tag;
	seed: string;
	removeLabel: string;
	onRemove: (button: HTMLButtonElement) => void;
};

/** A stamp with a button that takes it away. */
export function RemovableStamp({
	tag,
	seed,
	removeLabel,
	onRemove,
}: RemovableStampProps) {
	return (
		<button
			type="button"
			className={styles.removable}
			aria-label={removeLabel}
			title={removeLabel}
			onClick={(event) => onRemove(event.currentTarget)}
		>
			<Stamp label={tag.label} color={tag.color} seed={seed} />
			<CloseIcon />
		</button>
	);
}

/** The stamps in the filter as a line under the header, so they stay in view. */
export function ActiveStamps({
	buttonRef,
}: {
	buttonRef: RefObject<HTMLButtonElement | null>;
}) {
	const { tags, selectedTagIds, toggleSelected, clearSelected } = useMockTags();
	const selected = tags.filter((tag) => selectedTagIds.includes(tag.id));
	if (selected.length === 0) return null;

	return (
		<div className={styles.active}>
			<span className={styles.activeLabel}>Showing drawings with</span>
			{selected.map((tag) => (
				<RemovableStamp
					key={tag.id}
					tag={tag}
					seed={`filter${tag.id}`}
					removeLabel={`Remove ${tag.label} from the filter`}
					onRemove={(button) => {
						const next = button.nextElementSibling as HTMLElement | null;
						if (selected.length > 1) next?.focus();
						else buttonRef.current?.focus();
						toggleSelected(tag.id);
					}}
				/>
			))}
			<button
				type="button"
				className={styles.clearAll}
				onClick={() => {
					buttonRef.current?.focus();
					clearSelected();
				}}
			>
				Clear
			</button>
		</div>
	);
}
