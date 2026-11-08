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
import type { DrawingSummary } from "../../../../shared/drawings.ts";
import type { Tag, TagRequest } from "../../../../shared/tags.ts";
import { ApiError } from "../../api.ts";
import { TagTray } from "./TagTray.tsx";

const tags: Tag[] = [
	{ id: "a", label: "Network", color: "teal" },
	{ id: "b", label: "Personal", color: "pink" },
	{ id: "c", label: "Work", color: "blue" },
];

const drawing = (id: string, tagIds: string[]): DrawingSummary => ({
	id,
	name: id,
	createdAt: "",
	updatedAt: "",
	previewUpdatedAt: null,
	tagIds,
});

const drawings = [
	drawing("1", ["c"]),
	drawing("2", ["c", "b"]),
	drawing("3", []),
];

const changes = { create: vi.fn(), update: vi.fn(), remove: vi.fn() };
const onError = vi.fn();

beforeEach(() => vi.resetAllMocks());

const trayProps = { drawings, changes, onError };

/** A tray whose tags take in a created one, as `useTags` does. */
function TrayWithStoredTags() {
	const [stored, setStored] = useState(tags);
	const storing = {
		...changes,
		create: async (request: TagRequest) => {
			const created: Tag = await changes.create(request);
			setStored((list) => [...list, created]);
			return created;
		},
	};
	return <TagTray {...trayProps} tags={stored} changes={storing} />;
}

async function openTray(shownTags: Tag[] | null = tags) {
	const user = userEvent.setup();
	render(<TagTray tags={shownTags} {...trayProps} />);
	await user.click(tagsButton());
	return user;
}

const button = (name: string) => screen.getByRole("button", { name });
const labelField = () => screen.getByRole("textbox", { name: "Label" });
const tagsButton = () => screen.getByRole("button", { name: "Tags" });
const tray = () => screen.queryByRole("dialog", { name: "Tags" });
const findField = () => screen.getByRole("searchbox", { name: "Find a tag" });
const rows = () =>
	within(screen.getByRole("list", { name: "Tags" })).queryAllByRole("listitem");
const rowOf = (label: string) =>
	rows().find((row) => row.textContent?.startsWith(label)) as HTMLElement;

