import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DrawingLink } from "./DrawingLink.tsx";

function setup(drawingId: string | null) {
	const onOpen = vi.fn();
	render(
		<DrawingLink drawingId={drawingId} onOpen={onOpen}>
			Plan
		</DrawingLink>,
	);
	return { onOpen, link: screen.getByRole("link", { name: "Plan" }) };
}

describe("DrawingLink", () => {
	it("links to the drawing's path", () => {
		expect(setup("1").link).toHaveAttribute("href", "/drawings/1");
	});

	it("links to / without a drawing", () => {
		expect(setup(null).link).toHaveAttribute("href", "/");
	});

	it("takes a name that says more than its content", () => {
		render(
			<DrawingLink drawingId="1" onOpen={vi.fn()} aria-label="Plan, tags: Work">
				Plan
			</DrawingLink>,
		);

		expect(
			screen.getByRole("link", { name: "Plan, tags: Work" }),
		).toHaveAttribute("href", "/drawings/1");
	});

	it("opens the drawing in place on a plain click", async () => {
		const { onOpen, link } = setup("1");

		await userEvent.setup().click(link);

		expect(onOpen).toHaveBeenCalledExactlyOnceWith("1");
	});

	it("stops the browser from loading the page on a plain click", () => {
		const { link } = setup("1");

		expect(fireEvent.click(link)).toBe(false);
	});

	it.each([
		["Ctrl", { ctrlKey: true }],
		["Cmd", { metaKey: true }],
		["Shift", { shiftKey: true }],
		["Alt", { altKey: true }],
		["the middle button", { button: 1 }],
	])("leaves a click with %s to the browser", (_, init) => {
		const { onOpen, link } = setup("1");

		const notPrevented = fireEvent.click(link, init);

		expect(notPrevented).toBe(true);
		expect(onOpen).not.toHaveBeenCalled();
	});
});
