import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Tag } from "#shared/tags.ts";
import { FilterRow } from "./FilterRow.tsx";
import { useTagFilter } from "./use-tag-filter.ts";

const tags: Tag[] = [
	{ id: "a", label: "Home", color: "green" },
	{ id: "b", label: "Ideas", color: "yellow" },
	{ id: "c", label: "Work", color: "blue" },
	...[4, 5, 6, 7, 8, 9].map(
		(n): Tag => ({ id: `t${n}`, label: `Tag ${n}`, color: "pink" }),
	),
];

/** The row with a filter the test sets up through the buttons below it. */
function Harness() {
	const filter = useTagFilter(tags);
	return (
		<>
			<FilterRow
				filter={filter}
				onToggle={filter.toggle}
				onClear={filter.clear}
			/>
			{tags.map(({ id, label }) => (
				<button key={id} type="button" onClick={() => filter.toggle(id)}>
					Select {label}
				</button>
			))}
		</>
	);
}

function setup() {
	const user = userEvent.setup();
	render(<Harness />);
	const select = async (...labels: string[]) => {
		for (const label of labels) {
			await user.click(screen.getByRole("button", { name: `Select ${label}` }));
		}
	};
	return { user, select };
}

const row = () => screen.getByRole("toolbar", { name: "Filter by" });
const toggles = () => within(row()).getAllByRole("button");
const toggle = (label: string) =>
	within(row()).getByRole("button", { name: `Filter by ${label}` });
const clearButton = () =>
	screen.queryByRole("button", { name: "Clear filter" });

describe("FilterRow", () => {
	it("is blank while it has no tags", () => {
		setup();

		expect(screen.queryByRole("toolbar")).toBeNull();
		expect(screen.queryByText("Filter by")).toBeNull();
		expect(clearButton()).toBeNull();
	});

	it("shows the selected tags pressed in the order selected, with or between them, then the others", async () => {
		const { select } = setup();

		await select("Work", "Home", "Ideas", "Ideas");

		expect(
			toggles().map((button) => button.getAttribute("aria-label")),
		).toEqual(["Filter by Work", "Filter by Home", "Filter by Ideas"]);
		expect(row()).toHaveTextContent(/^WorkorHomeIdeas$/);
		expect(toggle("Work")).toHaveAttribute("aria-pressed", "true");
		expect(toggle("Home")).toHaveAttribute("aria-pressed", "true");
		expect(toggle("Ideas")).toHaveAttribute("aria-pressed", "false");
	});

	it("toggles a tag in the filter", async () => {
		const { user, select } = setup();
		await select("Work", "Home");

		await user.click(toggle("Work"));

		expect(toggle("Work")).toHaveAttribute("aria-pressed", "false");
		expect(toggles()[0]).toBe(toggle("Home"));
	});

	it("clears the filter, keeps the tags and moves the focus to the first one", async () => {
		const { user, select } = setup();
		await select("Work", "Home");

		await user.click(clearButton() as HTMLElement);

		expect(clearButton()).toBeNull();
		expect(toggles()).toHaveLength(2);
		for (const button of toggles()) {
			expect(button).toHaveAttribute("aria-pressed", "false");
		}
		expect(toggles()[0]).toHaveFocus();
	});

	it("is one tab stop, with the arrow keys moving between its tags", async () => {
		const { user, select } = setup();
		await select("Work", "Home", "Ideas", "Home", "Ideas");

		await user.click(clearButton() as HTMLElement);
		expect(toggles()).toEqual([
			toggle("Ideas"),
			toggle("Home"),
			toggle("Work"),
		]);
		expect(toggle("Ideas")).toHaveFocus();
		await user.keyboard("{ArrowRight}");
		expect(toggle("Home")).toHaveFocus();
		await user.keyboard("{ArrowRight}{ArrowRight}");
		expect(toggle("Work")).toHaveFocus();
		await user.keyboard("{ArrowLeft}");
		expect(toggle("Home")).toHaveFocus();

		expect(toggles().filter((button) => button.tabIndex === 0)).toEqual([
			toggle("Home"),
		]);
	});

	it("keeps the 8 tags selected last and drops the oldest", async () => {
		const { select } = setup();
		const labels = tags.map(({ label }) => label);

		await select(...labels, ...labels);

		expect(clearButton()).toBeNull();
		expect(toggles().map((button) => button.textContent)).toEqual(
			labels.slice(1).reverse(),
		);
	});
});