describe("TagTray", () => {
	it("stays closed until the Tags button opens it", async () => {
		render(<TagTray tags={tags} {...trayProps} />);

		expect(tray()).toBeNull();
		expect(tagsButton()).toHaveAttribute("aria-haspopup", "dialog");

		await userEvent.setup().click(tagsButton());

		expect(tray()).toHaveAttribute("open");
	});

	it("lists every tag with its colour in the given order", async () => {
		await openTray();

		expect(rows().map((row) => row.textContent)).toEqual([
			expect.stringContaining("Network"),
			expect.stringContaining("Personal"),
			expect.stringContaining("Work"),
		]);
		const swatch = within(rowOf("Work")).getByRole("img", { name: "Blue" });
		expect(swatch.style.background).toBe("var(--tag-blue-solid)");
	});

	it("names how many drawings carry each tag", async () => {
		await openTray();

		expect(rowOf("Work")).toHaveTextContent("2 drawings");
		expect(rowOf("Personal")).toHaveTextContent("1 drawing");
		expect(rowOf("Personal")).not.toHaveTextContent("drawings");
		expect(rowOf("Network")).toHaveTextContent("0 drawings");
	});

	it("narrows the rows to the tags the find field finds, best match first", async () => {
		const user = await openTray();

		await user.type(findField(), "work");

		expect(rows().map((row) => row.textContent)).toEqual([
			expect.stringContaining("Work"),
			expect.stringContaining("Network"),
		]);
		expect(screen.getByRole("status")).toBeEmptyDOMElement();
	});

	it("says when no tag has the text it looks for", async () => {
		const user = await openTray();

		await user.type(findField(), "  garden ");

		expect(rows()).toEqual([]);
		expect(screen.getByRole("status")).toHaveTextContent(
			"No tag is called “garden”.",
		);
	});

	it("says when there are no tags yet", async () => {
		await openTray([]);

		expect(rows()).toEqual([]);
		expect(screen.getByRole("status")).toHaveTextContent("No tags yet.");
	});

	it("says so when the tags aren't loaded", async () => {
		await openTray(null);

		expect(rows()).toEqual([]);
		expect(screen.getByRole("status")).toHaveTextContent(
			"The tags aren't loaded.",
		);
	});

	it("offers a label the row cuts off as its title", async () => {
		await openTray();

		expect(within(rowOf("Work")).getByTitle("Work")).toBeVisible();
	});

	it("clears the find text on Escape, then closes on the next one", async () => {
		const user = await openTray();
		await user.type(findField(), "work");

		await user.keyboard("{Escape}");

		expect(findField()).toHaveValue("");
		expect(tray()).not.toBeNull();

		await user.keyboard("{Escape}");

		expect(tray()).toBeNull();
	});

	it("closes when the browser cancels the dialog", async () => {
		await openTray();

		fireEvent(tray() as HTMLElement, new Event("cancel"));

		expect(tray()).toBeNull();
	});

	it("closes on a press on the backdrop, not on one inside", async () => {
		await openTray();

		fireEvent.mouseDown(findField());
		expect(tray()).not.toBeNull();

		fireEvent.mouseDown(tray() as HTMLElement);
		expect(tray()).toBeNull();
	});

	it("starts with an empty find field after reopening", async () => {
		const user = await openTray();
		await user.type(findField(), "work");
		await user.keyboard("{Escape}{Escape}");

		await user.click(tagsButton());

		expect(findField()).toHaveValue("");
	});

	describe("creating a tag", () => {
		it("offers New tag, or to create the text nothing matches", async () => {
			const user = await openTray();
			expect(button("New tag")).toBeVisible();

			await user.type(findField(), " garden ");

			expect(button("Create “garden”")).toBeVisible();
		});

		it("has no way to create a tag when the tags aren't loaded", async () => {
			const user = await openTray(null);

			expect(screen.queryByRole("button", { name: "New tag" })).toBeNull();

			await user.type(findField(), "garden{Enter}");

			expect(screen.queryByRole("textbox", { name: "Label" })).toBeNull();
		});

		it("creates a tag in the form and focuses its row in the list", async () => {
			const created: Tag = { id: "n", label: "Garden", color: "blue" };
			changes.create.mockResolvedValue(created);
			render(<TrayWithStoredTags />);
			const user = userEvent.setup();
			await user.click(tagsButton());

			await user.click(button("New tag"));
			expect(labelField()).toHaveFocus();
			await user.type(labelField(), "Garden");
			await user.click(button("Create tag"));

			expect(changes.create).toHaveBeenCalledWith({
				label: "Garden",
				color: "blue",
			});
			await waitFor(() => expect(button("Change Garden")).toHaveFocus());
			expect(screen.getByRole("status")).toHaveTextContent("Garden created.");
		});

		it("clears the find text after creating from it", async () => {
			const created: Tag = { id: "n", label: "Garden", color: "blue" };
			changes.create.mockResolvedValue(created);
			const user = await openTray();

			await user.type(findField(), "Garden");
			await user.click(button("Create “Garden”"));
			expect(labelField()).toHaveValue("Garden");
			await user.click(button("Create tag"));

			expect(await screen.findByRole("searchbox")).toHaveValue("");
		});

		it("opens the form with Enter only when nothing matches", async () => {
			const user = await openTray();

			await user.type(findField(), "work{Enter}");
			expect(screen.queryByRole("textbox", { name: "Label" })).toBeNull();

			await user.clear(findField());
			await user.type(findField(), "garden{Enter}");
			expect(labelField()).toHaveValue("garden");
		});
	});

	it("keeps the Enter that opens the form from also submitting it", async () => {
		const user = await openTray();
		await user.type(findField(), "garden");

		// A cancelled key press never reaches the form's field that has the focus by then.
		const notCancelled = fireEvent.keyDown(findField(), { key: "Enter" });

		expect(notCancelled).toBe(false);
		expect(labelField()).toHaveValue("garden");
		expect(changes.create).not.toHaveBeenCalled();
	});

	describe("changing a tag", () => {
		it("saves the new label and colour through one change", async () => {
			changes.update.mockResolvedValue({
				id: "c",
				label: "Job",
				color: "red",
			});
			const user = await openTray();

			await user.click(button("Change Work"));
			await user.clear(labelField());
			await user.type(labelField(), " Job ");
			await user.click(screen.getByRole("radio", { name: "Red" }));
			await user.click(button("Save tag"));

			expect(changes.update).toHaveBeenCalledWith("c", {
				label: "Job",
				color: "red",
			});
			expect(await screen.findByRole("status")).toHaveTextContent("Job saved.");
		});

		it("goes back to the list when the tag is gone", async () => {
			changes.update.mockRejectedValue(new ApiError("", 404, ""));
			const user = await openTray();

			await user.click(button("Change Work"));
			await user.click(button("Save tag"));

			expect(await screen.findByRole("status")).toHaveTextContent(
				"This tag was deleted elsewhere.",
			);
			expect(findField()).toHaveFocus();
		});

		it("reports a failure that isn't about the tag and keeps the form", async () => {
			const failure = new ApiError("PUT failed with 500", 500, "");
			changes.update.mockRejectedValue(failure);
			const user = await openTray();

			await user.click(button("Change Work"));
			await user.click(button("Save tag"));

			await waitFor(() => expect(onError).toHaveBeenCalledWith(failure));
			expect(labelField()).toBeVisible();
		});
	});

	describe("deleting a tag", () => {
		it("deletes after asking and focuses the find field", async () => {
			changes.remove.mockResolvedValue(undefined);
			const user = await openTray();

			await user.click(button("Change Work"));
			await user.click(button("Delete…"));
			expect(screen.getByText(/removed from 2 drawings/)).toBeVisible();
			await user.click(button("Delete tag"));

			expect(changes.remove).toHaveBeenCalledWith("c");
			expect(await screen.findByRole("status")).toHaveTextContent(
				"Work deleted.",
			);
			expect(findField()).toHaveFocus();
		});
	});

	describe("Escape", () => {
		it("undoes one layer at a time", async () => {
			const user = await openTray();
			await user.type(findField(), "work");
			await user.click(button("Change Work"));
			await user.click(button("Delete…"));

			await user.keyboard("{Escape}");
			expect(button("Save tag")).toBeVisible();

			await user.keyboard("{Escape}");
			expect(findField()).toHaveValue("work");
			expect(button("Change Work")).toHaveFocus();

			await user.keyboard("{Escape}");
			expect(findField()).toHaveValue("");
			expect(tray()).not.toBeNull();

			await user.keyboard("{Escape}");
			expect(tray()).toBeNull();
		});

		it("still undoes one layer after a press on a blank part of the form", async () => {
			const user = await openTray();
			await user.click(button("New tag"));

			await user.click(screen.getByRole("heading", { name: "New tag" }));
			await user.keyboard("{Escape}");

			expect(findField()).toHaveFocus();
			expect(tray()).not.toBeNull();
		});

		it("goes back to the find field from a new tag", async () => {
			const user = await openTray();

			await user.click(button("New tag"));
			await user.keyboard("{Escape}");

			expect(findField()).toHaveFocus();
		});
	});

	describe("the keyboard in the list", () => {
		it("has one tab stop in the rows", async () => {
			const user = await openTray();

			expect(findField()).toHaveFocus();
			await user.tab();
			expect(button("Change Network")).toHaveFocus();
			await user.tab();
			expect(button("New tag")).toHaveFocus();
		});

		it("moves through the rows with the arrow keys, back up to the find field", async () => {
			const user = await openTray();

			await user.keyboard("{ArrowDown}");
			expect(button("Change Network")).toHaveFocus();
			await user.keyboard("{ArrowDown}");
			expect(button("Change Personal")).toHaveFocus();

			await user.tab();
			await user.tab({ shift: true });
			expect(button("Change Personal")).toHaveFocus();

			await user.keyboard("{ArrowUp}{ArrowUp}");
			expect(findField()).toHaveFocus();
		});
	});
});
