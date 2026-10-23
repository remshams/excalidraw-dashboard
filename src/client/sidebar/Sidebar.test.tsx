import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { Sidebar } from "./Sidebar.tsx";
import { DEFAULT_WIDTH, MAX_WIDTH, MIN_WIDTH } from "./use-sidebar.ts";

function setup() {
	const result = render(
		<Sidebar label="drawings">
			{(hideButton) => (
				<nav>
					List of drawings
					{hideButton}
				</nav>
			)}
		</Sidebar>,
	);
	return { ...result, user: userEvent.setup() };
}

const handle = () => screen.getByRole("separator", { name: "Resize drawings" });
const width = () => Number(handle().getAttribute("aria-valuenow"));

beforeEach(() => localStorage.clear());

describe("Sidebar", () => {
	it("collapses to a rail and opens again, keeping focus on the toggle", async () => {
		const { user } = setup();
		const hide = screen.getByRole("button", { name: "Hide drawings" });
		expect(hide).toHaveAttribute("aria-expanded", "true");

		await user.click(hide);

		expect(screen.queryByText("List of drawings")).toBeNull();
		expect(screen.queryByRole("separator")).toBeNull();
		const show = screen.getByRole("button", { name: "Show drawings" });
		expect(show).toHaveFocus();
		expect(show).toHaveAttribute("aria-expanded", "false");

		await user.click(show);

		expect(screen.getByText("List of drawings")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Hide drawings" })).toHaveFocus();
	});

	it("does not move focus when it starts collapsed", () => {
		localStorage.setItem("sidebar", JSON.stringify({ collapsed: true }));
		setup();

		expect(
			screen.getByRole("button", { name: "Show drawings" }),
		).not.toHaveFocus();
	});

	it("resizes with the arrow keys within its limits", async () => {
		const { user } = setup();
		expect(width()).toBe(DEFAULT_WIDTH);

		handle().focus();
		await user.keyboard("{ArrowRight}");
		expect(width()).toBe(DEFAULT_WIDTH + 16);
		await user.keyboard("{ArrowLeft}{ArrowLeft}");
		expect(width()).toBe(DEFAULT_WIDTH - 16);
		await user.keyboard("{Enter}");
		expect(width()).toBe(DEFAULT_WIDTH - 16);

		await user.keyboard("{ArrowLeft>20/}");
		expect(width()).toBe(MIN_WIDTH);
		await user.keyboard("{ArrowRight>40/}");
		expect(width()).toBe(MAX_WIDTH);
	});

	it("resizes by dragging the handle until the pointer is released", () => {
		setup();

		fireEvent.pointerMove(handle(), { clientX: 400 });
		expect(width()).toBe(DEFAULT_WIDTH);

		fireEvent.pointerDown(handle(), { clientX: 100 });
		expect(document.documentElement).toHaveClass("resizing");
		fireEvent.pointerMove(handle(), { clientX: 150 });
		expect(width()).toBe(DEFAULT_WIDTH + 50);

		fireEvent.pointerUp(handle());
		expect(document.documentElement).not.toHaveClass("resizing");
		fireEvent.pointerMove(handle(), { clientX: 200 });
		expect(width()).toBe(DEFAULT_WIDTH + 50);
	});

	it("resets the width on double-click", async () => {
		const { user } = setup();
		handle().focus();
		await user.keyboard("{ArrowRight}");

		await user.dblClick(handle());

		expect(width()).toBe(DEFAULT_WIDTH);
	});

	it("remembers its width and state across reloads", async () => {
		const { user, unmount } = setup();
		handle().focus();
		await user.keyboard("{ArrowRight}");
		unmount();

		setup();
		expect(width()).toBe(DEFAULT_WIDTH + 16);
		expect(handle().parentElement).toHaveStyle({
			"--sidebar-width": `${DEFAULT_WIDTH + 16}px`,
		});
	});

	it.each([
		["unreadable", "{"],
		["a width of the wrong type", JSON.stringify({ width: "wide" })],
	])("falls back to the default for %s stored state", (_, stored) => {
		localStorage.setItem("sidebar", stored);
		setup();

		expect(width()).toBe(DEFAULT_WIDTH);
	});

	it("clamps a stored width to its limits", () => {
		localStorage.setItem("sidebar", JSON.stringify({ width: 5000 }));
		setup();

		expect(width()).toBe(MAX_WIDTH);
	});
});
