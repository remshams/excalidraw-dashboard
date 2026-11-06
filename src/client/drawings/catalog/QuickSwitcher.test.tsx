import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DrawingSummary } from "../../../shared/types.ts";
import { QuickSwitcher } from "./QuickSwitcher.tsx";

const summary = (
	id: string,
	name: string,
	updatedAt: string,
): DrawingSummary => ({
	id,
	name,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt,
	previewUpdatedAt: null,
});

const drawings = [
	summary("1", "Garden", "2026-03-01T00:00:00.000Z"),
	summary("2", "Kitchen", "2026-05-01T00:00:00.000Z"),
	summary("3", "Weekend", "2026-04-01T00:00:00.000Z"),
];

function setup(openDrawingId: string | null = "3") {
	const handlers = {
		onOpen: vi.fn(),
		onCreate: vi.fn(),
		onClose: vi.fn(),
	};
	const switcher = (list: DrawingSummary[]) => (
		<QuickSwitcher
			drawings={list}
			openDrawingId={openDrawingId}
			{...handlers}
		/>
	);
	const { rerender } = render(switcher(drawings));
	return {
		...handlers,
		user: userEvent.setup(),
		showDrawings: (list: DrawingSummary[]) => rerender(switcher(list)),
	};
}

const search = () =>
	screen.getByRole("combobox", { name: "Find or create a drawing" });
const rows = () =>
	screen.getAllByRole("option").map((row) => row.textContent?.trim());
const selectedRow = () => screen.getByRole("option", { selected: true });

