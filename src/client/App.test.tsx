import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
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
	const { useEffect, useRef, useState } = await import("react");
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
			// Like the real editor, keep the drawing it mounted with; Excalidraw reads
			// its initial data only once.
			const [mounted] = useState(drawing);
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
					<p>Editing {mounted.name}</p>
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

	it("loads a drawing again when it reopens after leaving it", async () => {
		openAt("/drawings/1");
		const user = userEvent.setup();
		render(<App />);
		await screen.findByText("Editing Plan");
		// The last edits before leaving changed the stored drawing.
		vi.mocked(api.getDrawing).mockResolvedValue(drawing("1", "Plan, edited"));

		await user.click(screen.getByRole("link", { name: "All drawings" }));
		await user.click(await cards().findByRole("link", { name: "Plan" }));

		expect(await screen.findByText("Editing Plan, edited")).toBeInTheDocument();
		expect(screen.queryByText("Editing Plan")).toBeNull();
	});

	it("says when a drawing couldn't be opened", async () => {
		vi.mocked(api.getDrawing).mockRejectedValue(
			new Error("GET /drawings/9 failed with 404"),
		);
		openAt("/drawings/9");
		render(<App />);

		expect(
			await screen.findByText("This drawing couldn't be opened."),
		).toBeInTheDocument();
		expect(screen.getByRole("alert")).toHaveTextContent(
			"GET /drawings/9 failed with 404",
		);
		expect(screen.getByRole("link", { name: "All drawings" })).toBeVisible();
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

	describe("quick switcher", () => {
		const switchButton = () =>
			screen.getByRole("button", { name: "Switch drawing" });

		async function openEditor() {
			openAt("/drawings/1");
			const user = userEvent.setup();
			render(<App />);
			await screen.findByText("Editing Plan");
			return user;
		}

		it("opens from the button in the editor's bar", async () => {
			const user = await openEditor();
			expect(screen.queryByRole("dialog")).toBeNull();

			await user.click(switchButton());

			expect(
				screen.getByRole("dialog", { name: "Switch drawing" }),
			).toBeVisible();
			expect(
				await screen.findByRole("option", { name: "Plan Open" }),
			).toBeVisible();
		});

		it.each([
			["Ctrl+K", "{Control>}k{/Control}"],
			["⌘K", "{Meta>}k{/Meta}"],
		])("toggles with %s in the editor", async (_shortcut, keys) => {
			const user = await openEditor();

			await user.keyboard(keys);
			expect(screen.getByRole("dialog")).toBeVisible();

			await user.keyboard(keys);
			expect(screen.queryByRole("dialog")).toBeNull();
		});

		it("takes the shortcut from everything else on the page", async () => {
			const user = await openEditor();
			const onDocument = vi.fn();
			document.addEventListener("keydown", onDocument);

			await user.keyboard("{Control>}k");

			document.removeEventListener("keydown", onDocument);
			await user.keyboard("{/Control}");
			const keys = onDocument.mock.calls.map(([event]) => event.key);
			expect(keys).not.toContain("k");
		});

		it("ignores the shortcut's repeats while the keys stay down", async () => {
			const user = await openEditor();

			await user.keyboard("{Control>}k");
			fireEvent.keyDown(window, { key: "k", ctrlKey: true, repeat: true });
			await user.keyboard("{/Control}");

			expect(screen.getByRole("dialog")).toBeVisible();
		});

		it("leaves other combinations with K to the browser", async () => {
			const user = await openEditor();

			await user.keyboard("{Control>}{Shift>}k{/Shift}{/Control}");
			await user.keyboard("k");

			expect(screen.queryByRole("dialog")).toBeNull();
		});

		it("leaves the shortcut to the browser on the landing page", async () => {
			const user = userEvent.setup();
			render(<App />);
			await cards().findByRole("link", { name: "Plan" });
			const onDocument = vi.fn();
			document.addEventListener("keydown", onDocument);

			await user.keyboard("{Control>}k{/Control}");

			document.removeEventListener("keydown", onDocument);
			expect(screen.queryByRole("dialog")).toBeNull();
			const shortcut = onDocument.mock.calls
				.map(([event]) => event)
				.find((event) => event.key === "k");
			expect(shortcut.defaultPrevented).toBe(false);
		});

		it("shows the shortcut as a Mac writes it on a Mac", async () => {
			vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");

			await openEditor();

			expect(switchButton()).toHaveTextContent("⌘K");
		});

		it("shows the shortcut with Ctrl elsewhere", async () => {
			await openEditor();

			expect(switchButton()).toHaveTextContent("Ctrl K");
		});

		it("switches to the chosen drawing and closes", async () => {
			const user = await openEditor();
			await user.click(switchButton());

			await user.click(await screen.findByRole("option", { name: "Roadmap" }));

			expect(await screen.findByText("Editing Roadmap")).toBeInTheDocument();
			expect(window.location.pathname).toBe("/drawings/2");
			expect(screen.queryByRole("dialog")).toBeNull();
		});

		it("stays on the open drawing when it is chosen", async () => {
			const user = await openEditor();
			const entries = window.history.length;
			await user.click(switchButton());

			await user.click(
				await screen.findByRole("option", { name: "Plan Open" }),
			);

			expect(screen.queryByRole("dialog")).toBeNull();
			expect(screen.getByText("Editing Plan")).toBeInTheDocument();
			expect(window.history.length).toBe(entries);
		});

		it("creates a drawing and opens it", async () => {
			vi.mocked(api.createDrawing).mockResolvedValue(drawing("3", "Attic"));
			vi.mocked(api.getDrawing).mockImplementation(async (id) =>
				drawing(id, id === "3" ? "Attic" : "Plan"),
			);
			const user = await openEditor();
			await user.click(switchButton());

			await user.type(screen.getByRole("combobox"), "Attic{Enter}");

			expect(await screen.findByText("Editing Attic")).toBeInTheDocument();
			expect(api.createDrawing).toHaveBeenCalledWith("Attic");
			expect(window.location.pathname).toBe("/drawings/3");
		});

		it("shows an error when creating fails and stays on the drawing", async () => {
			vi.mocked(api.createDrawing).mockRejectedValue(
				new Error("Could not create"),
			);
			const user = await openEditor();
			await user.click(switchButton());

			await user.type(screen.getByRole("combobox"), "Attic{Enter}");

			expect(await screen.findByRole("alert")).toHaveTextContent(
				"Could not create",
			);
			expect(screen.getByText("Editing Plan")).toBeInTheDocument();
			expect(screen.queryByRole("dialog")).toBeNull();
		});
	});
});
