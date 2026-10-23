import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Drawing } from "../shared/types.ts";
import { App } from "./App.tsx";
import * as api from "./drawings/api.ts";

vi.mock("./drawings/api.ts");
vi.mock("./drawings/Editor.tsx", () => ({
	Editor: ({ drawing }: { drawing: Drawing }) => <p>Editing {drawing.name}</p>,
}));

const drawing = (id: string, name: string): Drawing => ({
	id,
	name,
	scene: null,
	createdAt: "",
	updatedAt: "",
});

const nav = () => within(screen.getByRole("navigation"));

beforeEach(() => {
	window.location.hash = "";
	vi.mocked(api.listDrawings).mockResolvedValue([
		drawing("1", "Plan"),
		drawing("2", "Roadmap"),
	]);
	vi.mocked(api.getDrawing).mockImplementation(async (id) =>
		drawing(id, id === "1" ? "Plan" : "Roadmap"),
	);
});

afterEach(() => vi.restoreAllMocks());

describe("App", () => {
	it("opens the drawing selected in the list", async () => {
		const user = userEvent.setup();
		render(<App />);
		expect(
			screen.getByText("Open a drawing from the list or start a new one."),
		).toBeInTheDocument();

		await user.click(await nav().findByRole("button", { name: "Roadmap" }));

		expect(await screen.findByText("Editing Roadmap")).toBeInTheDocument();
		expect(window.location.hash).toBe("#2");
	});

	it("opens the drawing named in the URL hash", async () => {
		window.location.hash = "#1";
		render(<App />);

		expect(screen.getByText("Opening drawing…")).toBeInTheDocument();
		expect(await screen.findByText("Editing Plan")).toBeInTheDocument();
	});

	it("adds a created drawing in name order and opens it", async () => {
		vi.mocked(api.createDrawing).mockResolvedValue(drawing("3", "Ideas"));
		vi.mocked(api.getDrawing).mockResolvedValue(drawing("3", "Ideas"));
		const user = userEvent.setup();
		render(<App />);
		await nav().findByRole("button", { name: "Plan" });

		await user.click(nav().getByRole("button", { name: "New drawing" }));
		await user.type(nav().getByRole("textbox"), "Ideas{Enter}");

		expect(await screen.findByText("Editing Ideas")).toBeInTheDocument();
		expect(
			nav()
				.getAllByRole("listitem")
				.map((item) => item.textContent),
		).toEqual([
			expect.stringContaining("Ideas"),
			expect.stringContaining("Plan"),
			expect.stringContaining("Roadmap"),
		]);
	});

	it("shows a renamed drawing under its new name", async () => {
		vi.mocked(api.updateDrawing).mockResolvedValue(drawing("1", "Sketch"));
		const user = userEvent.setup();
		render(<App />);

		await user.click(await nav().findByRole("button", { name: "Rename Plan" }));
		await user.clear(nav().getByRole("textbox"));
		await user.type(nav().getByRole("textbox"), "Sketch{Enter}");

		expect(
			await nav().findByRole("button", { name: "Sketch" }),
		).toBeInTheDocument();
		expect(api.updateDrawing).toHaveBeenCalledWith("1", { name: "Sketch" });
	});

	it("closes the open drawing when it is deleted", async () => {
		vi.mocked(api.deleteDrawing).mockResolvedValue();
		window.location.hash = "#1";
		const user = userEvent.setup();
		render(<App />);
		await screen.findByText("Editing Plan");

		await user.click(nav().getByRole("button", { name: "Delete Plan" }));
		await user.click(nav().getByRole("button", { name: "Delete" }));

		expect(
			await screen.findByText(
				"Open a drawing from the list or start a new one.",
			),
		).toBeInTheDocument();
		expect(nav().queryByRole("button", { name: "Plan" })).toBeNull();
	});

	it("keeps another open drawing when deleting", async () => {
		vi.mocked(api.deleteDrawing).mockResolvedValue();
		window.location.hash = "#1";
		const user = userEvent.setup();
		render(<App />);
		await screen.findByText("Editing Plan");

		await user.click(nav().getByRole("button", { name: "Delete Roadmap" }));
		await user.click(nav().getByRole("button", { name: "Delete" }));

		await waitFor(() =>
			expect(nav().queryByRole("button", { name: "Roadmap" })).toBeNull(),
		);
		expect(screen.getByText("Editing Plan")).toBeInTheDocument();
	});

	it("shows a failed request until the message is dismissed", async () => {
		vi.mocked(api.listDrawings).mockRejectedValue(new Error("Server down"));
		const user = userEvent.setup();
		render(<App />);

		expect(await screen.findByRole("alert")).toHaveTextContent("Server down");
		await user.click(screen.getByRole("button", { name: "Dismiss" }));

		expect(screen.queryByRole("alert")).toBeNull();
	});
});
