import { expect, type Page } from "@playwright/test";

// The drawings UI as a user sees it: where things are and what a user does.
// Tests group these calls into named steps with `test.step`.

function drawingList(page: Page) {
	return page.getByRole("navigation", { name: "Drawings" });
}

/** The button that opens a drawing in the list. */
export function drawingButton(page: Page, name: string) {
	return drawingList(page).getByRole("button", { name, exact: true });
}

/** A drawing's row. Its rename and delete actions appear while it is hovered. */
function drawingRow(page: Page, name: string) {
	return drawingList(page)
		.getByRole("listitem")
		.filter({ has: page.getByRole("button", { name, exact: true }) });
}

function editor(page: Page) {
	return page.getByRole("main");
}

/** Excalidraw's toolbar, which shows once the editor has opened a drawing. */
function editorTools(page: Page) {
	return editor(page).getByRole("region", { name: "Shapes" });
}

/**
 * Excalidraw's panel for the selected shapes. Its region has no box of its own,
 * so this points at a control inside it. Excalidraw shows the panel only in its
 * desktop layout; a narrow editor, such as at 800x600, has no such panel.
 */
export function selectedShapeActions(page: Page) {
	return editor(page)
		.getByRole("region", { name: "Selected shape actions" })
		.getByRole("group", { name: "Stroke width" });
}

/** The hint the app shows while no drawing is open. */
export function noDrawingOpenHint(page: Page) {
	return page.getByText("Open a drawing from the list or start a new one.");
}

export function errorMessage(page: Page) {
	return page.getByRole("alert");
}

/** The list marks the drawing as open and the editor shows Excalidraw's tools. */
export async function expectDrawingOpen(
	page: Page,
	name: string,
): Promise<void> {
	await expect(drawingRow(page, name)).toHaveAttribute("aria-current", "true");
	await expect(editorTools(page)).toBeVisible();
}

/** The ID of the open drawing, read from the URL hash. */
function openDrawingId(page: Page): string {
	return new URL(page.url()).hash.slice(1);
}

/** Opens the app, with a drawing ID in the URL hash if given. */
export async function openApp(page: Page, drawingId?: string): Promise<void> {
	await page.goto(drawingId ? `/#${drawingId}` : "/");
	await expect(drawingList(page)).toBeVisible();
}

/** Creates a drawing through the list, waits until it is open and returns its ID. */
export async function createDrawing(page: Page, name: string): Promise<string> {
	await page.getByRole("button", { name: "New drawing" }).click();
	await page
		.getByRole("textbox", { name: "Name of the new drawing" })
		.fill(name);
	await page.keyboard.press("Enter");
	// The hash names the previous drawing until the new one opens.
	await expect(drawingRow(page, name)).toHaveAttribute("aria-current", "true");
	return openDrawingId(page);
}

export async function renameDrawing(
	page: Page,
	name: string,
	newName: string,
): Promise<void> {
	await drawingRow(page, name).hover();
	await drawingList(page)
		.getByRole("button", { name: `Rename ${name}` })
		.click();
	await page
		.getByRole("textbox", { name: `New name for ${name}` })
		.fill(newName);
	await page.keyboard.press("Enter");
}

/** Deletes a drawing through its row and confirms the question. */
export async function deleteDrawing(page: Page, name: string): Promise<void> {
	await drawingRow(page, name).hover();
	await drawingList(page)
		.getByRole("button", { name: `Delete ${name}` })
		.click();
	await expect(drawingList(page).getByText(`Delete “${name}”?`)).toBeVisible();
	await drawingList(page)
		.getByRole("button", { name: "Delete", exact: true })
		.click();
}

async function editorBox(page: Page) {
	const box = await editor(page).boundingBox();
	if (!box) throw new Error("The editor is not visible.");
	return box;
}

/** Draws a rectangle in the middle of the canvas. */
export async function drawRectangle(page: Page): Promise<void> {
	// Excalidraw hides the radio input behind its label, so click the label.
	await page
		.getByRole("radio", { name: "Rectangle" })
		.locator("xpath=..")
		.click();
	const box = await editorBox(page);
	const x = box.x + box.width / 2;
	const y = box.y + box.height / 2;
	await page.mouse.move(x - 100, y - 60);
	await page.mouse.down();
	await page.mouse.move(x + 100, y + 60, { steps: 5 });
	await page.mouse.up();
}

/** Selects every shape on the canvas with Ctrl+A (⌘A on a Mac). */
export async function selectAllShapes(page: Page): Promise<void> {
	const box = await editorBox(page);
	// Click an empty spot near the right edge so the canvas has the keyboard focus.
	await page.mouse.click(box.x + box.width - 40, box.y + box.height / 2);
	await page.keyboard.press("ControlOrMeta+a");
}
