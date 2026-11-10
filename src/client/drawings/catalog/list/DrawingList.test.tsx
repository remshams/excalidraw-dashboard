import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import type { DrawingSummary } from "#shared/drawings.ts";
import type { Tag } from "#shared/tags.ts";
import { useTagFilter } from "../filter/use-tag-filter.ts";
import { DrawingList } from "./DrawingList.tsx";

/** The landing page with a filter of its own, as `App` gives it one. */
function FilteredList(
	props: Omit<ComponentProps<typeof DrawingList>, "filter">,
) {
	const filter = useTagFilter(props.tags);
	return <DrawingList {...props} filter={filter} />;
}

const summary = (
	id: string,
	name: string,
	previewUpdatedAt: string | null = null,
	tagIds: string[] = [],
): DrawingSummary => ({
	id,
	name,
	createdAt: "",
	updatedAt: "",
	previewUpdatedAt,
	tagIds,
});

const drawings = [
	summary("1", "Plan", "2026-01-02T00:00:00.000Z"),
	summary("2", "Roadmap"),
];

function setup(shown = drawings, tags: Tag[] = []) {
	const props = {
		onOpen: vi.fn(),
		onCreate: vi.fn(),
		onRename: vi.fn(),
		onDelete: vi.fn(),
		onToggleTag: vi.fn(),
		tagChanges: { create: vi.fn(), update: vi.fn(), remove: vi.fn() },
	};
	const { rerender } = render(
		<FilteredList drawings={shown} tags={tags} {...props} />,
	);
	return {
		...props,
		user: userEvent.setup(),
		show: (next: DrawingSummary[]) =>
			rerender(<FilteredList drawings={next} tags={tags} {...props} />),
	};
}

const cards = () =>
	within(screen.getByRole("list", { name: "Drawings" })).getAllByRole(
		"listitem",
	);

/** The tags along the foot of a card's sheet, as they read. */
const marksOf = (name: string) =>
	screen.getByRole("toolbar", { name: `Tags of ${name}` }).textContent;

/** The card's preview image; it has no role, since its alt text is empty. */
const previewOf = (name: string) =>
	screen.getByRole("link", { name }).querySelector("img");

