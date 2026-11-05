import { type APIRequestContext, expect, type Page } from "@playwright/test";

// The drawings UI as a user sees it: where things are and what a user does.
// Tests group these calls into named steps with `test.step`.

/** The cards on the landing page, one per drawing after the blank sheet. */
function drawingList(page: Page) {
	return page.getByRole("list", { name: "Drawings" });
}

/** The link of a drawing's card, which opens the drawing. */
export function drawingCardLink(page: Page, name: string) {
	return drawingList(page).getByRole("link", { name, exact: true });
}

/** The cards on the landing page, the blank sheet first. Each card reads as its name. */
export function drawingCards(page: Page) {
	return drawingList(page).getByRole("listitem");
}

/** The landing page's message about the search, such as that nothing matches. */
export function searchStatus(page: Page) {
	return page.getByRole("status");
}

/** The landing page's search field. */
export function searchField(page: Page) {
	return page.getByRole("searchbox", { name: "Search drawings" });
}

/** Types a query into the landing page's search field. */
export async function searchDrawings(page: Page, query: string): Promise<void> {
	await searchField(page).fill(query);
}

/** A drawing's card. Its rename and delete actions appear while it is hovered. */
function drawingCard(page: Page, name: string) {
	return drawingList(page)
		.getByRole("listitem")
		.filter({ has: page.getByRole("link", { name, exact: true }) });
}

/** The link in the editor's bar that leads back to the landing page. */
function allDrawingsLink(page: Page) {
	return page.getByRole("link", { name: "All drawings" });
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

/** The landing page shows the cards and no editor. */
export async function expectLandingPage(page: Page): Promise<void> {
	await expect(drawingList(page)).toBeVisible();
	await expect(allDrawingsLink(page)).toHaveCount(0);
}

/**
 * The drawing's card shows its preview image, loaded from a URL that serves a
 * PNG. The image has no role, because its alt text is empty: the card's link
 * already carries the name.
 */
export async function expectCardShowsPreview(
	page: Page,
	request: APIRequestContext,
	name: string,
): Promise<void> {
	const image = drawingCard(page, name).locator("img");
	await expect(image).toBeVisible();
	await expect
		.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
		.toBeGreaterThan(0);
	const source = await image.getAttribute("src");
	const response = await request.get(source ?? "");
	expect(response.headers()["content-type"]).toBe("image/png");
}

export function errorMessage(page: Page) {
	return page.getByRole("alert");
}

/**
 * Dismisses the error message. The click fails if another element, such as the
 * editor, covers the message.
 */
export async function dismissErrorMessage(page: Page): Promise<void> {
	await errorMessage(page).getByRole("button", { name: "Dismiss" }).click();
}

/** The editor's bar names the drawing and the editor shows Excalidraw's tools. */
export async function expectDrawingOpen(
	page: Page,
	name: string,
): Promise<void> {
	await expect(
		page.getByRole("heading", { level: 1, name, exact: true }),
	).toBeVisible();
	await expect(editorTools(page)).toBeVisible();
}

/** Background colors of the editor's bar, from the app's light and dark palettes. */
const barBackground = {
	light: "rgb(255, 255, 255)",
	dark: "rgb(18, 18, 18)",
};

/**
 * The editor's bar and Excalidraw both show the given color scheme. Excalidraw
 * exposes its theme only through a class on its container and the canvas
 * pixels, so this reads the class.
 */
export async function expectColorScheme(
	page: Page,
	scheme: "light" | "dark",
): Promise<void> {
	await expect(page.getByRole("banner")).toHaveCSS(
		"background-color",
		barBackground[scheme],
	);
	const excalidraw = editor(page).locator(".excalidraw");
	if (scheme === "dark") await expect(excalidraw).toHaveClass(/theme--dark/);
	else await expect(excalidraw).not.toHaveClass(/theme--dark/);
}

/** Opens Excalidraw's main menu. Its button has no accessible name. */
export async function openEditorMenu(page: Page): Promise<void> {
	await editor(page).getByTestId("main-menu-trigger").click();
	await expect(editorMenuItem(page, "Reset the canvas")).toBeVisible();
}

/** An item in Excalidraw's main menu, such as "Dark mode". */
export function editorMenuItem(page: Page, name: string) {
	return editor(page).getByRole("button", { name, exact: true });
}

/** The ID of the open drawing, read from its URL path `/drawings/<id>`. */
function openDrawingId(page: Page): string {
	return new URL(page.url()).pathname.replace(/^\/drawings\//, "");
}

/** Opens the app: the landing page, or a drawing's path if an ID is given. */
export async function openApp(page: Page, drawingId?: string): Promise<void> {
	await page.goto(drawingId ? `/drawings/${drawingId}` : "/");
	await expect(
		drawingId ? allDrawingsLink(page) : drawingList(page),
	).toBeVisible();
}

/** Opens a drawing by clicking its card on the landing page. */
export async function openDrawingFromCard(
	page: Page,
	name: string,
): Promise<void> {
	await drawingCardLink(page, name).click();
}

/** Leaves the editor through "All drawings" and waits for the landing page. */
export async function goToAllDrawings(page: Page): Promise<void> {
	await allDrawingsLink(page).click();
	await expect(drawingList(page)).toBeVisible();
}

/** Goes back one page with the browser's back button. */
export async function goBack(page: Page): Promise<void> {
	await page.goBack();
}

/** Checks that the URL is the drawing's path, `/drawings/<id>`. */
export async function expectAtDrawingPath(
	page: Page,
	drawingId: string,
): Promise<void> {
	await expect
		.poll(() => new URL(page.url()).pathname)
		.toBe(`/drawings/${drawingId}`);
}

/**
 * Creates a drawing from the blank sheet on the landing page, waits until it is
 * open and returns its ID.
 */
export async function createDrawing(page: Page, name: string): Promise<string> {
	await drawingList(page).getByRole("button", { name: "New drawing" }).click();
	await page
		.getByRole("textbox", { name: "Name of the new drawing" })
		.fill(name);
	await page.keyboard.press("Enter");
	await expectDrawingOpen(page, name);
	return openDrawingId(page);
}

export async function renameDrawing(
	page: Page,
	name: string,
	newName: string,
): Promise<void> {
	await drawingCard(page, name).hover();
	await drawingList(page)
		.getByRole("button", { name: `Rename ${name}` })
		.click();
	await page
		.getByRole("textbox", { name: `New name for ${name}` })
		.fill(newName);
	await page.keyboard.press("Enter");
}

/** Deletes a drawing through its card and confirms the question. */
export async function deleteDrawing(page: Page, name: string): Promise<void> {
	await drawingCard(page, name).hover();
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
