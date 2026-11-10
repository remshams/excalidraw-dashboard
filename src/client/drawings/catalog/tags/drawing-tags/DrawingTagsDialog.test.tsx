import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DrawingSummary } from "#shared/drawings.ts";
import type { Tag, TagRequest } from "#shared/tags.ts";
import { ApiError } from "../../../api.ts";
import { DrawingTagsDialog } from "./DrawingTagsDialog.tsx";

const tags: Tag[] = [
	{
		id: "a",
		label: "Network",
		color: "teal",
		createdAt: "2026-01-01T00:00:00.000Z",
	},
	{
		id: "b",
		label: "Personal",
		color: "pink",
		createdAt: "2026-01-01T00:00:00.000Z",
	},
	{
		id: "c",
		label: "Work",
		color: "blue",
		createdAt: "2026-01-01T00:00:00.000Z",
	},
];

const changes = { create: vi.fn(), update: vi.fn(), remove: vi.fn() };
const onToggle = vi.fn();
const onClose = vi.fn();

beforeEach(() => {
	vi.resetAllMocks();
	onToggle.mockResolvedValue(undefined);
});

/**
 * The dialog for the drawing Plan, which takes in a change once `onToggle` resolves
 * and a created tag once `changes.create` does, as the landing page does.
 */
function Dialog({
	tagIds,
	shownTags,
}: {
	tagIds: string[];
	shownTags: Tag[] | null;
}) {
	const [ids, setIds] = useState(tagIds);
	const [stored, setStored] = useState(shownTags);
	const drawing: DrawingSummary = {
		id: "1",
		name: "Plan",
		createdAt: "",
		updatedAt: "",
		previewUpdatedAt: null,
		tagIds: ids,
	};
	return (
		<DrawingTagsDialog
			drawing={drawing}
			tags={stored}
			changes={{
				...changes,
				create: async (request: TagRequest) => {
					const created: Tag = await changes.create(request);
					setStored((list) => list && [...list, created]);
					return created;
				},
			}}
			onToggle={async (tagId) => {
				await onToggle(tagId);
				setIds((list) =>
					list.includes(tagId)
						? list.filter((id) => id !== tagId)
						: [...list, tagId],
				);
			}}
			onClose={onClose}
		/>
	);
}

function open(tagIds = ["c"], shownTags: Tag[] | null = tags) {
	render(<Dialog tagIds={tagIds} shownTags={shownTags} />);
	return userEvent.setup();
}

const button = (name: string) => screen.getByRole("button", { name });
const findField = () =>
	screen.getByRole("searchbox", { name: "Find a tag to add" });
const status = () => screen.getByRole("status");
const labelsIn = (group: string) =>
	within(screen.getByRole("group", { name: group }))
		.queryAllByRole("button")
		.map((tag) => tag.getAttribute("aria-label"));