describe("QuickSwitcher", () => {
	it("lists the drawings most recently edited first and leaves the list in its order", () => {
		const before = [...drawings];

		setup();

		expect(rows()).toEqual(["Kitchen", "Weekend Open", "Garden"]);
		expect(drawings).toEqual(before);
	});

	it("marks only the open drawing", () => {
		setup("1");

		expect(screen.getAllByText("Open")).toHaveLength(1);
		expect(screen.getByRole("option", { name: /Garden/ })).toHaveTextContent(
			"Open",
		);
	});

	it("filters by name while typing and selects the first match", async () => {
		const { user } = setup();

		await user.type(search(), "en{ArrowDown}{ArrowDown}");
		expect(selectedRow()).toHaveTextContent("Garden");

		await user.keyboard("d");

		expect(rows()).toEqual(["Weekend Open", "Create “end”"]);
		expect(selectedRow()).toHaveTextContent("Weekend");
	});

	it("points the search field at the selected row", async () => {
		const { user } = setup();

		await user.type(search(), "{ArrowDown}");

		expect(search()).toHaveAttribute("aria-activedescendant", selectedRow().id);
	});

	it("moves the selection with the arrow keys and wraps around", async () => {
		const { user } = setup();
		expect(selectedRow()).toHaveTextContent("Kitchen");

		await user.type(search(), "{ArrowUp}");
		expect(selectedRow()).toHaveTextContent("Garden");

		await user.keyboard("{ArrowDown}");
		expect(selectedRow()).toHaveTextContent("Kitchen");

		await user.keyboard("{ArrowDown}");
		expect(selectedRow()).toHaveTextContent("Weekend");
	});

	it("opens the selected drawing with Enter and closes", async () => {
		const { user, onOpen, onClose } = setup();

		await user.type(search(), "{ArrowDown}{ArrowDown}{Enter}");

		expect(onOpen).toHaveBeenCalledExactlyOnceWith("1");
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("ignores the repeats of a held Enter", () => {
		const { onOpen } = setup();

		fireEvent.keyDown(search(), { key: "Enter", repeat: true });

		expect(onOpen).not.toHaveBeenCalled();
	});

	it.each([
		["a composition is active", { isComposing: true }],
		["the key belongs to an input method", { keyCode: 229 }],
	])("leaves Enter and Escape alone while %s", (_case, composing) => {
		const { onOpen, onClose } = setup();

		fireEvent.keyDown(search(), { key: "Enter", ...composing });
		fireEvent.keyDown(search(), { key: "Escape", ...composing });

		expect(onOpen).not.toHaveBeenCalled();
		expect(onClose).not.toHaveBeenCalled();
	});

	it("selects the row under the pointer and opens it on a click", async () => {
		const { user, onOpen, onClose } = setup();
		const garden = screen.getByRole("option", { name: "Garden" });

		await user.hover(garden);
		expect(garden).toHaveAttribute("aria-selected", "true");

		await user.click(garden);
		expect(onOpen).toHaveBeenCalledExactlyOnceWith("1");
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("keeps the selected row when a save reorders the rows", () => {
		const { showDrawings } = setup();
		expect(selectedRow()).toHaveTextContent("Kitchen");

		showDrawings([
			summary("1", "Garden", "2026-06-01T00:00:00.000Z"),
			drawings[1],
			drawings[2],
		]);

		expect(rows()[0]).toBe("Garden");
		expect(selectedRow()).toHaveTextContent("Kitchen");
	});

	it("handles the keys with the focus outside the search field", () => {
		const { onClose } = setup();
		const dialog = screen.getByRole("dialog");

		fireEvent.keyDown(dialog, { key: "ArrowDown" });
		expect(selectedRow()).toHaveTextContent("Weekend");

		fireEvent.keyDown(dialog, { key: "Escape" });
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("keeps Tab from leaving the search field", () => {
		setup();

		expect(fireEvent.keyDown(search(), { key: "Tab" })).toBe(false);
	});

	it("keeps the focus in the search field on a press on a row", () => {
		setup();

		const row = screen.getByRole("option", { name: "Garden" });

		expect(fireEvent.mouseDown(row)).toBe(false);
	});

	it("keeps the focus in the search field on a press on a blank area", () => {
		const { onClose } = setup();

		expect(fireEvent.mouseDown(screen.getByRole("listbox"))).toBe(false);
		expect(onClose).not.toHaveBeenCalled();
	});

	it("leaves a press in the search field to the browser, which places the caret", () => {
		setup();

		expect(fireEvent.mouseDown(search())).toBe(true);
	});

	it("closes when the browser cancels the dialog", () => {
		const { onClose } = setup();

		fireEvent(screen.getByRole("dialog"), new Event("cancel"));

		expect(onClose).toHaveBeenCalledOnce();
	});

	it("does nothing on the arrow keys and Enter without rows", () => {
		const onOpen = vi.fn();
		render(
			<QuickSwitcher
				drawings={[]}
				openDrawingId={null}
				onOpen={onOpen}
				onCreate={vi.fn()}
				onClose={vi.fn()}
			/>,
		);

		fireEvent.keyDown(search(), { key: "ArrowDown" });
		fireEvent.keyDown(search(), { key: "Enter" });

		expect(onOpen).not.toHaveBeenCalled();
		expect(search()).not.toHaveAttribute("aria-activedescendant");
	});

	it("offers to create the trimmed query as the last row", async () => {
		const { user, onCreate, onOpen, onClose } = setup();

		await user.type(search(), "  Attic  ");
		expect(rows()).toEqual(["Create “Attic”"]);

		await user.keyboard("{Enter}");

		expect(onCreate).toHaveBeenCalledExactlyOnceWith("Attic");
		expect(onOpen).not.toHaveBeenCalled();
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("creates from a click on the row", async () => {
		const { user, onCreate } = setup();
		await user.type(search(), "Attic");

		await user.click(screen.getByRole("option", { name: "Create “Attic”" }));

		expect(onCreate).toHaveBeenCalledExactlyOnceWith("Attic");
	});

	it("offers no create row without a query", () => {
		setup();

		expect(rows()).not.toContainEqual(expect.stringContaining("Create"));
	});

	it("offers no create row for a name that exists, whatever its case", async () => {
		const { user } = setup();

		await user.type(search(), "gARDEN");

		expect(rows()).toEqual(["Garden"]);
	});

	it("closes on Escape", async () => {
		const { user, onClose, onOpen } = setup();

		await user.type(search(), "{Escape}");

		expect(onClose).toHaveBeenCalledOnce();
		expect(onOpen).not.toHaveBeenCalled();
	});

	it("closes on a press on the backdrop but not inside the dialog", async () => {
		const { onClose } = setup();

		fireEvent.mouseDown(search());
		expect(onClose).not.toHaveBeenCalled();

		// Not prevented, the press would move the focus that closing returns.
		expect(fireEvent.mouseDown(screen.getByRole("dialog"))).toBe(false);
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("keeps keys away from the document", async () => {
		const onDocument = vi.fn();
		document.addEventListener("keydown", onDocument);
		document.addEventListener("keyup", onDocument);
		const { user } = setup();

		await user.type(search(), "r");

		document.removeEventListener("keydown", onDocument);
		document.removeEventListener("keyup", onDocument);
		expect(search()).toHaveValue("r");
		expect(onDocument).not.toHaveBeenCalled();
	});
});
