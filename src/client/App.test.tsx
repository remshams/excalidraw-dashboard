import { render, screen, waitFor } from "@testing-library/react";
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
	hasPreview: false,
});

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
	it("opens a drawing from the landing page and goes back to it", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.click(await screen.findByRole("button", { name: "Roadmap" }));

		expect(await screen.findByText("Editing Roadmap")).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Roadmap" }),
		).toBeInTheDocument();
		expect(window.location.hash).toBe("#2");

		await user.click(screen.getByRole("button", { name: "All drawings" }));

		expect(
			await screen.findByRole("heading", { name: "Drawings" }),
		).toBeInTheDocument();
		expect(screen.queryByText("Editing Roadmap")).toBeNull();
		expect(window.location.hash).toBe("");
	});

	it("opens the drawing named in the URL hash", async () => {
		window.location.hash = "#1";
		render(<App />);

		expect(screen.getByText("Opening drawing…")).toBeInTheDocument();
		expect(await screen.findByText("Editing Plan")).toBeInTheDocument();
	});

	it("opens a created drawing and lists it in name order", async () => {
		vi.mocked(api.createDrawing).mockResolvedValue(drawing("3", "Ideas"));
		vi.mocked(api.getDrawing).mockResolvedValue(drawing("3", "Ideas"));
		const user = userEvent.setup();
		render(<App />);
		await screen.findByRole("button", { name: "Plan" });

		await user.click(screen.getByRole("button", { name: "New drawing" }));
		await user.type(screen.getByRole("textbox"), "Ideas{Enter}");

		expect(await screen.findByText("Editing Ideas")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "All drawings" }));
		expect(
			screen.getAllByRole("listitem").map((item) => item.textContent),
		).toEqual([
			expect.stringContaining("New drawing"),
			expect.stringContaining("Ideas"),
			expect.stringContaining("Plan"),
			expect.stringContaining("Roadmap"),
		]);
	});

	it("shows a renamed drawing under its new name", async () => {
		vi.mocked(api.updateDrawing).mockResolvedValue(drawing("1", "Sketch"));
		const user = userEvent.setup();
		render(<App />);

		await user.click(
			await screen.findByRole("button", { name: "Rename Plan" }),
		);
		await user.clear(screen.getByRole("textbox"));
		await user.type(screen.getByRole("textbox"), "Sketch{Enter}");

		expect(
			await screen.findByRole("button", { name: "Sketch" }),
		).toBeInTheDocument();
		expect(api.updateDrawing).toHaveBeenCalledWith("1", { name: "Sketch" });
	});

	it("removes a deleted drawing from the landing page", async () => {
		vi.mocked(api.deleteDrawing).mockResolvedValue();
		const user = userEvent.setup();
		render(<App />);

		await user.click(
			await screen.findByRole("button", { name: "Delete Roadmap" }),
		);
		await user.click(screen.getByRole("button", { name: "Delete" }));

		await waitFor(() =>
			expect(screen.queryByRole("button", { name: "Roadmap" })).toBeNull(),
		);
		expect(api.deleteDrawing).toHaveBeenCalledWith("2");
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