describe("DrawingTagsDialog", () => {
	it("shows the drawing's tags apart from the ones to add, by label", () => {
		open(["c", "a"]);

		expect(
			screen.getByRole("dialog", { name: "Tags of Plan" }),
		).toHaveAttribute("open");
		expect(labelsIn("Tags it has")).toEqual(["Remove Network", "Remove Work"]);
		expect(labelsIn("Tags to add")).toEqual(["Add Personal"]);
	});

	it("says so when the drawing has no tags yet", () => {
		open([]);

		expect(
			within(screen.getByRole("group", { name: "Tags it has" })).getByText(
				"No tags yet.",
			),
		).toBeInTheDocument();
	});

	it("starts in the find field", () => {
		open();

		expect(findField()).toHaveFocus();
	});

	it("adds a tag and moves the focus to the next tag to add", async () => {
		const user = open();

		await user.click(button("Add Network"));

		expect(onToggle).toHaveBeenCalledExactlyOnceWith("a");
		await waitFor(() =>
			expect(labelsIn("Tags it has")).toEqual([
				"Remove Network",
				"Remove Work",
			]),
		);
		expect(button("Add Personal")).toHaveFocus();
	});

	it("takes a tag off and moves the focus to the find field when none is left", async () => {
		const user = open();

		await user.click(button("Remove Work"));

		expect(onToggle).toHaveBeenCalledExactlyOnceWith("c");
		await waitFor(() => expect(labelsIn("Tags it has")).toEqual([]));
		expect(labelsIn("Tags to add")).toContain("Add Work");
		expect(findField()).toHaveFocus();
	});

	it("finds the tags to add by label and adds the top match on Enter", async () => {
		const user = open([]);

		await user.type(findField(), "o");

		expect(labelsIn("Tags to add")).toEqual([
			"Add Network",
			"Add Personal",
			"Add Work",
		]);

		await user.clear(findField());
		await user.type(findField(), "w{Enter}");

		expect(onToggle).toHaveBeenCalledExactlyOnceWith("c");
		expect(findField()).toHaveValue("");
		await waitFor(() =>
			expect(labelsIn("Tags it has")).toEqual(["Remove Work"]),
		);
	});

	it("says what a change did, for screen readers", async () => {
		const user = open();

		await user.click(button("Add Network"));

		expect(status()).toHaveTextContent("Network added.");

		await user.click(button("Remove Work"));

		expect(status()).toHaveTextContent("Work removed.");

		await user.type(findField(), "x");

		expect(status()).not.toHaveTextContent("removed");
	});

	it("neither adds nor creates a tag the drawing already has", async () => {
		const user = open(["b"]);

		await user.type(findField(), "personal{Enter}");

		expect(onToggle).not.toHaveBeenCalled();
		expect(screen.queryByRole("textbox", { name: "Label" })).toBeNull();
		expect(status()).toHaveTextContent("It has “personal” already.");
		expect(button("New tag")).toBeInTheDocument();
	});

	it.each([
		["a composition is active", { isComposing: true }],
		["the key belongs to an input method", { keyCode: 229 }],
	])(
		"leaves Enter and ArrowDown to the input method when %s",
		async (_, input) => {
			const user = open();
			await user.type(findField(), "net");

			expect(
				fireEvent.keyDown(findField(), { key: "ArrowDown", ...input }),
			).toBe(true);
			fireEvent.keyDown(findField(), { key: "Enter", ...input });

			expect(onToggle).not.toHaveBeenCalled();
			expect(findField()).toHaveValue("net");
		},
	);

	it("adds nothing on Enter with an empty find field", async () => {
		const user = open();

		await user.type(findField(), "{Enter}");

		expect(onToggle).not.toHaveBeenCalled();
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});

	it("offers to create a tag no tag matches", async () => {
		const user = open();

		await user.type(findField(), "Garden");

		expect(status()).toHaveTextContent("No tag to add is called “Garden”.");
		expect(button("Create “Garden”")).toBeInTheDocument();
	});

	it("creates a tag in place on Enter and gives it to the drawing", async () => {
		changes.create.mockResolvedValue({
			id: "d",
			label: "Garden",
			color: "green",
		});
		const user = open();

		await user.type(findField(), "Garden{Enter}");

		expect(
			screen.getByRole("heading", { name: "New tag" }),
		).toBeInTheDocument();
		expect(screen.getByRole("textbox", { name: "Label" })).toHaveValue(
			"Garden",
		);

		await user.click(screen.getByRole("radio", { name: "Green" }));
		await user.click(button("Create tag"));

		expect(changes.create).toHaveBeenCalledExactlyOnceWith({
			label: "Garden",
			color: "green",
		});
		expect(onToggle).toHaveBeenCalledExactlyOnceWith("d");
		await waitFor(() =>
			expect(labelsIn("Tags it has")).toEqual(["Remove Work", "Remove Garden"]),
		);
		expect(findField()).toHaveValue("");
		expect(findField()).toHaveFocus();
	});

	it("keeps a refused new tag in the form", async () => {
		changes.create.mockRejectedValue(
			new ApiError("refused", 409, 'A tag named "Garden" already exists'),
		);
		const user = open();

		await user.click(button("New tag"));
		await user.type(screen.getByRole("textbox", { name: "Label" }), "Garden");
		await user.click(button("Create tag"));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			'A tag named "Garden" already exists',
		);
		expect(onToggle).not.toHaveBeenCalled();
	});

	it.each([
		[
			new ApiError("gone", 404, "Not Found"),
			"The drawing or its tags changed elsewhere. Reload the page.",
		],
		[
			new ApiError("unknown tag", 400, "A tag ID names no tag"),
			"The drawing or its tags changed elsewhere. Reload the page.",
		],
		[new TypeError("Failed to fetch"), "The change failed. Try again."],
	])("says why a change failed: %s", async (cause, message) => {
		onToggle.mockRejectedValueOnce(cause);
		const user = open();

		await user.click(button("Add Network"));

		expect(await screen.findByRole("alert")).toHaveTextContent(message);
		expect(labelsIn("Tags it has")).toEqual(["Remove Work"]);

		await user.click(button("Add Network"));

		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("goes back one layer per Escape: the form, the find text, the dialog", async () => {
		const user = open();
		await user.type(findField(), "Garden{Enter}");

		await user.keyboard("{Escape}");

		expect(findField()).toHaveValue("Garden");
		expect(onClose).not.toHaveBeenCalled();

		await user.keyboard("{Escape}");

		expect(findField()).toHaveValue("");
		expect(onClose).not.toHaveBeenCalled();

		await user.keyboard("{Escape}");

		expect(onClose).toHaveBeenCalledOnce();
	});

	it("closes with Done", async () => {
		const user = open();

		await user.click(button("Done"));

		expect(onClose).toHaveBeenCalledOnce();
	});

	it("moves between the find field and the tags to add with the arrow keys", async () => {
		const user = open([]);

		await user.keyboard("{ArrowDown}");

		expect(button("Add Network")).toHaveFocus();

		await user.keyboard("{ArrowRight}");

		expect(button("Add Personal")).toHaveFocus();

		await user.keyboard("{ArrowLeft}{ArrowUp}");

		expect(findField()).toHaveFocus();
	});

	it("puts only the first tag to add in the tab order", () => {
		open([]);

		expect(
			within(screen.getByRole("group", { name: "Tags to add" }))
				.getAllByRole("button")
				.map((tag) => tag.tabIndex),
		).toEqual([0, -1, -1]);
	});

	it("says when the drawing has every tag", () => {
		open(["a", "b", "c"]);

		expect(status()).toHaveTextContent("It has every tag.");
	});

	it("says when there are no tags at all", () => {
		open([], []);

		expect(status()).toHaveTextContent("There are no tags yet.");
	});

	it("offers no new tag while the tags aren't loaded", () => {
		open([], null);

		expect(status()).toHaveTextContent("The tags aren't loaded.");
		expect(screen.queryByRole("button", { name: "New tag" })).toBeNull();
	});

	it("says nothing while there are tags to add", () => {
		open();

		expect(status()).toBeEmptyDOMElement();
	});

	it("puts every tag the drawing has in the tab order, each with a cross", () => {
		open(["a", "c"]);

		const remove = within(
			screen.getByRole("group", { name: "Tags it has" }),
		).getAllByRole("button");
		expect(remove.map((tag) => tag.tabIndex)).toEqual([0, 0]);
		expect(remove.every((tag) => tag.querySelector("svg"))).toBe(true);
		expect(button("Add Personal").querySelector("svg")).toBeNull();
	});

	it("keeps the browser's own handling of Escape and the arrow keys out", () => {
		open();

		expect(fireEvent.keyDown(findField(), { key: "ArrowDown" })).toBe(false);
		expect(
			fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" }),
		).toBe(false);
	});

	it("leaves the focus on a tag to add for a key that doesn't move it", async () => {
		const user = open([]);
		await user.keyboard("{ArrowDown}");

		await user.keyboard("x");

		expect(button("Add Network")).toHaveFocus();
	});

	it("refuses a label another tag has in the form, without asking the server", async () => {
		const user = open([]);

		await user.click(button("New tag"));
		await user.type(screen.getByRole("textbox", { name: "Label" }), "Work");
		await user.click(button("Create tag"));

		expect(screen.getByRole("alert")).toHaveTextContent(
			'A tag named "Work" already exists',
		);
		expect(changes.create).not.toHaveBeenCalled();
	});

	it("drops an old message once the user types or opens the form", async () => {
		onToggle.mockRejectedValueOnce(new TypeError("Failed to fetch"));
		const user = open();
		await user.click(button("Add Network"));
		await screen.findByRole("alert");

		expect(status()).toBeEmptyDOMElement();

		await user.type(findField(), "p");

		expect(screen.queryByRole("alert")).toBeNull();

		await user.clear(findField());
		await user.click(button("Add Personal"));
		await user.click(button("New tag"));
		await user.click(button("Cancel"));

		expect(status()).not.toHaveTextContent("Personal added.");
	});

	it("drops a failure once the user opens the form", async () => {
		onToggle.mockRejectedValueOnce(new TypeError("Failed to fetch"));
		const user = open();
		await user.click(button("Add Network"));
		await screen.findByRole("alert");

		await user.click(button("New tag"));
		await user.click(button("Cancel"));

		expect(screen.queryByRole("alert")).toBeNull();
	});
});
