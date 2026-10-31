import { randomUUID } from "node:crypto";
import {
	type APIRequestContext,
	expect,
	type Page,
	test,
} from "@playwright/test";

/** The fields of a drawing the tests read from `GET /api/drawings/:id`. */
type StoredDrawing = { id: string; name: string; scene: string | null };

type SceneElement = { type: string; isDeleted?: boolean };

/** A name no other test or earlier run uses, such as "Plan 1a2b3c4d". */
export function uniqueName(base: string): string {
	return `${base} ${randomUUID().slice(0, 8)}`;
}

function drawingList(page: Page) {
	return page.getByRole("navigation", { name: "Drawings" });
}

function drawingButton(page: Page, name: string) {
	return drawingList(page).getByRole("button", { name, exact: true });
}

/** A drawing's row. Its rename and delete actions appear while it is hovered. */
function drawingRow(page: Page, name: string) {
	return drawingList(page)
		.getByRole("listitem")
		.filter({ has: page.getByRole("button", { name, exact: true }) });
}

/** The ID of the open drawing, read from the URL hash. */
function openDrawingId(page: Page): string {
	return new URL(page.url()).hash.slice(1);
}

export function openApp(page: Page, hash = ""): Promise<void> {
	return test.step("open the app", async () => {
		await page.goto(hash ? `/#${hash}` : "/");
		await expect(drawingList(page)).toBeVisible();
	});
}

export function reload(page: Page): Promise<void> {
	return test.step("reload the page", async () => {
		await page.reload();
	});
}

/** Creates a drawing through the UI and returns its ID. */
export function createDrawing(page: Page, name: string): Promise<string> {
	return test.step(`create a drawing named ${name}`, async () => {
		await page.getByRole("button", { name: "New drawing" }).click();
		await page
			.getByRole("textbox", { name: "Name of the new drawing" })
			.fill(name);
		await page.keyboard.press("Enter");
		// Wait for the new drawing to open; the hash may still name the last one.
		await expect(drawingRow(page, name)).toHaveAttribute(
			"aria-current",
			"true",
		);
		return openDrawingId(page);
	});
}

/** Creates a drawing through the HTTP API and returns its ID. */
export function createDrawingThroughApi(
	request: APIRequestContext,
	name: string,
): Promise<string> {
	return test.step(`a drawing named ${name} exists`, async () => {
		const response = await request.post("/api/drawings", { data: { name } });
		expect(response.status()).toBe(201);
		const drawing: StoredDrawing = await response.json();
		return drawing.id;
	});
}

export function renameDrawing(
	page: Page,
	name: string,
	newName: string,
): Promise<void> {
	return test.step(`rename ${name} to ${newName}`, async () => {
		await drawingRow(page, name).hover();
		await drawingList(page)
			.getByRole("button", { name: `Rename ${name}` })
			.click();
		await page
			.getByRole("textbox", { name: `New name for ${name}` })
			.fill(newName);
		await page.keyboard.press("Enter");
	});
}

export function deleteDrawing(page: Page, name: string): Promise<void> {
	return test.step(`delete ${name} and confirm`, async () => {
		await drawingRow(page, name).hover();
		await drawingList(page)
			.getByRole("button", { name: `Delete ${name}` })
			.click();
		await expect(
			drawingList(page).getByText(`Delete “${name}”?`),
		).toBeVisible();
		await drawingList(page)
			.getByRole("button", { name: "Delete", exact: true })
			.click();
	});
}

export function expectListed(page: Page, name: string): Promise<void> {
	return test.step(`${name} is in the list`, async () => {
		await expect(drawingButton(page, name)).toBeVisible();
	});
}

/**
 * The list starts empty while it loads, so after a reload check that another
 * drawing is listed first, or this passes too early.
 */
export function expectNotListed(page: Page, name: string): Promise<void> {
	return test.step(`${name} is not in the list`, async () => {
		await expect(drawingList(page)).toBeVisible();
		await expect(drawingButton(page, name)).toHaveCount(0);
	});
}

/** The list marks the drawing as current and the editor shows its tools. */
export function expectOpen(page: Page, name: string): Promise<void> {
	return test.step(`${name} is open in the editor`, async () => {
		await expect(drawingRow(page, name)).toHaveAttribute(
			"aria-current",
			"true",
		);
		await expect(
			editor(page).getByRole("region", { name: "Shapes" }),
		).toBeVisible();
	});
}

function editor(page: Page) {
	return page.getByRole("main");
}

/** Draws a rectangle in the middle of the canvas. */
export function drawRectangle(page: Page): Promise<void> {
	return test.step("draw a rectangle", async () => {
		// Excalidraw hides the radio input behind its label, which carries the title.
		await page.getByTitle(/^Rectangle/).click();
		const box = await editor(page).boundingBox();
		if (!box) throw new Error("The editor is not visible.");
		const x = box.x + box.width / 2;
		const y = box.y + box.height / 2;
		await page.mouse.move(x - 100, y - 60);
		await page.mouse.down();
		await page.mouse.move(x + 100, y + 60, { steps: 5 });
		await page.mouse.up();
	});
}

/** Waits until the server has the drawing's scene with one rectangle in it. */
export function expectRectangleSaved(
	request: APIRequestContext,
	id: string,
): Promise<void> {
	return test.step("the rectangle is saved", async () => {
		await expect
			.poll(async () => {
				const response = await request.get(`/api/drawings/${id}`);
				const drawing: StoredDrawing = await response.json();
				return elementTypes(drawing.scene);
			})
			.toEqual(["rectangle"]);
	});
}

function elementTypes(scene: string | null): string[] {
	if (!scene) return [];
	const elements: SceneElement[] = JSON.parse(scene).elements;
	return elements
		.filter((element) => !element.isDeleted)
		.map((element) => element.type);
}

/**
 * The canvas shows a shape: selecting everything opens Excalidraw's panel for
 * the selected shapes, which it shows only when the scene has elements.
 * Excalidraw shows this panel only in its desktop layout; a narrow editor, such
 * as at 800x600, switches to the compact layout without it.
 */
export function expectShapeShown(page: Page): Promise<void> {
	return test.step("the rectangle is still there", async () => {
		// The panel's region has no box of its own, so look at a control inside it.
		const shapeActions = editor(page)
			.getByRole("region", { name: "Selected shape actions" })
			.getByRole("group", { name: "Stroke width" });
		await expect(
			editor(page).getByRole("region", { name: "Shapes" }),
		).toBeVisible();
		await expect(shapeActions).toHaveCount(0);
		const box = await editor(page).boundingBox();
		if (!box) throw new Error("The editor is not visible.");
		// Click an empty spot near the right edge so the canvas has the keyboard focus.
		await page.mouse.click(box.x + box.width - 40, box.y + box.height / 2);
		await page.keyboard.press("ControlOrMeta+a");
		await expect(shapeActions).toBeVisible();
	});
}
