import type { CSSProperties, ReactNode } from "react";
import { useRef } from "react";
import { MAX_WIDTH, MIN_WIDTH, useSidebar } from "./use-sidebar.ts";

type SidebarProps = {
	/** What the sidebar holds, used in the button and handle names. */
	label: string;
	/** Renders the content and places the button that hides the sidebar. */
	children: (hideButton: ReactNode) => ReactNode;
};

/** A resizable sidebar that collapses to a thin rail. */
export function Sidebar({ label, children }: SidebarProps) {
	const { width, collapsed, setCollapsed, resizeHandle } = useSidebar();
	const toggled = useRef(false);
	// Each state has its own toggle; focus the new one after a toggle press.
	const focusAfterToggle = (button: HTMLButtonElement | null) => {
		if (!button || !toggled.current) return;
		toggled.current = false;
		button.focus();
	};
	const toggle = (
		<SidebarToggle
			label={label}
			collapsed={collapsed}
			buttonRef={focusAfterToggle}
			onToggle={() => {
				toggled.current = true;
				setCollapsed(!collapsed);
			}}
		/>
	);

	if (collapsed) {
		return <div className="sidebar collapsed">{toggle}</div>;
	}

	return (
		<div
			className="sidebar"
			style={{ "--sidebar-width": `${width}px` } as CSSProperties}
		>
			{children(toggle)}
			{/* biome-ignore lint/a11y/useSemanticElements: <hr> cannot be focused or dragged. */}
			<div
				className="resize-handle"
				role="separator"
				aria-orientation="vertical"
				aria-label={`Resize ${label}`}
				aria-valuemin={MIN_WIDTH}
				aria-valuemax={MAX_WIDTH}
				aria-valuenow={width}
				tabIndex={0}
				{...resizeHandle}
			/>
		</div>
	);
}

type SidebarToggleProps = {
	label: string;
	collapsed: boolean;
	buttonRef: (button: HTMLButtonElement | null) => void;
	onToggle: () => void;
};

function SidebarToggle({
	label,
	collapsed,
	buttonRef,
	onToggle,
}: SidebarToggleProps) {
	return (
		<button
			ref={buttonRef}
			type="button"
			className="icon"
			aria-label={`${collapsed ? "Show" : "Hide"} ${label}`}
			aria-expanded={!collapsed}
			onClick={onToggle}
		>
			<PanelIcon open={collapsed} />
		</button>
	);
}

/** A panel with an arrow that points the way the sidebar will move. */
function PanelIcon({ open }: { open: boolean }) {
	return (
		<svg
			aria-hidden="true"
			width={18}
			height={18}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.75}
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<rect x="3" y="4" width="18" height="16" rx="2" />
			<path d="M9 4v16" />
			<path d={open ? "M13 10l2 2-2 2" : "M16 10l-2 2 2 2"} />
		</svg>
	);
}
