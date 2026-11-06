import {
	type CSSProperties,
	type ReactNode,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { moveInRow } from "./grid-keys.ts";
import { type Tag, type TagColor, tagColorVars } from "./mock-tags.ts";
import styles from "./Stamp.module.css";

/** A small angle that stays the same for one stamp on one drawing. */
const tiltOf = (seed: string, reach = 3) => {
	let hash = 7;
	for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 9973;
	const angle = 1 + (hash % (reach * 2)) / 2;
	return `${hash % 2 ? angle : -angle}deg`;
};

const inkVars = (color: TagColor, seed: string, reach?: number) => {
	const { bg, fill, ink, solid } = tagColorVars(color);
	return {
		"--stamp-bg": bg,
		"--stamp-fill": fill,
		"--stamp-ink": ink,
		"--stamp-edge": solid,
		"--tilt": tiltOf(seed, reach),
	} as CSSProperties;
};

/** The worn edge of a rubber stamp. Rendered once; the stamps refer to it. */
export function InkFilter() {
	return (
		<svg aria-hidden="true" className={styles.filter}>
			<filter id="stamp-ink" x="-5%" y="-10%" width="110%" height="120%">
				<feTurbulence
					type="fractalNoise"
					baseFrequency="0.7"
					numOctaves="2"
					seed="4"
					result="grain"
				/>
				<feDisplacementMap in="SourceGraphic" in2="grain" scale="1.1" />
				<feComposite in2="SourceGraphic" operator="over" result="rough" />
				<feColorMatrix
					in="grain"
					values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.2 2.55"
					result="speckle"
				/>
				<feComposite in="rough" in2="speckle" operator="in" />
			</filter>
			{/* Full ink: the same worn edge, and hardly a gap, so small letters stay clean. */}
			<filter id="stamp-ink-full" x="-5%" y="-10%" width="110%" height="120%">
				<feTurbulence
					type="fractalNoise"
					baseFrequency="0.7"
					numOctaves="2"
					seed="4"
					result="grain"
				/>
				<feDisplacementMap in="SourceGraphic" in2="grain" scale="1.1" result="rough" />
				<feColorMatrix
					in="grain"
					values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 2.6"
					result="speckle"
				/>
				<feComposite in="rough" in2="speckle" operator="in" />
			</filter>
		</svg>
	);
}

type StampProps = {
	label: string;
	color: TagColor;
	/** Keeps the angle stable for this stamp on this sheet. */
	seed: string;
	size?: "small" | "large";
	/** Solid ink: the tag that is picked or that made the drawing match. */
	inked?: boolean;
	/** Fills its cell, for a grid of tags. */
	block?: boolean;
	className?: string;
};

export function Stamp({
	label,
	color,
	seed,
	size = "small",
	inked = false,
	block = false,
	className = "",
}: StampProps) {
	return (
		<span
			className={`${styles.stamp} ${size === "large" ? styles.large : ""} ${inked ? styles.inked : ""} ${block ? styles.block : ""} ${className}`}
			style={inkVars(color, seed, size === "large" ? 4 : 3)}
		>
			<span className={styles.text}>{label}</span>
		</span>
	);
}

/** The colour of a tag as a square of ink pad. */
export function InkPad({ color }: { color: TagColor }) {
	return (
		<span
			className={styles.pad}
			style={{ "--pad": tagColorVars(color).solid } as CSSProperties}
		/>
	);
}

type TagToggleProps = {
	tag: Tag;
	seed: string;
	pressed: boolean;
	/** Says what a click does, under the pointer or keyboard. */
	tip?: string;
	tabIndex?: number;
	className?: string;
	hidden?: boolean;
	onToggle: () => void;
	onFocus?: () => void;
};

/** A tag as a button that adds it to the filter or takes it out. */
export function TagToggle({
	tag,
	seed,
	pressed,
	tip,
	tabIndex,
	className = "",
	hidden = false,
	onToggle,
	onFocus,
}: TagToggleProps) {
	return (
		<button
			type="button"
			className={`${styles.toggle} ${className}`}
			data-tag-toggle={tag.id}
			data-hidden={hidden || undefined}
			data-tip={tip}
			aria-label={`Filter by ${tag.label}`}
			aria-pressed={pressed}
			tabIndex={hidden ? -1 : tabIndex}
			onClick={onToggle}
			onFocus={onFocus}
		>
			<Stamp label={tag.label} color={tag.color} seed={seed} inked={pressed} className={styles.fitted} />
		</button>
	);
}

type SheetStampsProps = {
	tags: Tag[];
	seed: string;
	/** The tags that made this drawing match the filter; they come first in `tags`. */
	matched?: readonly string[];
	/** Makes the tags buttons that filter. While stamping they are plain ink instead. */
	filtering?: {
		drawingName: string;
		onToggle: (tagId: string) => void;
		onShowAll: () => void;
	};
	/** Kept free at the end of the line, for the stamp in hand. */
	slot?: ReactNode;
};

const MORE_WIDTH = 34;
const MORE = "more";

const tipFor = (tag: Tag, matched: readonly string[]) => {
	if (matched.includes(tag.id)) return `Stop filtering by ${tag.label}`;
	return matched.length > 0 ? `Also show ${tag.label}` : `Filter by ${tag.label}`;
};

/** The tags in one line along the foot of a sheet; what doesn't fit is "+3". */
export function SheetStamps({ tags, seed, matched = [], filtering, slot }: SheetStampsProps) {
	const ref = useRef<HTMLSpanElement>(null);
	const [fit, setFit] = useState(tags.length);
	// One stop in the tab order per card; arrows reach the other tags.
	const [stop, setStop] = useState<string | null>(null);
	const key = tags.map((tag) => tag.id + tag.label).join();

	// biome-ignore lint/correctness/useExhaustiveDependencies: measures again when the labels change.
	useLayoutEffect(() => {
		const strip = ref.current;
		if (!strip) return;
		const measure = () => {
			const widths = [...strip.querySelectorAll<HTMLElement>("[data-mark]")].map(
				(mark) => mark.offsetWidth,
			);
			let used = 0;
			let count = 0;
			for (const width of widths) {
				const reserve = count + 1 < widths.length ? MORE_WIDTH : 0;
				if (count > 0 && used + width + reserve > strip.clientWidth) break;
				used += width;
				count++;
			}
			setFit(count);
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(strip);
		document.fonts?.ready.then(measure);
		return () => observer.disconnect();
	}, [key]);

	const hidden = tags.slice(fit);

	if (!filtering) {
		return (
			<span className={styles.strip} aria-hidden="true">
				<span ref={ref} className={styles.tags}>
					{tags.map((tag, index) => (
						<span
							key={tag.id}
							data-mark
							className={`${styles.padded} ${index < fit ? styles.mark : styles.markHidden}`}
						>
							<Stamp
								label={tag.label}
								color={tag.color}
								seed={seed + tag.id}
								inked={matched.includes(tag.id)}
								className={styles.fitted}
							/>
						</span>
					))}
					{hidden.length > 0 ? <span className={styles.more}>+{hidden.length}</span> : null}
				</span>
				{slot}
			</span>
		);
	}

	const first = tags[0]?.id ?? MORE;
	const visible = (id: string) => tags.slice(0, fit).some((tag) => tag.id === id);
	const current = stop === MORE && hidden.length > 0 ? MORE : stop && visible(stop) ? stop : first;

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: arrow keys move between the card's tags.
		<span
			className={styles.strip}
			role="group"
			aria-label={`Tags of ${filtering.drawingName}`}
			onKeyDown={(event) =>
				moveInRow(event, ref.current, "button:not([data-hidden])")
			}
		>
			<span ref={ref} className={styles.tags}>
				{tags.map((tag, index) => (
					<span
						key={tag.id}
						data-mark
						className={index < fit ? styles.mark : styles.markHidden}
					>
						<TagToggle
							tag={tag}
							seed={seed + tag.id}
							pressed={matched.includes(tag.id)}
							tip={tipFor(tag, matched)}
							hidden={index >= fit}
							tabIndex={tag.id === current ? 0 : -1}
							onToggle={() => filtering.onToggle(tag.id)}
							onFocus={() => setStop(tag.id)}
						/>
					</span>
				))}
				{hidden.length > 0 ? (
					<button
						type="button"
						className={`${styles.more} ${styles.moreButton}`}
						aria-label={`Show all ${tags.length} tags of ${filtering.drawingName}`}
						title={hidden.map((tag) => tag.label).join(", ")}
						tabIndex={current === MORE ? 0 : -1}
						onClick={filtering.onShowAll}
						onFocus={() => setStop(MORE)}
					>
						+{hidden.length}
					</button>
				) : null}
			</span>
		</span>
	);
}
