import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Tag } from "../../../../shared/tags.ts";
import { ApiError } from "../../api.ts";
import { TagForm } from "./TagForm.tsx";

const work: Tag = { id: "w", label: "Work", color: "teal" };
const home: Tag = { id: "h", label: "Home", color: "pink" };

function setup(props: Partial<Parameters<typeof TagForm>[0]> = {}) {
	const handlers = {
		onSave: vi.fn().mockResolvedValue(undefined),
		onDelete: vi.fn().mockResolvedValue(undefined),
		onCancel: vi.fn(),
		onGone: vi.fn(),
		onError: vi.fn(),
	};
	render(
		<TagForm tags={[work, home]} drawingCount={0} {...handlers} {...props} />,
	);
	return { ...handlers, user: userEvent.setup() };
}

const labelField = () => screen.getByRole("textbox", { name: "Label" });
const button = (name: string) => screen.getByRole("button", { name });
const radio = (name: string) => screen.getByRole("radio", { name });

describe("TagForm", () => {
	it("starts a new tag in blue with the given label", () => {
		setup({ initialLabel: "Garden" });

		expect(screen.getByRole("heading", { name: "New tag" })).toBeVisible();
		expect(labelField()).toHaveValue("Garden");
		expect(labelField()).toHaveFocus();
		expect(radio("Blue")).toBeChecked();
		expect(screen.queryByRole("button", { name: "Delete…" })).toBeNull();
	});

	it("starts with the label and colour of the tag to change", () => {
		setup({ tag: work });

		expect(screen.getByRole("heading", { name: "Change tag" })).toBeVisible();
		expect(labelField()).toHaveValue("Work");
		expect(radio("Teal")).toBeChecked();
	});

	it("offers all eight colours", () => {
		setup();

		expect(screen.getAllByRole("radio")).toHaveLength(8);
	});

	it("saves the trimmed label and the chosen colour", async () => {
		const { user, onSave } = setup();

		await user.type(labelField(), "  Garden ");
		await user.click(radio("Green"));
		await user.click(button("Create tag"));

		expect(onSave).toHaveBeenCalledWith({ label: "Garden", color: "green" });
	});

	it("saves with Enter", async () => {
		const { user, onSave } = setup();

		await user.type(labelField(), "Garden{Enter}");

		expect(onSave).toHaveBeenCalledOnce();
	});

	it("shows the label in the preview, or a placeholder without one", async () => {
		const { user } = setup();

		expect(screen.getByText("Label", { selector: "span" })).toBeVisible();

		await user.type(labelField(), "Garden");

		expect(screen.getByText("Garden")).toBeVisible();
	});

	it.each([
		["", "A tag needs a label"],
		["   ", "A tag needs a label"],
		["a".repeat(31), "A tag label has at most 30 characters"],
		[" WORK ", 'A tag named "WORK" already exists'],
	])("refuses the label %j", async (label, message) => {
		const { user, onSave } = setup({ initialLabel: label });

		await user.click(button("Create tag"));

		expect(screen.getByRole("alert")).toHaveTextContent(message);
		expect(labelField()).toHaveFocus();
		expect(labelField()).toHaveAccessibleDescription(message);
		expect(labelField()).toBeInvalid();
		expect(onSave).not.toHaveBeenCalled();
	});

	it("doesn't count the tag itself as taking its label", async () => {
		const { user, onSave } = setup({ tag: work });

		await user.clear(labelField());
		await user.type(labelField(), "WORK");
		await user.click(button("Save tag"));

		expect(onSave).toHaveBeenCalledWith({ label: "WORK", color: "teal" });
	});

	it("clears the error on the next keystroke", async () => {
		const { user } = setup();
		await user.click(button("Create tag"));

		await user.type(labelField(), "G");

		expect(screen.queryByRole("alert")).toBeNull();
		expect(labelField()).toBeValid();
	});

	it.each([400, 409])("shows the server's reason for a %i", async (status) => {
		const { user, onError } = setup({
			onSave: vi.fn().mockRejectedValue(new ApiError("", status, "No way")),
		});

		await user.type(labelField(), "Garden{Enter}");

		expect(await screen.findByRole("alert")).toHaveTextContent("No way");
		expect(labelField()).toHaveFocus();
		expect(onError).not.toHaveBeenCalled();
	});

	it("reports a tag the server no longer knows", async () => {
		const { user, onGone, onError } = setup({
			tag: work,
			onSave: vi.fn().mockRejectedValue(new ApiError("", 404, "Not found")),
		});

		await user.click(button("Save tag"));

		await waitFor(() => expect(onGone).toHaveBeenCalled());
		expect(onError).not.toHaveBeenCalled();
		expect(screen.queryByRole("alert")).toBeNull();
	});

	it.each([
		["a server failure", new ApiError("", 500, "Oops")],
		["a network failure", new TypeError("Failed to fetch")],
	])("passes on %s and stays open", async (_, failure) => {
		const { user, onError, onGone } = setup({
			onSave: vi.fn().mockRejectedValue(failure),
		});

		await user.type(labelField(), "Garden{Enter}");

		await waitFor(() => expect(onError).toHaveBeenCalledWith(failure));
		expect(onGone).not.toHaveBeenCalled();
		expect(screen.queryByRole("alert")).toBeNull();
		expect(labelField()).toHaveValue("Garden");
	});

	it("sends one change at a time, and another after the first failed", async () => {
		let fail = (_: unknown) => {};
		const onSave = vi.fn(
			() =>
				new Promise<void>((_, reject) => {
					fail = reject;
				}),
		);
		const { user, onError } = setup({ tag: work, onSave });

		await user.dblClick(button("Save tag"));
		expect(onSave).toHaveBeenCalledOnce();

		fail(new ApiError("", 500, ""));
		await waitFor(() => expect(onError).toHaveBeenCalled());
		await user.click(button("Save tag"));

		expect(onSave).toHaveBeenCalledTimes(2);
	});

	it("cancels", async () => {
		const { user, onCancel } = setup();

		await user.click(button("Cancel"));

		expect(onCancel).toHaveBeenCalled();
	});

	describe("the delete question", () => {
		it.each([
			[0, "No drawing has it."],
			[1, "It is removed from 1 drawing. The drawings stay."],
			[3, "It is removed from 3 drawings. The drawings stay."],
		])("for %i drawings says %s", async (drawingCount, note) => {
			const { user } = setup({ tag: work, drawingCount });

			await user.click(button("Delete…"));

			expect(
				screen.getByRole("heading", { name: "Delete this tag?" }),
			).toBeVisible();
			expect(screen.getByText(note)).toBeVisible();
			expect(screen.getByText("Work")).toBeVisible();
			expect(button("Keep it")).toHaveFocus();
		});

		it("deletes once when the button is double-clicked", async () => {
			const onDelete = vi.fn(() => new Promise<void>(() => {}));
			const { user } = setup({ tag: work, onDelete });

			await user.click(button("Delete…"));
			await user.dblClick(button("Delete tag"));

			expect(onDelete).toHaveBeenCalledOnce();
		});

		it("deletes only after the confirmation", async () => {
			const { user, onDelete } = setup({ tag: work });

			await user.click(button("Delete…"));
			expect(onDelete).not.toHaveBeenCalled();
			await user.click(button("Delete tag"));

			expect(onDelete).toHaveBeenCalled();
		});

		it("keeps the edits when Keep it goes back to the form", async () => {
			const { user, onDelete } = setup({ tag: work });
			await user.clear(labelField());
			await user.type(labelField(), "Job");

			await user.click(button("Delete…"));
			await user.click(button("Keep it"));

			expect(labelField()).toHaveValue("Job");
			expect(onDelete).not.toHaveBeenCalled();
		});

		it("leaves only the question on Escape, not what hosts the form", async () => {
			const onHostKey = vi.fn();
			const user = userEvent.setup();
			render(
				// biome-ignore lint/a11y/noStaticElementInteractions: stands in for the tray.
				<div onKeyDown={onHostKey}>
					<TagForm
						tag={work}
						tags={[work]}
						drawingCount={0}
						onSave={vi.fn()}
						onDelete={vi.fn()}
						onCancel={vi.fn()}
						onGone={vi.fn()}
						onError={vi.fn()}
					/>
				</div>,
			);
			await user.click(button("Delete…"));
			onHostKey.mockClear();

			await user.keyboard("{Escape}");

			expect(button("Save tag")).toBeVisible();
			expect(onHostKey).not.toHaveBeenCalled();

			await user.keyboard("{Escape}");
			expect(onHostKey).toHaveBeenCalled();
		});

		it("answers Escape after a press on its blank parts", async () => {
			const { user } = setup({ tag: work });
			await user.click(button("Delete…"));

			await user.click(screen.getByRole("heading"));
			await user.keyboard("{Escape}");

			expect(button("Save tag")).toBeVisible();
		});

		it("reports a tag the server no longer knows", async () => {
			const { user, onGone } = setup({
				tag: work,
				onDelete: vi.fn().mockRejectedValue(new ApiError("", 404, "")),
			});

			await user.click(button("Delete…"));
			await user.click(button("Delete tag"));

			await waitFor(() => expect(onGone).toHaveBeenCalled());
		});
	});
});
