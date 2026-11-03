// Line icons in the stroke style of Excalidraw's toolbar. Each one is
// decorative: the button or link around it carries the name.

const iconProps = {
	width: 18,
	height: 18,
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 1.75,
	strokeLinecap: "round",
	strokeLinejoin: "round",
} as const;

export function PlusIcon() {
	return (
		<svg aria-hidden="true" {...iconProps}>
			<path d="M12 5v14M5 12h14" />
		</svg>
	);
}

export function PencilIcon() {
	return (
		<svg aria-hidden="true" {...iconProps}>
			<path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z" />
			<path d="M14.5 6.5l3 3" />
		</svg>
	);
}

export function TrashIcon() {
	return (
		<svg aria-hidden="true" {...iconProps}>
			<path d="M4 7h16M10 11v6M14 11v6" />
			<path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
		</svg>
	);
}

export function BackIcon() {
	return (
		<svg aria-hidden="true" {...iconProps}>
			<path d="M19 12H5M11 6l-6 6 6 6" />
		</svg>
	);
}
