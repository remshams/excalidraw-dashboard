import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DrawingSummary } from "#shared/drawings.ts";
import type { Tag, TagColor } from "#shared/tags.ts";
import { DrawingTagsButton } from "./DrawingTagsButton.tsx";

const tag = (id: string, label: string, color: TagColor = "blue"): Tag => ({
	id,
	label,
	color,
	createdAt: "2026-01-01T00:00:00.000Z",
});

/** Sorted by label, as the client keeps them. */
const tags = [
	tag("a", "Budget", "green"),
	tag("b", "Garden"),
	tag("c", "Home", "teal"),
	tag("d", "Reno", "orange"),
	tag("e", "Work", "violet"),
];

const changes = { create: vi.fn(), update: vi.fn(), remove: vi.fn() };
const onToggle = vi.fn();

/** The drawing Plan with the given tags. */
const plan = (tagIds: string[]): DrawingSummary => ({
	id: "1",
	name: "Plan",
	createdAt: "",
	updatedAt: "",
	previewUpdatedAt: null,
	tagIds,
});

const setup = (tagIds: string[]) => {
	render(
		<DrawingTagsButton
			drawing={plan(tagIds)}
			tags={tags}
			changes={changes}
			onToggle={onToggle}
		/>,
	);
	return userEvent.setup();
};

describe("DrawingTagsButton", () => {
	it("shows the first three tags by label and counts the rest", () => {
		setup(["e", "d", "c", "b", "a"]);

		const button = screen.getByRole("button", { name: /^Change tags of Plan/ });
		expect(button).toHaveAccessibleName(
			"Change tags of Plan: Budget, Garden, Home, Reno, Work",
		);
		const shown = within(button);
		expect(shown.getByText("Budget")).toBeVisible();
		expect(shown.getByText("Garden")).toBeVisible();
		expect(shown.getByText("Home")).toBeVisible();
		expect(shown.queryByText("Reno")).toBeNull();
		expect(shown.getByText("+2")).toHaveAttribute("title", "Reno, Work");
		// What a narrow screen shows in place of the marks.
		expect(shown.getByText("5")).toBeInTheDocument();
	});

	it("leaves out the count when every tag shows", () => {
		setup(["a", "b"]);

		const button = screen.getByRole("button", {
			name: "Change tags of Plan: Budget, Garden",
		});
		expect(within(button).queryByText(/^\+/)).toBeNull();
	});

	it("offers to add tags to a drawing without any", () => {
		setup([]);

		const button = screen.getByRole("button", { name: "Add tags to Plan" });
		expect(button.textContent).toBe("");
	});

	it("opens the dialog for the drawing's tags", async () => {
		const user = setup(["a"]);

		await user.click(screen.getByRole("button", { name: /^Change tags/ }));

		const dialog = within(screen.getByRole("dialog", { name: "Tags of Plan" }));
		expect(
			within(dialog.getByRole("group", { name: "Tags it has" })).getByRole(
				"button",
				{ name: "Remove Budget" },
			),
		).toBeVisible();
	});
});
