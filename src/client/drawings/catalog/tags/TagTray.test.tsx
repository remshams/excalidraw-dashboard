import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { DrawingSummary } from "../../../../shared/drawings.ts";
import type { Tag } from "../../../../shared/tags.ts";
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

async function openTray(shownTags: Tag[] | null = tags) {
	const user = userEvent.setup();
	render(<TagTray tags={shownTags} drawings={drawings} />);
	await user.click(tagsButton());
	return user;
}

const tagsButton = () => screen.getByRole("button", { name: "Tags" });
const tray = () => screen.queryByRole("dialog", { name: "Tags" });
const findField = () => screen.getByRole("searchbox", { name: "Find a tag" });
const rows = () =>
	within(screen.getByRole("list", { name: "Tags" })).queryAllByRole("listitem");
const rowOf = (label: string) =>
	rows().find((row) => row.textContent?.startsWith(label)) as HTMLElement;

describe("TagTray", () => {
	it("stays closed until the Tags button opens it", async () => {
		render(<TagTray tags={tags} drawings={drawings} />);

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
});
