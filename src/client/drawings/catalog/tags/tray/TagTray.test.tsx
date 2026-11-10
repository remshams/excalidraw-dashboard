import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DrawingSummary } from "#shared/drawings.ts";
import type { Tag, TagRequest } from "#shared/tags.ts";
import { ApiError } from "../../../api.ts";
import { TagTray } from "./TagTray.tsx";

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

beforeEach(() => vi.resetAllMocks());

const filterProps = {
	selectedTagIds: [] as string[],
	onToggleFilter: vi.fn(),
	onClearFilter: vi.fn(),
};

const trayProps = { drawings, changes, ...filterProps };

/** A tray that keeps the filter the way the landing page does. */
function TrayWithFilter({ initial = [] }: { initial?: string[] }) {
	const [selected, setSelected] = useState(initial);
	return (
		<TagTray
			{...trayProps}
			tags={tags}
			selectedTagIds={selected}
			onToggleFilter={(id) =>
				setSelected((ids) =>
					ids.includes(id) ? ids.filter((t) => t !== id) : [...ids, id],
				)
			}
			onClearFilter={() => setSelected([])}
		/>
	);
}

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

	it("hands its Tags button to a ref", () => {
		const ref = createRef<HTMLButtonElement>();

		render(<TagTray ref={ref} tags={tags} {...trayProps} />);

		expect(ref.current).toBe(tagsButton());
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
			const created: Tag = {
				id: "n",
				label: "Garden",
				color: "blue",
				createdAt: "2026-01-01T00:00:00.000Z",
			};
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
			const created: Tag = {
				id: "n",
				label: "Garden",
				color: "blue",
				createdAt: "2026-01-01T00:00:00.000Z",
			};
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

	describe.each([
		["a composition is active", { isComposing: true }],
		["the key belongs to an input method", { keyCode: 229 }],
	])("while %s", (_, input) => {
		it("opens no form on Enter when no tag matches", async () => {
			const user = await openTray();
			await user.type(findField(), "garden");

			fireEvent.keyDown(findField(), { key: "Enter", ...input });

			expect(screen.queryByRole("textbox", { name: "Label" })).toBeNull();
			expect(findField()).toHaveValue("garden");
			expect(button("Create “garden”")).toBeVisible();
		});

		it("leaves the filter alone on Enter when a tag matches", async () => {
			const user = userEvent.setup();
			render(<TrayWithFilter />);
			await user.click(screen.getByRole("button", { name: /^Tags/ }));
			await user.type(findField(), "work");

			fireEvent.keyDown(findField(), { key: "Enter", ...input });

			expect(button("Filter by Work")).toHaveAttribute("aria-pressed", "false");
			expect(findField()).toHaveValue("work");
		});

		it("keeps the focus in the find field on ArrowDown", async () => {
			const user = await openTray();
			await user.type(findField(), "work");

			const notCancelled = fireEvent.keyDown(findField(), {
				key: "ArrowDown",
				...input,
			});

			expect(notCancelled).toBe(true);
			expect(findField()).toHaveFocus();
		});
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

		it("says so in the form when the change fails", async () => {
			changes.update.mockRejectedValue(new ApiError("", 500, ""));
			const user = await openTray();

			await user.click(button("Change Work"));
			await user.click(button("Save tag"));

			expect(await screen.findByRole("alert")).toHaveTextContent(
				"The change failed. Try again.",
			);
			expect(labelField()).toHaveFocus();
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
			expect(button("Filter by Network")).toHaveFocus();
			await user.tab();
			expect(button("New tag")).toHaveFocus();
		});

		it("moves through the rows with the arrow keys, back up to the find field", async () => {
			const user = await openTray();

			await user.keyboard("{ArrowDown}");
			expect(button("Filter by Network")).toHaveFocus();
			await user.keyboard("{ArrowDown}");
			expect(button("Filter by Personal")).toHaveFocus();
			await user.keyboard("{ArrowRight}");
			expect(button("Change Personal")).toHaveFocus();

			await user.tab();
			await user.tab({ shift: true });
			expect(button("Change Personal")).toHaveFocus();

			await user.keyboard("{ArrowLeft}{ArrowUp}{ArrowUp}");
			expect(findField()).toHaveFocus();
		});
	});

	describe("the filter", () => {
		async function openFilterTray(initial: string[] = []) {
			const user = userEvent.setup();
			render(<TrayWithFilter initial={initial} />);
			await user.click(screen.getByRole("button", { name: /^Tags/ }));
			return user;
		}

		it("makes each row a button that filters by its tag, described by its colour and count", async () => {
			await openTray();

			const work = button("Filter by Work");
			expect(work).toHaveAttribute("aria-pressed", "false");
			expect(work).toHaveAccessibleDescription("Blue, 2 drawings");
			// Paper-coloured words read on the darker fill, not on the solid colour.
			expect(work.style.getPropertyValue("--pressed-ink")).toBe(
				"var(--tag-blue-fill)",
			);
			expect(within(rowOf("Work")).getAllByRole("button")).toEqual([
				work,
				button("Change Work"),
			]);
		});

		it("puts a tag in the filter and takes it out with a click", async () => {
			const user = await openFilterTray();

			await user.click(button("Filter by Work"));

			expect(button("Filter by Work")).toHaveAttribute("aria-pressed", "true");
			expect(
				screen.getByRole("button", { name: "Tags, 1 in the filter" }),
			).toHaveTextContent("Tags1");

			await user.click(button("Filter by Work"));

			expect(button("Filter by Work")).toHaveAttribute("aria-pressed", "false");
			expect(screen.getByRole("button", { name: "Tags" })).toHaveTextContent(
				/^Tags$/,
			);
		});

		it("toggles the top match with Enter, says so and clears the find text", async () => {
			const user = await openFilterTray(["b"]);

			await user.type(findField(), "wor{Enter}");

			expect(button("Filter by Work")).toHaveAttribute("aria-pressed", "true");
			expect(findField()).toHaveValue("");
			expect(findField()).toHaveFocus();
			expect(screen.getByRole("status")).toHaveTextContent(
				"Work is in the filter.",
			);

			await user.type(findField(), "pers{Enter}");

			expect(button("Filter by Personal")).toHaveAttribute(
				"aria-pressed",
				"false",
			);
			expect(screen.getByRole("status")).toHaveTextContent(
				"Personal is out of the filter.",
			);
		});

		it("leaves the filter alone on Enter without a find text", async () => {
			const user = await openFilterTray();

			await user.type(findField(), "{Enter}");

			expect(button("Filter by Network")).toHaveAttribute(
				"aria-pressed",
				"false",
			);
			expect(screen.queryByRole("textbox", { name: "Label" })).toBeNull();
		});

		it("offers Clear filter only while a filter is set, and keeps the focus in the tray", async () => {
			const user = await openFilterTray(["a", "c"]);
			expect(
				screen.getByRole("button", { name: "Tags, 2 in the filter" }),
			).toBeInTheDocument();

			await user.click(button("Clear filter"));

			expect(button("Filter by Network")).toHaveAttribute(
				"aria-pressed",
				"false",
			);
			expect(button("Filter by Work")).toHaveAttribute("aria-pressed", "false");
			expect(screen.queryByRole("button", { name: "Clear filter" })).toBeNull();
			expect(findField()).toHaveFocus();
		});
	});
});
