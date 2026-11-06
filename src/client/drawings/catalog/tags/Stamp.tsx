import {
	type CSSProperties,
	type MouseEvent,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
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
	const { bg, ink, solid } = tagColorVars(color);
	return {
		"--stamp-bg": bg,
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

type SheetStampsProps = {
	tags: Tag[];
	seed: string;
	/** The tags that made this drawing match the filter; they come first in `tags`. */
	matched?: readonly string[];
	/** Clicking the "+3" opens the drawing's tags instead of the drawing. */
	onShowAll?: () => void;
};

const MORE_WIDTH = 34;
const GAP = 4;

/** The tags in one line along the foot of a sheet; what doesn't fit is "+3". */
export function SheetStamps({ tags, seed, matched = [], onShowAll }: SheetStampsProps) {
	const ref = useRef<HTMLSpanElement>(null);
	const [fit, setFit] = useState(tags.length);
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
				used += width + GAP;
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
	const showAll = (event: MouseEvent) => {
		event.preventDefault();
		event.stopPropagation();
		onShowAll?.();
	};

	return (
		<span ref={ref} className={styles.strip} aria-hidden="true">
			{tags.map((tag, index) => (
				<span
					key={tag.id}
					data-mark
					className={index < fit ? styles.mark : styles.markHidden}
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
			{hidden.length > 0 ? (
				// biome-ignore lint/a11y/noStaticElementInteractions: a pointer shortcut; the card's tags button is the accessible way.
				// biome-ignore lint/a11y/useKeyWithClickEvents: as above.
				<span
					className={styles.more}
					title={hidden.map((tag) => tag.label).join(", ")}
					onClick={onShowAll ? showAll : undefined}
				>
					+{hidden.length}
				</span>
			) : null}
		</span>
	);
}