describe("DrawingList", () => {
	it("shows a blank sheet to start a drawing, then a card per drawing in the given order", () => {
		setup();

		expect(cards().map((card) => card.textContent)).toEqual([
			"New drawing",
			expect.stringContaining("Plan"),
			expect.stringContaining("Roadmap"),
		]);
	});

	it("links each card to its drawing's path", () => {
		setup();

		expect(screen.getByRole("link", { name: "Plan" })).toHaveAttribute(
			"href",
			"/drawings/1",
		);
	});

	it("opens a drawing from its card", async () => {
		const { user, onOpen } = setup();

		await user.click(screen.getByRole("link", { name: "Roadmap" }));

		expect(onOpen).toHaveBeenCalledExactlyOnceWith("2");
	});

	it("shows the preview, versioned by its update time", () => {
		setup();

		const image = previewOf("Plan");
		expect(image).toHaveAttribute(
			"src",
			"/api/drawings/1/preview?v=2026-01-02T00%3A00%3A00.000Z",
		);
		expect(image).toHaveAttribute("alt", "");
		expect(image).toHaveAttribute("loading", "lazy");
	});

	it("shows a blank sheet for a drawing without a preview", () => {
		setup();

		expect(previewOf("Roadmap")).toBeNull();
	});

	it("shows a blank sheet when the preview fails to load", () => {
		setup();

		fireEvent.error(previewOf("Plan") as HTMLImageElement);

		expect(previewOf("Plan")).toBeNull();
	});

	it("shows a new preview after an earlier one failed to load", () => {
		const { show } = setup();
		fireEvent.error(previewOf("Plan") as HTMLImageElement);

		show([summary("1", "Plan", "2026-01-03T00:00:00.000Z")]);

		expect(previewOf("Plan")).toHaveAttribute(
			"src",
			"/api/drawings/1/preview?v=2026-01-03T00%3A00%3A00.000Z",
		);
	});

	it("creates a drawing with the entered name", async () => {
		const { user, onCreate } = setup();
		expect(screen.queryByRole("textbox")).toBeNull();

		await user.click(screen.getByRole("button", { name: "New drawing" }));
		await user.type(
			screen.getByRole("textbox", { name: "Name of the new drawing" }),
			"Sketch{Enter}",
		);

		expect(onCreate).toHaveBeenCalledWith("Sketch");
		expect(screen.queryByRole("textbox")).toBeNull();
	});

	it("does not create a drawing when naming is cancelled", async () => {
		const { user, onCreate } = setup();

		await user.click(screen.getByRole("button", { name: "New drawing" }));
		await user.type(screen.getByRole("textbox"), "Sketch{Escape}");

		expect(onCreate).not.toHaveBeenCalled();
		expect(
			screen.getByRole("button", { name: "New drawing" }),
		).toBeInTheDocument();
	});

	it("renames a drawing in place", async () => {
		const { user, onRename } = setup();

		await user.click(screen.getByRole("button", { name: "Rename Plan" }));
		const field = screen.getByRole("textbox", { name: "New name for Plan" });
		expect(field).toHaveValue("Plan");
		await user.clear(field);
		await user.type(field, "Ideas{Enter}");

		expect(onRename).toHaveBeenCalledWith("1", "Ideas");
		expect(screen.getByRole("link", { name: "Plan" })).toBeInTheDocument();
	});

	it("deletes a drawing after confirmation", async () => {
		const { user, onDelete } = setup();

		await user.click(screen.getByRole("button", { name: "Delete Roadmap" }));
		expect(screen.getByText("Delete “Roadmap”?")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Delete" }));

		expect(onDelete).toHaveBeenCalledWith("2");
		expect(screen.queryByText("Delete “Roadmap”?")).toBeNull();
	});

	it.each([
		[
			"the Keep button",
			(user: ReturnType<typeof userEvent.setup>) =>
				user.click(screen.getByRole("button", { name: "Keep" })),
		],
		[
			"Escape",
			(user: ReturnType<typeof userEvent.setup>) => user.keyboard("{Escape}"),
		],
	])(
		"keeps a drawing when deletion is cancelled with %s",
		async (_, cancel) => {
			const { user, onDelete } = setup();

			await user.click(screen.getByRole("button", { name: "Delete Roadmap" }));
			expect(screen.getByRole("button", { name: "Keep" })).toHaveFocus();
			await cancel(user);

			expect(onDelete).not.toHaveBeenCalled();
			expect(screen.getByRole("link", { name: "Roadmap" })).toBeInTheDocument();
		},
	);

	it("asks on one card at a time", async () => {
		const { user } = setup();

		await user.click(screen.getByRole("button", { name: "Delete Roadmap" }));
		await user.click(screen.getByRole("button", { name: "Rename Plan" }));

		expect(screen.queryByText("Delete “Roadmap”?")).toBeNull();
		expect(
			screen.getByRole("textbox", { name: "New name for Plan" }),
		).toBeInTheDocument();
	});

	it("closes the new drawing's name field when another card asks", async () => {
		const { user } = setup();

		await user.click(screen.getByRole("button", { name: "New drawing" }));
		await user.click(screen.getByRole("button", { name: "Delete Plan" }));

		expect(
			screen.queryByRole("textbox", { name: "Name of the new drawing" }),
		).toBeNull();
		expect(screen.getByText("Delete “Plan”?")).toBeInTheDocument();
	});

	it("closes a card's question when the new drawing asks for a name", async () => {
		const { user } = setup();

		await user.click(screen.getByRole("button", { name: "Delete Plan" }));
		await user.click(screen.getByRole("button", { name: "New drawing" }));

		expect(screen.queryByText("Delete “Plan”?")).toBeNull();
		expect(
			screen.getByRole("textbox", { name: "Name of the new drawing" }),
		).toBeInTheDocument();
	});

	it("keeps the preview on the sheet while a card asks", async () => {
		const { user } = setup();

		await user.click(screen.getByRole("button", { name: "Delete Plan" }));

		expect(cards()[1].querySelector("img")).not.toBeNull();
	});

	describe("search", () => {
		const search = () =>
			screen.getByRole("searchbox", { name: "Search drawings" });

		it("shows only the drawings whose name matches, after the blank sheet", async () => {
			const { user } = setup();

			await user.type(search(), "road");

			expect(cards().map((card) => card.textContent)).toEqual([
				"New drawing",
				expect.stringContaining("Roadmap"),
			]);
			expect(screen.getByRole("status")).toBeEmptyDOMElement();
		});

		it("shows every drawing again once the query is cleared", async () => {
			const { user } = setup();

			await user.type(search(), "road");
			await user.clear(search());

			expect(cards()).toHaveLength(3);
		});

		it("says so when no drawing matches, and keeps the blank sheet", async () => {
			const { user } = setup();

			await user.type(search(), "  Garden ");

			expect(screen.getByRole("status")).toHaveTextContent(
				"No drawing is named “Garden”.",
			);
			expect(cards().map((card) => card.textContent)).toEqual(["New drawing"]);
		});

		it("says nothing for a blank query", async () => {
			const { user } = setup([]);

			await user.type(search(), "   ");

			expect(screen.getByRole("status")).toBeEmptyDOMElement();
		});

		it("doesn't name a new drawing after the query", async () => {
			const { user } = setup();

			await user.type(search(), "road");
			await user.click(screen.getByRole("button", { name: "New drawing" }));

			expect(
				screen.getByRole("textbox", { name: "Name of the new drawing" }),
			).toHaveValue("");
		});

		it("closes a card's question when the query changes", async () => {
			const { user } = setup();

			await user.click(screen.getByRole("button", { name: "Delete Roadmap" }));
			await user.type(search(), "plan");
			await user.clear(search());

			expect(screen.queryByText("Delete “Roadmap”?")).toBeNull();
			expect(screen.getByRole("link", { name: "Roadmap" })).toBeVisible();
		});

		it("applies to drawings that change while searching", async () => {
			const { user, show } = setup();

			await user.type(search(), "plan");
			show([...drawings, summary("3", "Floor plan")]);

			expect(screen.getByRole("link", { name: "Floor plan" })).toBeVisible();
			expect(screen.queryByRole("link", { name: "Roadmap" })).toBeNull();
		});
	});

	describe("tags", () => {
		const tags: Tag[] = [
			{ id: "a", label: "Home", color: "green" },
			{ id: "b", label: "Ideas", color: "yellow" },
			{ id: "c", label: "Later", color: "teal" },
			{ id: "d", label: "Work", color: "blue" },
		];
		const tagged = [
			summary("1", "Plan", null, ["d", "c", "b", "a"]),
			summary("2", "Roadmap", null, ["d"]),
		];

		it("shows the first 3 tags of a card by label and counts the rest", () => {
			setup(tagged, tags);

			expect(marksOf("Plan")).toBe("HomeIdeasLater+1");
			expect(marksOf("Roadmap")).toBe("Work");
		});

		it("counts nothing more for a card with exactly 3 tags", () => {
			setup([summary("1", "Plan", null, ["a", "b", "c"])], tags);

			expect(marksOf("Plan")).toBe("HomeIdeasLater");
		});

		it("shows no tag strip on a card without tags", () => {
			setup([summary("1", "Plan")], tags);

			expect(screen.getByRole("link", { name: "Plan" })).toBeInTheDocument();
			expect(screen.queryByRole("toolbar")).toBeNull();
		});

		it("names every tag of a card in its accessible name", () => {
			setup(tagged, tags);

			expect(
				screen.getByRole("link", {
					name: "Plan, tags: Home, Ideas, Later, Work",
				}),
			).toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: "Roadmap, tags: Work" }),
			).toBeInTheDocument();
		});

		it("shows no tags while they aren't loaded", () => {
			render(
				<FilteredList
					drawings={tagged}
					tags={null}
					tagChanges={{ create: vi.fn(), update: vi.fn(), remove: vi.fn() }}
					onOpen={vi.fn()}
					onCreate={vi.fn()}
					onRename={vi.fn()}
					onDelete={vi.fn()}
					onToggleTag={vi.fn()}
				/>,
			);

			expect(screen.getByRole("link", { name: "Plan" })).toBeInTheDocument();
		});

		it("changes a card's tags in a dialog for that drawing", async () => {
			const { user, onToggleTag } = setup(tagged, tags);
			onToggleTag.mockResolvedValue(undefined);
			const change = screen.getByRole("button", {
				name: "Change tags of Roadmap",
			});
			expect(change).toHaveAttribute("aria-haspopup", "dialog");

			await user.click(change);
			await user.click(screen.getByRole("button", { name: "Add Home" }));

			expect(
				screen.getByRole("dialog", { name: "Tags of Roadmap" }),
			).toBeInTheDocument();
			expect(onToggleTag).toHaveBeenCalledExactlyOnceWith(tagged[1], "a");

			await user.click(screen.getByRole("button", { name: "Done" }));

			expect(screen.queryByRole("dialog")).toBeNull();
		});

		it("shows the drawing's latest tags in the open dialog", async () => {
			const { user, show } = setup(tagged, tags);
			await user.click(
				screen.getByRole("button", { name: "Change tags of Roadmap" }),
			);

			show([tagged[0], summary("2", "Roadmap", null, ["d", "a"])]);

			expect(
				within(screen.getByRole("group", { name: "Tags it has" }))
					.getAllByRole("button")
					.map((tag) => tag.getAttribute("aria-label")),
			).toEqual(["Remove Home", "Remove Work"]);
		});
	});

	describe("tag filter", () => {
		const tags: Tag[] = [
			{ id: "a", label: "Home", color: "green" },
			{ id: "b", label: "Ideas", color: "yellow" },
			{ id: "c", label: "Later", color: "teal" },
			{ id: "d", label: "Work", color: "blue" },
			{ id: "e", label: "Unused", color: "red" },
		];
		const tagged = [
			summary("1", "Plan", null, ["a", "b", "c", "d"]),
			summary("2", "Roadmap", null, ["d"]),
			summary("3", "Garden plan", null, ["a"]),
			summary("4", "Shopping", null, []),
		];

		const cardTag = (name: string, label: string) =>
			within(
				screen.getByRole("toolbar", { name: `Tags of ${name}` }),
			).getByRole("button", { name: `Filter by ${label}` });
		const rowTag = (label: string) =>
			within(screen.getByRole("toolbar", { name: "Filter by" })).getByRole(
				"button",
				{ name: `Filter by ${label}` },
			);
		const shownNames = () =>
			within(screen.getByRole("list", { name: "Drawings" }))
				.queryAllByRole("link")
				.map((link) => link.textContent);
		const search = () =>
			screen.getByRole("searchbox", { name: "Search drawings" });

		it("filters by a tag on a card without opening the drawing", async () => {
			const { user, onOpen } = setup(tagged, tags);

			await user.click(cardTag("Roadmap", "Work"));

			expect(onOpen).not.toHaveBeenCalled();
			expect(shownNames()).toEqual(["Plan", "Roadmap"]);
			expect(cardTag("Roadmap", "Work")).toHaveAttribute(
				"aria-pressed",
				"true",
			);
			expect(cardTag("Plan", "Work")).toHaveAttribute("aria-pressed", "true");
			expect(rowTag("Work")).toHaveAttribute("aria-pressed", "true");
		});

		it("shows the drawings with any of several tags", async () => {
			const { user } = setup(tagged, tags);

			await user.click(cardTag("Roadmap", "Work"));
			await user.click(cardTag("Plan", "Home"));

			expect(shownNames()).toEqual(["Plan", "Roadmap", "Garden plan"]);
			expect(
				screen.getByRole("toolbar", { name: "Filter by" }),
			).toHaveTextContent(/^WorkHome$/);
		});

		it("gives a tag in the filter that would hide behind +N a slot on a card, in label order", async () => {
			const { user } = setup(tagged, tags);
			expect(marksOf("Plan")).toBe("HomeIdeasLater+1");

			await user.click(cardTag("Roadmap", "Work"));

			expect(marksOf("Plan")).toBe("HomeIdeasWork+1");
			expect(
				screen.getByRole("link", {
					name: "Plan, tags: Home, Ideas, Later, Work",
				}),
			).toBeInTheDocument();
		});

		it("is one tab stop per card, with the arrow keys moving between its tags", async () => {
			const { user } = setup(tagged, tags);

			screen.getByRole("link", { name: /^Plan/ }).focus();
			await user.tab();
			expect(cardTag("Plan", "Home")).toHaveFocus();
			await user.keyboard("{ArrowRight}");
			expect(cardTag("Plan", "Ideas")).toHaveFocus();
			await user.tab();
			expect(
				screen.getByRole("button", { name: "Change tags of Plan" }),
			).toHaveFocus();
			await user.tab({ shift: true });
			expect(cardTag("Plan", "Ideas")).toHaveFocus();
		});

		it("keeps the focus on a toggled tag on its card", async () => {
			const { user } = setup(tagged, tags);
			cardTag("Plan", "Later").focus();

			await user.keyboard("{Enter}");

			expect(cardTag("Plan", "Later")).toHaveFocus();
			expect(cardTag("Plan", "Later")).toHaveAttribute("aria-pressed", "true");
			expect(marksOf("Plan")).toBe("HomeIdeasLater+1");
		});

		it("keeps a card's tags in their places when one is turned on or off", async () => {
			const { user } = setup(tagged, tags);

			await user.click(cardTag("Plan", "Ideas"));
			expect(marksOf("Plan")).toBe("HomeIdeasLater+1");
			await user.click(cardTag("Plan", "Home"));
			expect(marksOf("Plan")).toBe("HomeIdeasLater+1");
			await user.click(cardTag("Plan", "Ideas"));
			expect(marksOf("Plan")).toBe("HomeIdeasLater+1");
		});

		it("moves the focus to the tag in the row when its card leaves the page", async () => {
			const { user } = setup(tagged, tags);
			await user.click(cardTag("Roadmap", "Work"));
			await user.click(cardTag("Plan", "Home"));

			await user.click(cardTag("Roadmap", "Work"));

			expect(shownNames()).toEqual(["Plan", "Garden plan"]);
			expect(rowTag("Work")).toHaveFocus();
			expect(rowTag("Work")).toHaveAttribute("aria-pressed", "false");
		});

		it("moves the focus to the tag in the row when it leaves the first tags of its card", async () => {
			const { user } = setup(tagged, tags);
			await user.click(cardTag("Roadmap", "Work"));

			await user.click(cardTag("Plan", "Work"));

			expect(marksOf("Plan")).toBe("HomeIdeasLater+1");
			expect(rowTag("Work")).toHaveFocus();
		});

		it("shows every drawing again after Clear filter", async () => {
			const { user } = setup(tagged, tags);
			await user.click(cardTag("Roadmap", "Work"));

			await user.click(screen.getByRole("button", { name: "Clear filter" }));

			expect(shownNames()).toHaveLength(4);
			expect(rowTag("Work")).toHaveAttribute("aria-pressed", "false");
		});

		it("filters by a tag from the tray", async () => {
			const { user } = setup(tagged, tags);

			await user.click(screen.getByRole("button", { name: "Tags" }));
			await user.click(
				within(screen.getByRole("dialog", { name: "Tags" })).getByRole(
					"button",
					{ name: "Filter by Later" },
				),
			);

			expect(shownNames()).toEqual(["Plan"]);
			expect(
				screen.getByRole("button", { name: "Tags, 1 in the filter" }),
			).toBeInTheDocument();
		});

		it("says when no drawing has the tags of the filter", async () => {
			const { user } = setup(tagged, tags);

			await user.click(screen.getByRole("button", { name: "Tags" }));
			await user.click(
				screen.getByRole("button", { name: "Filter by Unused" }),
			);

			await user.keyboard("{Escape}");

			expect(shownNames()).toEqual([]);
			expect(screen.getByRole("status")).toHaveTextContent(
				"No drawing has Unused.",
			);
			// Only the row offers it; nothing outside the filter has a name to keep.
			expect(
				screen.getAllByRole("button", { name: "Clear filter" }),
			).toHaveLength(1);
		});

		it("searches within the filter", async () => {
			const { user } = setup(tagged, tags);
			await user.click(cardTag("Plan", "Home"));

			await user.type(search(), "garden");

			expect(shownNames()).toEqual(["Garden plan"]);
		});

		it("says how many drawings outside the filter the search finds, and clears the filter but not the search", async () => {
			const { user } = setup(tagged, tags);
			await user.click(cardTag("Roadmap", "Work"));
			await user.click(cardTag("Plan", "Work"));
			await user.click(cardTag("Roadmap", "Work"));

			await user.type(search(), "garden");

			expect(shownNames()).toEqual([]);
			expect(screen.getByText(/^No drawing with/)).toHaveTextContent(
				"No drawing with Work is named “garden”. 1 drawing without this tag is.",
			);

			const clear = within(
				screen.getByText(/^No drawing with/).parentElement as HTMLElement,
			).getByRole("button", { name: "Clear filter" });
			await user.click(clear);

			expect(shownNames()).toEqual(["Garden plan"]);
			expect(search()).toHaveValue("garden");
			expect(search()).toHaveFocus();
			expect(screen.queryByText(/^No drawing/)).toBeNull();
		});

		it("focuses the Tags button when the tags dialog took its card off the page", async () => {
			const { user, show, onToggleTag } = setup(tagged, tags);
			onToggleTag.mockResolvedValue(undefined);
			await user.click(cardTag("Roadmap", "Work"));
			await user.click(
				screen.getByRole("button", { name: "Change tags of Roadmap" }),
			);

			await user.click(screen.getByRole("button", { name: "Remove Work" }));
			show(tagged.map((d) => (d.id === "2" ? { ...d, tagIds: [] } : d)));
			await user.click(screen.getByRole("button", { name: "Done" }));

			expect(screen.queryByRole("link", { name: /^Roadmap/ })).toBeNull();
			expect(
				screen.getByRole("button", { name: "Tags, 1 in the filter" }),
			).toHaveFocus();
		});

		it("closes a card's question when the filter changes", async () => {
			const { user } = setup(tagged, tags);
			await user.click(screen.getByRole("button", { name: "Rename Plan" }));

			await user.click(cardTag("Roadmap", "Work"));

			expect(
				screen.queryByRole("textbox", { name: "New name for Plan" }),
			).toBeNull();
		});
	});
});
