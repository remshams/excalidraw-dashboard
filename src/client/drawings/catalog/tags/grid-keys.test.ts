import type { KeyboardEvent } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { moveInGrid, moveInRow } from "./grid-keys.ts";

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

describe("moveInGrid with several buttons in a cell", () => {
	it("moves through every button left and right, and by whole rows up and down", () => {
		document.body.innerHTML = "";
		const cells = document.createElement("ul");
		cells.style.gridTemplateColumns = "100px 100px";
		const buttons = [0, 1, 2, 3].flatMap(() => {
			const cell = document.createElement("li");
			const pair = [
				document.createElement("button"),
				document.createElement("button"),
			];
			cell.append(...pair);
			cells.append(cell);
			return pair;
		});
		document.body.append(cells);
		buttons[1].focus();

		moveInGrid(press("ArrowRight"), cells);
		expect(buttons[2]).toHaveFocus();

		moveInGrid(press("ArrowDown"), cells);
		expect(buttons[6]).toHaveFocus();

		moveInGrid(press("ArrowUp"), cells);
		expect(buttons[2]).toHaveFocus();
	});
});

describe("moveInRow", () => {
	it("moves one button left and right", () => {
		const event = press("ArrowRight");

		expect(moveInRow(event, grid)).toBe(items[1]);
		expect(items[1]).toHaveFocus();
		expect(event.preventDefault).toHaveBeenCalled();

		moveInRow(press("ArrowLeft"), grid);
		expect(items[0]).toHaveFocus();
	});

	it("leaves up and down alone", () => {
		const down = press("ArrowDown");

		expect(moveInRow(down, grid)).toBeNull();
		expect(down.preventDefault).not.toHaveBeenCalled();
		expect(items[0]).toHaveFocus();
	});

	it("stays at the edge and says so", () => {
		expect(moveInRow(press("ArrowLeft"), grid)).toBeNull();
		expect(items[0]).toHaveFocus();
	});
});
