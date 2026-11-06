import { Fragment, type RefObject, useRef } from "react";
import { CloseIcon } from "../icons.tsx";
import { type Tag, useMockTags } from "./mock-tags.ts";
import { Stamp } from "./Stamp.tsx";
import styles from "./ActiveFilter.module.css";

type RemovableStampProps = {
	tag: Tag;
	seed: string;
	removeLabel: string;
	onRemove: (button: HTMLButtonElement) => void;
};

/** A tag with a button that takes it away. */
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
			<Stamp label={tag.label} color={tag.color} seed={seed} inked />
			<CloseIcon />
		</button>
	);
}

type ActiveFilterProps = {
	buttonRef: RefObject<HTMLButtonElement | null>;
	/** The trimmed search text. */
	searched: string;
	shown: number;
	total: number;
	/** Cards a stamping session keeps in view though they no longer match. */
	lingering: number;
};

/** The tags in the filter as a sentence under the header, so the OR explains itself. */
export function ActiveFilter({
	buttonRef,
	searched,
	shown,
	total,
	lingering,
}: ActiveFilterProps) {
	const { tags, selectedTagIds, toggleSelected, clearSelected } = useMockTags();
	const row = useRef<HTMLDivElement>(null);
	const selected = tags.filter((tag) => selectedTagIds.includes(tag.id));
	if (selected.length === 0) return null;

	return (
		<div ref={row} className={styles.active} role="group" aria-label="Active filter">
			<span className={styles.words}>Drawings with</span>
			{selected.map((tag, index) => (
				<Fragment key={tag.id}>
					{index > 0 ? <span className={styles.or}>or</span> : null}
					<RemovableStamp
						tag={tag}
						seed={`filter${tag.id}`}
						removeLabel={`Remove ${tag.label} from the filter`}
						onRemove={(button) => {
							const buttons = [...(row.current?.querySelectorAll("button") ?? [])];
							const next = buttons[buttons.indexOf(button) + 1];
							if (selected.length > 1) next?.focus();
							else buttonRef.current?.focus();
							toggleSelected(tag.id);
						}}
					/>
				</Fragment>
			))}
			{searched ? <span className={styles.words}>named “{searched}”</span> : null}
			<span className={styles.count}>
				{shown} of {total}
			</span>
			{lingering > 0 ? (
				<span className={styles.lingering}>
					{lingering === 1
						? "1 changed drawing no longer matches and stays until the pad closes"
						: `${lingering} changed drawings no longer match and stay until the pad closes`}
				</span>
			) : null}
			<button
				type="button"
				className={styles.clear}
				onClick={() => {
					buttonRef.current?.focus();
					clearSelected();
				}}
			>
				Clear filter
			</button>
		</div>
	);
}
