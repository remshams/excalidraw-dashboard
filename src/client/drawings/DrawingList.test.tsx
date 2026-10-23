import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DrawingSummary } from "../../shared/types.ts";
import { DrawingList } from "./DrawingList.tsx";

const drawings: DrawingSummary[] = [
	{ id: "1", name: "Plan", createdAt: "", updatedAt: "" },
	{ id: "2", name: "Roadmap", createdAt: "", updatedAt: "" },
];

function setup() {
	const props = {
		onSelect: vi.fn(),
		onCreate: vi.fn(),
		onRename: vi.fn(),
		onDelete: vi.fn(),
	};
	render(<DrawingList drawings={drawings} selectedId="2" {...props} />);
	return { ...props, user: userEvent.setup() };
}

afterEach(() => vi.restoreAllMocks());

describe("DrawingList", () => {
	it("marks the selected drawing", () => {
		setup();

		const items = screen.getAllByRole("listitem");
		expect(items[0]).toHaveAttribute("aria-current", "false");
		expect(items[1]).toHaveAttribute("aria-current", "true");
	});

	it("selects a drawing by its name", async () => {
		const { user, onSelect } = setup();

		await user.click(screen.getByRole("button", { name: "Plan" }));

		expect(onSelect).toHaveBeenCalledWith("1");
	});

	it("creates a drawing with the entered name", async () => {
		vi.spyOn(window, "prompt").mockReturnValue("Sketch");
		const { user, onCreate } = setup();

		await user.click(screen.getByRole("button", { name: "New drawing" }));

		expect(onCreate).toHaveBeenCalledWith("Sketch");
	});

	it("does not create a drawing when the prompt is cancelled", async () => {
		vi.spyOn(window, "prompt").mockReturnValue(null);
		const { user, onCreate } = setup();

		await user.click(screen.getByRole("button", { name: "New drawing" }));

		expect(onCreate).not.toHaveBeenCalled();
	});

	it("renames a drawing", async () => {
		const prompt = vi.spyOn(window, "prompt").mockReturnValue("Ideas");
		const { user, onRename } = setup();

		await user.click(screen.getByRole("button", { name: "Rename Plan" }));

		expect(prompt).toHaveBeenCalledWith("New name", "Plan");
		expect(onRename).toHaveBeenCalledWith("1", "Ideas");
	});

	it("ignores a blank rename", async () => {
		vi.spyOn(window, "prompt").mockReturnValue("  ");
		const { user, onRename } = setup();

		await user.click(screen.getByRole("button", { name: "Rename Plan" }));

		expect(onRename).not.toHaveBeenCalled();
	});

	it.each([
		[true, 1],
		[false, 0],
	])(
		"deletes only after confirmation (confirmed: %s)",
		async (confirmed, calls) => {
			vi.spyOn(window, "confirm").mockReturnValue(confirmed);
			const { user, onDelete } = setup();

			await user.click(screen.getByRole("button", { name: "Delete Roadmap" }));

			expect(onDelete).toHaveBeenCalledTimes(calls);
		},
	);
});
