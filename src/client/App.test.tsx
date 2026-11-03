import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Drawing } from "../shared/types.ts";
import { App } from "./App.tsx";
import * as api from "./drawings/api.ts";

/**
 * Lets a test make the editor report a failed save after it closes, the way a
 * save that was still in flight fails later.
 */
const editor = vi.hoisted(() => ({
	failOnClose: undefined as Promise<Error> | undefined,
}));

vi.mock("./drawings/api.ts");
vi.mock("./drawings/editor/Editor.tsx", async () => {
	const { useEffect, useRef } = await import("react");
	return {
		Editor: ({
			drawing,
			theme,
			onError,
		}: {
			drawing: Drawing;
			theme: string;
			onError: (error: unknown) => void;
		}) => {
			const report = useRef(onError);
			report.current = onError;
			useEffect(
				() => () => {
					editor.failOnClose?.then((error) => report.current(error));
				},
				[],
			);
			return (
				<>
					<p>Editing {drawing.name}</p>
					<p>Theme: {theme}</p>
				</>
			);
		},
	};
});

const drawing = (id: string, name: string): Drawing => ({
	id,
	name,
	scene: null,
	createdAt: "",
	updatedAt: "",
	previewUpdatedAt: null,
});

/** A failure the test sends once it has done what should come first. */
function laterFailure() {
	let fail: (error: Error) => void = () => {};
	editor.failOnClose = new Promise<Error>((resolve) => {
		fail = resolve;
	});
	return fail;
}

const cards = () => within(screen.getByRole("list", { name: "Drawings" }));

const openAt = (path: string) => window.history.replaceState(null, "", path);

async function deleteFromCard(
	user: ReturnType<typeof userEvent.setup>,
	name: string,
) {
	await user.click(
		await cards().findByRole("button", { name: `Delete ${name}` }),
	);
	await user.click(cards().getByRole("button", { name: "Delete" }));
}

beforeEach(() => {
	openAt("/");
	vi.mocked(api.listDrawings).mockResolvedValue([
		drawing("1", "Plan"),
		drawing("2", "Roadmap"),
	]);
	vi.mocked(api.getDrawing).mockImplementation(async (id) =>
		drawing(id, id === "1" ? "Plan" : "Roadmap"),
	);
});

