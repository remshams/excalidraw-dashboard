import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Tag } from "#shared/tags.ts";
import { FilterRow } from "./FilterRow.tsx";
import { useTagFilter } from "./use-tag-filter.ts";

const tag = (id: string, label: string, createdAt: string): Tag => ({
	id,
	label,
	color: "blue",
	createdAt: `2026-01-${createdAt}T00:00:00.000Z`,
});

const home = tag("a", "Home", "01");
const ideas = tag("b", "Ideas", "02");
const work = tag("c", "Work", "03");

/** The row of a filter over `tags`; the tests below it select tags through buttons. */
function Harness({ tags }: { tags: Tag[] }) {
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

function setup(tags: Tag[] = [home, ideas, work]) {
	const user = userEvent.setup();
	const view = render(<Harness tags={tags} />);
	const select = async (...labels: string[]) => {
		for (const label of labels) {
			await user.click(screen.getByRole("button", { name: `Select ${label}` }));
		}
	};
	const load = (loaded: Tag[]) => view.rerender(<Harness tags={loaded} />);
	return { user, select, load };
}

const row = () => screen.getByRole("toolbar", { name: "Filter by" });
const toggles = () => within(row()).getAllByRole("button");
const toggle = (label: string) =>
	within(row()).getByRole("button", { name: `Filter by ${label}` });
const clearButton = () =>
	screen.queryByRole("button", { name: "Clear filter" });

const order = () =>
	toggles().map((button) => button.getAttribute("aria-label"));

describe("FilterRow", () => {
	it("is blank while there are no tags", () => {
		setup([]);

		expect(screen.queryByRole("toolbar")).toBeNull();
		expect(screen.queryByText("Filter by")).toBeNull();
		expect(clearButton()).toBeNull();
	});

	it("shows every tag, newest created first, unpressed, with no words between them", () => {
		setup();

		expect(order()).toEqual([
			"Filter by Work",
			"Filter by Ideas",
			"Filter by Home",
		]);
		expect(row()).toHaveTextContent(/^WorkIdeasHome$/);
		for (const button of toggles()) {
			expect(button).toHaveAttribute("aria-pressed", "false");
		}
	});

	it("shows the selected tags pressed", async () => {
		const { select } = setup();

		await select("Home", "Work");

		expect(toggle("Work")).toHaveAttribute("aria-pressed", "true");
		expect(toggle("Home")).toHaveAttribute("aria-pressed", "true");
		expect(toggle("Ideas")).toHaveAttribute("aria-pressed", "false");
	});

	it("toggles a tag in the filter", async () => {
		const { user, select } = setup();
		await select("Work", "Home");

		await user.click(toggle("Work"));

		expect(toggle("Work")).toHaveAttribute("aria-pressed", "false");
		expect(toggle("Work")).toHaveFocus();
	});

	it("keeps every tag in its place when one is selected, turned off or cleared", async () => {
		const { user, select } = setup();
		const before = order();

		await select("Home", "Ideas");
		expect(order()).toEqual(before);
		await user.click(toggle("Ideas"));
		expect(order()).toEqual(before);
		await user.click(clearButton() as HTMLElement);
		expect(order()).toEqual(before);
	});

	it("puts a new tag first", () => {
		const { load } = setup();

		load([home, ideas, work, tag("d", "Fresh", "04")]);

		expect(order()[0]).toBe("Filter by Fresh");
		expect(order()).toHaveLength(4);
	});

	it("drops a deleted tag and leaves the others in their order", () => {
		const { load } = setup();

		load([home, work]);

		expect(order()).toEqual(["Filter by Work", "Filter by Home"]);
	});

	it("clears the filter, keeps the tags and moves the focus to the first one", async () => {
		const { user, select } = setup();
		await select("Work", "Home");

		await user.click(clearButton() as HTMLElement);

		expect(clearButton()).toBeNull();
		expect(toggles()).toHaveLength(3);
		for (const button of toggles()) {
			expect(button).toHaveAttribute("aria-pressed", "false");
		}
		expect(toggles()[0]).toHaveFocus();
	});

	it("is one tab stop, with the arrow keys moving between its tags", async () => {
		const { user } = setup();

		await user.tab();
		expect(toggle("Work")).toHaveFocus();
		await user.keyboard("{ArrowRight}");
		expect(toggle("Ideas")).toHaveFocus();
		await user.keyboard("{ArrowRight}{ArrowRight}");
		expect(toggle("Home")).toHaveFocus();
		await user.keyboard("{ArrowLeft}");
		expect(toggle("Ideas")).toHaveFocus();

		expect(toggles().filter((button) => button.tabIndex === 0)).toEqual([
			toggle("Ideas"),
		]);
	});
});
