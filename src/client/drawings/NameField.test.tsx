import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NameField } from "./NameField.tsx";

function setup(initialName?: string) {
	const props = { onSubmit: vi.fn(), onCancel: vi.fn() };
	render(<NameField label="Name" initialName={initialName} {...props} />);
	return {
		...props,
		field: screen.getByRole("textbox", { name: "Name" }),
		user: userEvent.setup(),
	};
}

describe("NameField", () => {
	it("starts focused with the current name", () => {
		const { field } = setup("Plan");

		expect(field).toHaveFocus();
		expect(field).toHaveValue("Plan");
	});

	it("submits the trimmed name on Enter", async () => {
		const { field, user, onSubmit } = setup();

		await user.type(field, "  Sketch  {Enter}");

		expect(onSubmit).toHaveBeenCalledExactlyOnceWith("Sketch");
	});

	it("submits when the field loses focus", async () => {
		const { field, user, onSubmit } = setup();

		await user.type(field, "Sketch");
		await user.tab();

		expect(onSubmit).toHaveBeenCalledExactlyOnceWith("Sketch");
	});

	it("cancels on Escape without submitting on the following blur", async () => {
		const { field, user, onSubmit, onCancel } = setup();

		await user.type(field, "Sketch{Escape}");
		await user.tab();

		expect(onSubmit).not.toHaveBeenCalled();
		expect(onCancel).toHaveBeenCalledOnce();
	});

	it.each([
		["a blank name", "", "   "],
		["an unchanged name", "Plan", ""],
	])("cancels instead of submitting %s", async (_, initialName, typed) => {
		const { field, user, onSubmit, onCancel } = setup(initialName);

		await user.type(field, `${typed}{Enter}`);

		expect(onSubmit).not.toHaveBeenCalled();
		expect(onCancel).toHaveBeenCalledOnce();
	});
});