afterEach(() => {
	editor.failOnClose = undefined;
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("App", () => {
	it("shows the landing page at /", async () => {
		render(<App />);

		expect(
			await cards().findByRole("link", { name: "Plan" }),
		).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Drawings" })).toBeVisible();
		expect(screen.queryByText(/^Editing/)).toBeNull();
	});

	it("opens a drawing from its card", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.click(await cards().findByRole("link", { name: "Roadmap" }));

		expect(await screen.findByText("Editing Roadmap")).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Roadmap" }),
		).toBeInTheDocument();
		expect(screen.queryByRole("list", { name: "Drawings" })).toBeNull();
		expect(window.location.pathname).toBe("/drawings/2");
	});

	it("goes back to all drawings from the editor", async () => {
		openAt("/drawings/1");
		const user = userEvent.setup();
		render(<App />);
		await screen.findByText("Editing Plan");

		await user.click(screen.getByRole("link", { name: "All drawings" }));

		expect(
			await cards().findByRole("link", { name: "Plan" }),
		).toBeInTheDocument();
		expect(screen.queryByText("Editing Plan")).toBeNull();
		expect(window.location.pathname).toBe("/");
	});

	it("opens the drawing named in the URL", async () => {
		openAt("/drawings/1");
		render(<App />);

		expect(screen.getByText("Opening drawing…")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "All drawings" }),
		).toBeInTheDocument();
		expect(await screen.findByText("Editing Plan")).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Plan" })).toBeInTheDocument();
	});

	it("opens the editor in the system's color scheme", async () => {
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: query === "(prefers-color-scheme: dark)",
			addEventListener: () => {},
			removeEventListener: () => {},
		}));
		openAt("/drawings/1");
		render(<App />);

		expect(await screen.findByText("Theme: dark")).toBeInTheDocument();
	});

	it("opens a created drawing", async () => {
		vi.mocked(api.createDrawing).mockResolvedValue(drawing("3", "Ideas"));
		vi.mocked(api.getDrawing).mockResolvedValue(drawing("3", "Ideas"));
		const user = userEvent.setup();
		render(<App />);
		await cards().findByRole("link", { name: "Plan" });

		await user.click(cards().getByRole("button", { name: "New drawing" }));
		await user.type(cards().getByRole("textbox"), "Ideas{Enter}");

		expect(await screen.findByText("Editing Ideas")).toBeInTheDocument();
		expect(api.createDrawing).toHaveBeenCalledWith("Ideas");
		expect(window.location.pathname).toBe("/drawings/3");
	});

	it("lists a created drawing in name order", async () => {
		vi.mocked(api.createDrawing).mockResolvedValue(drawing("3", "Ideas"));
		vi.mocked(api.getDrawing).mockResolvedValue(drawing("3", "Ideas"));
		const user = userEvent.setup();
		render(<App />);
		await cards().findByRole("link", { name: "Plan" });
		await user.click(cards().getByRole("button", { name: "New drawing" }));
		await user.type(cards().getByRole("textbox"), "Ideas{Enter}");
		await screen.findByText("Editing Ideas");

		await user.click(screen.getByRole("link", { name: "All drawings" }));

		expect(
			cards()
				.getAllByRole("link")
				.map((link) => link.textContent),
		).toEqual(["Ideas", "Plan", "Roadmap"]);
	});

	it("shows a renamed drawing under its new name", async () => {
		vi.mocked(api.updateDrawing).mockResolvedValue(drawing("1", "Sketch"));
		const user = userEvent.setup();
		render(<App />);

		await user.click(
			await cards().findByRole("button", { name: "Rename Plan" }),
		);
		await user.clear(cards().getByRole("textbox"));
		await user.type(cards().getByRole("textbox"), "Sketch{Enter}");

		expect(
			await cards().findByRole("link", { name: "Sketch" }),
		).toBeInTheDocument();
		expect(api.updateDrawing).toHaveBeenCalledWith("1", { name: "Sketch" });
	});

	it("removes a deleted drawing from the landing page", async () => {
		vi.mocked(api.deleteDrawing).mockResolvedValue();
		const user = userEvent.setup();
		render(<App />);

		await deleteFromCard(user, "Plan");

		await waitFor(() =>
			expect(cards().queryByRole("link", { name: "Plan" })).toBeNull(),
		);
		expect(api.deleteDrawing).toHaveBeenCalledWith("1");
		expect(window.location.pathname).toBe("/");
	});

	it("shows no error when a deleted drawing's last save fails later", async () => {
		vi.mocked(api.deleteDrawing).mockResolvedValue();
		const fail = laterFailure();
		openAt("/drawings/1");
		const user = userEvent.setup();
		render(<App />);
		await screen.findByText("Editing Plan");

		await user.click(screen.getByRole("link", { name: "All drawings" }));
		await deleteFromCard(user, "Plan");
		await waitFor(() =>
			expect(cards().queryByRole("link", { name: "Plan" })).toBeNull(),
		);
		fail(new Error("PUT /drawings/1 failed with 404"));

		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("shows a failed save of a drawing that still exists", async () => {
		const fail = laterFailure();
		openAt("/drawings/1");
		const user = userEvent.setup();
		render(<App />);
		await screen.findByText("Editing Plan");

		await user.click(screen.getByRole("link", { name: "All drawings" }));
		fail(new Error("PUT /drawings/1 failed with 500"));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"PUT /drawings/1 failed with 500",
		);
	});

	it("still shows a failed save after another drawing was deleted", async () => {
		vi.mocked(api.deleteDrawing).mockResolvedValue();
		const fail = laterFailure();
		openAt("/drawings/1");
		const user = userEvent.setup();
		render(<App />);
		await screen.findByText("Editing Plan");

		await user.click(screen.getByRole("link", { name: "All drawings" }));
		await deleteFromCard(user, "Roadmap");
		await waitFor(() =>
			expect(cards().queryByRole("link", { name: "Roadmap" })).toBeNull(),
		);
		fail(new Error("PUT /drawings/1 failed with 404"));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"PUT /drawings/1 failed with 404",
		);
	});

	it("still shows a failed save when deleting the drawing failed", async () => {
		vi.mocked(api.deleteDrawing).mockRejectedValue(
			new Error("DELETE /drawings/1 failed with 500"),
		);
		const fail = laterFailure();
		openAt("/drawings/1");
		const user = userEvent.setup();
		render(<App />);
		await screen.findByText("Editing Plan");

		await user.click(screen.getByRole("link", { name: "All drawings" }));
		await deleteFromCard(user, "Plan");
		await user.click(await screen.findByRole("button", { name: "Dismiss" }));
		fail(new Error("PUT /drawings/1 failed with 500"));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"PUT /drawings/1 failed with 500",
		);
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
