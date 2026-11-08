import type { KeyboardEvent } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { moveInGrid } from "./grid-keys.ts";

const press = (key: string, modifiers = {}) =>
	({
		key,
		altKey: false,
		ctrlKey: false,
		metaKey: false,
		preventDefault: vi.fn(),
		...modifiers,
	}) as unknown as KeyboardEvent;

let grid: HTMLElement;
let items: HTMLElement[];

beforeEach(() => {
	document.body.innerHTML = "";
	grid = document.createElement("ul");
	grid.style.gridTemplateColumns = "100px 100px";
	items = [0, 1, 2, 3].map(() => {
		const item = document.createElement("button");
		grid.append(item);
		return item;
	});
	document.body.append(grid);
	items[0].focus();
});

describe("moveInGrid", () => {
	it("moves one item left and right", () => {
		const event = press("ArrowRight");

		expect(moveInGrid(event, grid)).toBe(items[1]);
		expect(items[1]).toHaveFocus();
		expect(event.preventDefault).toHaveBeenCalled();

		moveInGrid(press("ArrowLeft"), grid);
		expect(items[0]).toHaveFocus();
	});

	it("moves a whole row up and down", () => {
		moveInGrid(press("ArrowDown"), grid);
		expect(items[2]).toHaveFocus();

		moveInGrid(press("ArrowUp"), grid);
		expect(items[0]).toHaveFocus();
	});

	it("stays at the edge and says so", () => {
		expect(moveInGrid(press("ArrowUp"), grid)).toBeNull();
		expect(items[0]).toHaveFocus();
	});

	it("leaves other keys and browser shortcuts alone", () => {
		const other = press("a");
		expect(moveInGrid(other, grid)).toBeNull();
		expect(other.preventDefault).not.toHaveBeenCalled();

		for (const modifier of ["altKey", "ctrlKey", "metaKey"]) {
			const shortcut = press("ArrowRight", { [modifier]: true });
			expect(moveInGrid(shortcut, grid)).toBeNull();
			expect(shortcut.preventDefault).not.toHaveBeenCalled();
		}
		expect(items[0]).toHaveFocus();
	});
});
