import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DrawingTitle } from "./DrawingTitle.tsx";

/** A rename the test finishes by hand, to see the bar while it saves. */
function slowRename() {
	let finish = () => {};
	const onRename = vi.fn(
		() =>
			new Promise<void>((resolve) => {
				finish = resolve;
			}),
	);
	return { onRename, finish: () => finish() };
}

function setup(onRename = vi.fn(() => Promise.resolve())) {
	const ui = (name: string) => (
		<>
			<DrawingTitle name={name} onRename={onRename} />
			<button type="button">Elsewhere</button>
		</>
	);
	const view = render(ui("Plan"));
	return {
		onRename,
		user: userEvent.setup(),
		rerender: (name: string) => view.rerender(ui(name)),
	};
}

const heading = (name: string) => screen.getByRole("heading", { name });
const renameButton = () => screen.getByRole("button", { name: /^Rename/ });
const nameField = () =>
	screen.getByRole("textbox", { name: "New name for Plan" });

describe("DrawingTitle", () => {
	it("shows the name as the heading, with a button that renames it", () => {
		setup();

		expect(heading("Plan")).toBeVisible();
		expect(renameButton()).toHaveAccessibleName("Rename Plan");
	});

	it("leaves the focus where it is when the drawing opens", () => {
		setup();

		expect(renameButton()).not.toHaveFocus();
	});

	it("opens a field with the name when the name is clicked", async () => {
		const { user } = setup();

		await user.click(renameButton());

		expect(nameField()).toHaveValue("Plan");
		expect(nameField()).toHaveFocus();
		expect(screen.queryByRole("heading")).toBeNull();
	});

	it("renames the drawing on Enter and focuses the name again", async () => {
		const { onRename, user } = setup();

		await user.click(renameButton());
		await user.clear(nameField());
		await user.type(nameField(), "Roadmap{Enter}");

		expect(onRename).toHaveBeenCalledWith("Roadmap");
		expect(renameButton()).toHaveFocus();
	});

	it("renames the drawing when the field loses focus and leaves the focus there", async () => {
		const { onRename, user } = setup();

		await user.click(renameButton());
		await user.clear(nameField());
		await user.type(nameField(), "Roadmap");
		await user.click(screen.getByRole("button", { name: "Elsewhere" }));

		expect(onRename).toHaveBeenCalledWith("Roadmap");
		expect(screen.getByRole("button", { name: "Elsewhere" })).toHaveFocus();
	});

	it("keeps the name on Escape and focuses it again", async () => {
		const { onRename, user } = setup();

		await user.click(renameButton());
		await user.clear(nameField());
		await user.type(nameField(), "Roadmap{Escape}");

		expect(onRename).not.toHaveBeenCalled();
		expect(heading("Plan")).toBeVisible();
		expect(renameButton()).toHaveFocus();
	});

	it("doesn't save an empty name", async () => {
		const { onRename, user } = setup();

		await user.click(renameButton());
		await user.clear(nameField());
		await user.keyboard("{Enter}");

		expect(onRename).not.toHaveBeenCalled();
		expect(heading("Plan")).toBeVisible();
	});

	it("shows the new name while the rename saves and after it succeeded", async () => {
		const { onRename, finish } = slowRename();
		const { user, rerender } = setup(onRename);

		await user.click(renameButton());
		await user.clear(nameField());
		await user.type(nameField(), "Roadmap{Enter}");
		expect(heading("Roadmap")).toBeVisible();

		// The list has the new name before the rename resolves.
		rerender("Roadmap");
		await act(async () => finish());

		expect(heading("Roadmap")).toBeVisible();
	});

	it("shows the old name again once a failed rename resolves", async () => {
		const { onRename, finish } = slowRename();
		const { user } = setup(onRename);

		await user.click(renameButton());
		await user.clear(nameField());
		await user.type(nameField(), "Roadmap{Enter}");
		expect(heading("Roadmap")).toBeVisible();

		await act(async () => finish());

		expect(heading("Plan")).toBeVisible();
	});
});
