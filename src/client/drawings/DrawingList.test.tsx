import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DrawingSummary } from "../../shared/types.ts";
import { DrawingList } from "./DrawingList.tsx";

const drawings: DrawingSummary[] = [
	{ id: "1", name: "Plan", createdAt: "", updatedAt: "t1", hasPreview: true },
	{ id: "2", name: "Roadmap", createdAt: "", updatedAt: "", hasPreview: false },
];

function setup() {
	const props = {
		onOpen: vi.fn(),
		onCreate: vi.fn(),
		onRename: vi.fn(),
		onDelete: vi.fn(),
	};
	render(<DrawingList drawings={drawings} {...props} />);
	return { ...props, user: userEvent.setup() };
}

describe("DrawingList", () => {
	it("opens a drawing from its card", async () => {
		const { user, onOpen } = setup();

		await user.click(screen.getByRole("button", { name: "Plan" }));

		expect(onOpen).toHaveBeenCalledWith("1");
	});

	it("shows the preview of drawings that have one", () => {
		setup();

		// Previews are decorative: the drawing's name labels each card.
		expect(
			screen.getAllByRole("presentation").map((img) => img.getAttribute("src")),
		).toEqual(["/api/drawings/1/preview?v=t1"]);
	});

	it("creates a drawing with the entered name", async () => {
		const { user, onCreate } = setup();
		expect(screen.queryByRole("textbox")).toBeNull();

		await user.click(screen.getByRole("button", { name: "New drawing" }));
		await user.type(
			screen.getByRole("textbox", { name: "Name of the new drawing" }),
			"Sketch{Enter}",
		);

		expect(onCreate).toHaveBeenCalledWith("Sketch");
		expect(screen.queryByRole("textbox")).toBeNull();
	});

	it("does not create a drawing when naming is cancelled", async () => {
		const { user, onCreate } = setup();

		await user.click(screen.getByRole("button", { name: "New drawing" }));
		await user.type(screen.getByRole("textbox"), "Sketch{Escape}");

		expect(onCreate).not.toHaveBeenCalled();
		expect(screen.queryByRole("textbox")).toBeNull();
	});

	it("renames a drawing in place", async () => {
		const { user, onRename } = setup();

		await user.click(screen.getByRole("button", { name: "Rename Plan" }));
		const field = screen.getByRole("textbox", { name: "New name for Plan" });
		expect(field).toHaveValue("Plan");
		await user.clear(field);
		await user.type(field, "Ideas{Enter}");

		expect(onRename).toHaveBeenCalledWith("1", "Ideas");
		expect(screen.getByRole("button", { name: "Plan" })).toBeInTheDocument();
	});

	it("deletes a drawing after confirmation", async () => {
		const { user, onDelete } = setup();

		await user.click(screen.getByRole("button", { name: "Delete Roadmap" }));
		expect(screen.getByText("Delete “Roadmap”?")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Delete" }));

		expect(onDelete).toHaveBeenCalledWith("2");
		expect(screen.queryByText("Delete “Roadmap”?")).toBeNull();
	});

	it.each([
		[
			"the Keep button",
			(user: ReturnType<typeof userEvent.setup>) =>
				user.click(screen.getByRole("button", { name: "Keep" })),
		],
		[
			"Escape",
			(user: ReturnType<typeof userEvent.setup>) => user.keyboard("{Escape}"),
		],
	])(
		"keeps a drawing when deletion is cancelled with %s",
		async (_, cancel) => {
			const { user, onDelete } = setup();

			await user.click(screen.getByRole("button", { name: "Delete Roadmap" }));
			expect(screen.getByRole("button", { name: "Keep" })).toHaveFocus();
			await cancel(user);

			expect(onDelete).not.toHaveBeenCalled();
			expect(
				screen.getByRole("button", { name: "Roadmap" }),
			).toBeInTheDocument();
		},
	);
});
