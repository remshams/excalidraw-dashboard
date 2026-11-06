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

export function SearchIcon() {
	return (
		<svg aria-hidden="true" {...iconProps}>
			<circle cx="11" cy="11" r="6.5" />
			<path d="M16 16l4.5 4.5" />
		</svg>
	);
}

export function StampIcon() {
	return (
		<svg aria-hidden="true" {...iconProps}>
			<circle cx="12" cy="6" r="3" />
			<path d="M10.5 9v4M13.5 9v4" />
			<rect x="4" y="13" width="16" height="4" rx="1" />
			<path d="M6 20.5h12" />
		</svg>
	);
}

export function CloseIcon() {
	return (
		<svg aria-hidden="true" {...iconProps} width={12} height={12}>
			<path d="M6 6l12 12M18 6L6 18" />
		</svg>
	);
}
