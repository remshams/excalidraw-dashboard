import type { CSSProperties } from "react";
import type { TagColor } from "#shared/tags.ts";
import styles from "./TagMark.module.css";

/** A small angle that stays the same for one tag. */
function tiltOf(seed: string) {
	let hash = 7;
	for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 9973;
	const angle = 1 + (hash % 8) / 2;
	return `${hash % 2 ? angle : -angle}deg`;
}

/** The worn edge of the ink. Rendered once; every mark refers to it by its ID. */
export function TagInkFilter() {
	return (
		<svg aria-hidden="true" className={styles.filter}>
			<filter id="tag-ink" x="-5%" y="-10%" width="110%" height="120%">
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
			{/* Full ink: the same worn edge with fewer gaps, so small letters on it stay clean. */}
			<filter id="tag-ink-full" x="-5%" y="-10%" width="110%" height="120%">
				<feTurbulence
					type="fractalNoise"
					baseFrequency="0.7"
					numOctaves="2"
					seed="4"
					result="grain"
				/>
				<feDisplacementMap
					in="SourceGraphic"
					in2="grain"
					scale="1.1"
					result="rough"
				/>
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

type TagMarkProps = {
	label: string;
	color: TagColor;
	/** Keeps the angle the same for this tag. */
	seed: string;
	/** A smaller mark, for the foot of a card and the filter row. */
	small?: boolean;
	/** Solid ink, for a tag in the filter. */
	inked?: boolean;
};

/** A tag's label in its colour, inked by hand with a double edge and never quite straight. */
export function TagMark({ label, color, seed, small, inked }: TagMarkProps) {
	const className = [styles.mark, small && styles.small, inked && styles.inked]
		.filter(Boolean)
		.join(" ");
	return (
		<span
			className={className}
			style={
				{
					"--mark-ink": `var(--tag-${color}-ink)`,
					"--mark-edge": `var(--tag-${color}-solid)`,
					"--tilt": tiltOf(seed),
				} as CSSProperties
			}
		>
			<span className={styles.text} title={label}>
				{label}
			</span>
		</span>
	);
}
