import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DrawingSummary } from "../../shared/types.ts";
import { QuickSwitcher, switcherResults } from "./QuickSwitcher.tsx";

const drawing = (
	id: string,
	name: string,
	updatedAt: string,
	hasPreview = false,
): DrawingSummary => ({ id, name, createdAt: "", updatedAt, hasPreview });

const drawings = [
	drawing("1", "Plan", "2026-01-01", true),
	drawing("2", "Roadmap", "2026-03-01"),
	drawing("3", "Garden plan", "2026-02-01"),
];

function setup() {
	const props = { onOpen: vi.fn(), onCreate: vi.fn(), onClose: vi.fn() };
	render(<QuickSwitcher drawings={drawings} currentId="2" {...props} />);
	return { ...props, user: userEvent.setup() };
}

const options = () =>
	screen.getAllByRole("option").map((option) => option.textContent);

describe("switcherResults", () => {
	it("lists matching drawings by recency, then offers to create the name", () => {
		expect(switcherResults(drawings, " pla ")).toEqual([
			{ kind: "drawing", drawing: drawings[2] },
			{ kind: "drawing", drawing: drawings[0] },
			{ kind: "create", name: "pla" },
		]);
	});

	it("offers no create entry for an empty query or a taken name", () => {
		expect(switcherResults(drawings, "").map((r) => r.kind)).toEqual([
			"drawing",
			"drawing",
			"drawing",
		]);
		expect(switcherResults(drawings, "plan").at(-1)?.kind).toBe("drawing");
	});
});

describe("QuickSwitcher", () => {
	it("focuses the search and marks the open drawing", () => {
		setup();

		expect(screen.getByRole("combobox")).toHaveFocus();
		expect(options()).toEqual(["RoadmapOpen", "Garden plan", "Plan"]);
		expect(
			screen.getAllByRole("presentation").map((img) => img.getAttribute("src")),
		).toEqual(["/api/drawings/1/preview?v=2026-01-01"]);
	});

	it("opens the drawing chosen with the arrow keys", async () => {
		const { user, onOpen, onClose } = setup();

		await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowUp}{Enter}");

		expect(onClose).toHaveBeenCalled();
		expect(onOpen).toHaveBeenCalledWith("1");
	});

	it("wraps around from the first result to the last", async () => {
		const { user, onOpen } = setup();

		await user.keyboard("{ArrowUp}{Enter}");

		expect(onOpen).toHaveBeenCalledWith("1");
	});

	it("opens a clicked drawing", async () => {
		const { user, onOpen } = setup();

		await user.click(screen.getByRole("option", { name: "Garden plan" }));

		expect(onOpen).toHaveBeenCalledWith("3");
	});

	it("creates a drawing from a new name", async () => {
		const { user, onCreate, onOpen } = setup();

		await user.type(screen.getByRole("combobox"), "Ideas{Enter}");

		expect(options()).toEqual(["+Create “Ideas”"]);
		expect(onCreate).toHaveBeenCalledWith("Ideas");
		expect(onOpen).not.toHaveBeenCalled();
	});

	it("does nothing on Enter or arrow keys without results", async () => {
		const onClose = vi.fn();
		render(
			<QuickSwitcher
				drawings={[]}
				currentId="2"
				onOpen={vi.fn()}
				onCreate={vi.fn()}
				onClose={onClose}
			/>,
		);

		await userEvent.keyboard("{ArrowDown}{Enter}");

		expect(screen.queryByRole("option")).toBeNull();
		expect(onClose).not.toHaveBeenCalled();
	});

	it("closes on Escape and on a click beside it", async () => {
		const { user, onClose } = setup();

		await user.keyboard("{Escape}");
		await user.click(screen.getByRole("dialog").parentElement as HTMLElement);
		await user.click(screen.getByRole("dialog"));

		expect(onClose).toHaveBeenCalledTimes(2);
	});
});
