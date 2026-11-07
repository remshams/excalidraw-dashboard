import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DrawingSummary } from "../../../../shared/drawings.ts";
import { DrawingList } from "./DrawingList.tsx";

const summary = (
	id: string,
	name: string,
	previewUpdatedAt: string | null = null,
): DrawingSummary => ({
	id,
	name,
	createdAt: "",
	updatedAt: "",
	previewUpdatedAt,
});

const drawings = [
	summary("1", "Plan", "2026-01-02T00:00:00.000Z"),
	summary("2", "Roadmap"),
];

function setup(shown = drawings) {
	const props = {
		onOpen: vi.fn(),
		onCreate: vi.fn(),
		onRename: vi.fn(),
		onDelete: vi.fn(),
	};
	const { rerender } = render(<DrawingList drawings={shown} {...props} />);
	return {
		...props,
		user: userEvent.setup(),
		show: (next: DrawingSummary[]) =>
			rerender(<DrawingList drawings={next} {...props} />),
	};
}

const cards = () =>
	within(screen.getByRole("list", { name: "Drawings" })).getAllByRole(
		"listitem",
	);

/** The card's preview image; it has no role, since its alt text is empty. */
const previewOf = (name: string) =>
	screen.getByRole("link", { name }).querySelector("img");

describe("DrawingList", () => {
	it("shows a blank sheet to start a drawing, then a card per drawing in the given order", () => {
		setup();

		expect(cards().map((card) => card.textContent)).toEqual([
			"New drawing",
			expect.stringContaining("Plan"),
			expect.stringContaining("Roadmap"),
		]);
	});

	it("links each card to its drawing's path", () => {
		setup();

		expect(screen.getByRole("link", { name: "Plan" })).toHaveAttribute(
			"href",
			"/drawings/1",
		);
	});

	it("opens a drawing from its card", async () => {
		const { user, onOpen } = setup();

		await user.click(screen.getByRole("link", { name: "Roadmap" }));

		expect(onOpen).toHaveBeenCalledExactlyOnceWith("2");
	});

	it("shows the preview, versioned by its update time", () => {
		setup();

		const image = previewOf("Plan");
		expect(image).toHaveAttribute(
			"src",
			"/api/drawings/1/preview?v=2026-01-02T00%3A00%3A00.000Z",
		);
		expect(image).toHaveAttribute("alt", "");
		expect(image).toHaveAttribute("loading", "lazy");
	});

	it("shows a blank sheet for a drawing without a preview", () => {
		setup();

		expect(previewOf("Roadmap")).toBeNull();
	});

	it("shows a blank sheet when the preview fails to load", () => {
		setup();

		fireEvent.error(previewOf("Plan") as HTMLImageElement);

		expect(previewOf("Plan")).toBeNull();
	});

	it("shows a new preview after an earlier one failed to load", () => {
		const { show } = setup();
		fireEvent.error(previewOf("Plan") as HTMLImageElement);

		show([summary("1", "Plan", "2026-01-03T00:00:00.000Z")]);

		expect(previewOf("Plan")).toHaveAttribute(
			"src",
			"/api/drawings/1/preview?v=2026-01-03T00%3A00%3A00.000Z",
		);
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
		expect(
			screen.getByRole("button", { name: "New drawing" }),
		).toBeInTheDocument();
	});

	it("renames a drawing in place", async () => {
		const { user, onRename } = setup();

		await user.click(screen.getByRole("button", { name: "Rename Plan" }));
		const field = screen.getByRole("textbox", { name: "New name for Plan" });
		expect(field).toHaveValue("Plan");
		await user.clear(field);
		await user.type(field, "Ideas{Enter}");

		expect(onRename).toHaveBeenCalledWith("1", "Ideas");
		expect(screen.getByRole("link", { name: "Plan" })).toBeInTheDocument();
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
			expect(screen.getByRole("link", { name: "Roadmap" })).toBeInTheDocument();
		},
	);

	it("asks on one card at a time", async () => {
		const { user } = setup();

		await user.click(screen.getByRole("button", { name: "Delete Roadmap" }));
		await user.click(screen.getByRole("button", { name: "Rename Plan" }));

		expect(screen.queryByText("Delete “Roadmap”?")).toBeNull();
		expect(
			screen.getByRole("textbox", { name: "New name for Plan" }),
		).toBeInTheDocument();
	});

	it("closes the new drawing's name field when another card asks", async () => {
		const { user } = setup();

		await user.click(screen.getByRole("button", { name: "New drawing" }));
		await user.click(screen.getByRole("button", { name: "Delete Plan" }));

		expect(
			screen.queryByRole("textbox", { name: "Name of the new drawing" }),
		).toBeNull();
		expect(screen.getByText("Delete “Plan”?")).toBeInTheDocument();
	});

	it("closes a card's question when the new drawing asks for a name", async () => {
		const { user } = setup();

		await user.click(screen.getByRole("button", { name: "Delete Plan" }));
		await user.click(screen.getByRole("button", { name: "New drawing" }));

		expect(screen.queryByText("Delete “Plan”?")).toBeNull();
		expect(
			screen.getByRole("textbox", { name: "Name of the new drawing" }),
		).toBeInTheDocument();
	});

	it("keeps the preview on the sheet while a card asks", async () => {
		const { user } = setup();

		await user.click(screen.getByRole("button", { name: "Delete Plan" }));

		expect(cards()[1].querySelector("img")).not.toBeNull();
	});

	describe("search", () => {
		const search = () =>
			screen.getByRole("searchbox", { name: "Search drawings" });

		it("shows only the drawings whose name matches, after the blank sheet", async () => {
			const { user } = setup();

			await user.type(search(), "road");

			expect(cards().map((card) => card.textContent)).toEqual([
				"New drawing",
				expect.stringContaining("Roadmap"),
			]);
			expect(screen.getByRole("status")).toBeEmptyDOMElement();
		});

		it("shows every drawing again once the query is cleared", async () => {
			const { user } = setup();

			await user.type(search(), "road");
			await user.clear(search());

			expect(cards()).toHaveLength(3);
		});

		it("says so when no drawing matches, and keeps the blank sheet", async () => {
			const { user } = setup();

			await user.type(search(), "  Garden ");

			expect(screen.getByRole("status")).toHaveTextContent(
				"No drawing is named “Garden”.",
			);
			expect(cards().map((card) => card.textContent)).toEqual(["New drawing"]);
		});

		it("says nothing for a blank query", async () => {
			const { user } = setup([]);

			await user.type(search(), "   ");

			expect(screen.getByRole("status")).toBeEmptyDOMElement();
		});

		it("doesn't name a new drawing after the query", async () => {
			const { user } = setup();

			await user.type(search(), "road");
			await user.click(screen.getByRole("button", { name: "New drawing" }));

			expect(
				screen.getByRole("textbox", { name: "Name of the new drawing" }),
			).toHaveValue("");
		});

		it("closes a card's question when the query changes", async () => {
			const { user } = setup();

			await user.click(screen.getByRole("button", { name: "Delete Roadmap" }));
			await user.type(search(), "plan");
			await user.clear(search());

			expect(screen.queryByText("Delete “Roadmap”?")).toBeNull();
			expect(screen.getByRole("link", { name: "Roadmap" })).toBeVisible();
		});

		it("applies to drawings that change while searching", async () => {
			const { user, show } = setup();

			await user.type(search(), "plan");
			show([...drawings, summary("3", "Floor plan")]);

			expect(screen.getByRole("link", { name: "Floor plan" })).toBeVisible();
			expect(screen.queryByRole("link", { name: "Roadmap" })).toBeNull();
		});
	});
});
