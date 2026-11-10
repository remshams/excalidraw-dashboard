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
	// The preview loads lazily, so far down a long list it stays empty until the
	// user scrolls to it.
	await image.scrollIntoViewIfNeeded();
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

/**
 * The link of a tagged drawing's card. Its accessible name lists every tag, by
 * label, after the drawing's name.
 */
export function taggedCardLink(page: Page, name: string, labels: string[]) {
	return drawingCardLink(page, `${name}, tags: ${labels.join(", ")}`);
}

/** The "+2" on a card that has more tags than it shows. */
export function hiddenTagCount(page: Page, name: string, count: number) {
	return drawingList(page)
		.getByRole("listitem")
		.filter({ has: page.getByRole("link", { name: `${name}, tags:` }) })
		.getByText(`+${count}`, { exact: true });
}

/** The card's action that opens the dialog for the drawing's tags. */
export function changeTagsButton(page: Page, name: string) {
	return drawingList(page).getByRole("button", {
		name: `Change tags of ${name}`,
		exact: true,
	});
}

/** Opens the dialog for the drawing's tags from its card. */
export async function openDrawingTags(page: Page, name: string): Promise<void> {
	await changeTagsButton(page, name).click();
	await expect(drawingTagsDialog(page, name)).toBeVisible();
}

/** The open dialog for the drawing's tags. */
export function drawingTagsDialog(page: Page, name: string) {
	return page.getByRole("dialog", { name: `Tags of ${name}` });
}

/** The dialog's field that finds a tag to add by its label. */
export function findTagToAddField(page: Page, name: string) {
	return drawingTagsDialog(page, name).getByRole("searchbox", {
		name: "Find a tag to add",
	});
}

/** A tag the drawing has, as the button in the dialog that takes it off. */
export function tagOnDrawing(page: Page, name: string, label: string) {
	return drawingTagsDialog(page, name)
		.getByRole("group", { name: "Tags it has" })
		.getByRole("button", { name: `Remove ${label}`, exact: true });
}

/** A tag the drawing doesn't have, as the button in the dialog that adds it. */
export function tagToAdd(page: Page, name: string, label: string) {
	return drawingTagsDialog(page, name)
		.getByRole("group", { name: "Tags to add" })
		.getByRole("button", { name: `Add ${label}`, exact: true });
}

/** The button in the editor's bar that opens the quick switcher. */
export function switchDrawingButton(page: Page) {
	return page.getByRole("button", { name: "Switch drawing" });
}

/** The quick switcher, while it is open. */
export function quickSwitcher(page: Page) {
	return page.getByRole("dialog", { name: "Switch drawing" });
}

/** A row of the quick switcher that contains the text, such as a drawing's name. */
export function switcherRow(page: Page, text: string) {
	return quickSwitcher(page).getByRole("option", { name: text });
}

/** The rows of the quick switcher, from the top. */
export function switcherRows(page: Page) {
	return quickSwitcher(page).getByRole("option");
}

/** The field of the quick switcher that takes the focus when it opens. */
export function switcherSearch(page: Page) {
	return quickSwitcher(page).getByRole("combobox", {
		name: "Find or create a drawing",
	});
}

/** Opens or closes the quick switcher with Ctrl+K (⌘K on a Mac). */
export async function pressSwitcherShortcut(page: Page): Promise<void> {
	await page.keyboard.press("ControlOrMeta+k");
}

/** Presses the mouse on the page beside the open quick switcher. */
export async function clickBesideSwitcher(page: Page): Promise<void> {
	await page.mouse.click(5, 300);
}

/** Presses the mouse on the top edge of the open quick switcher. */
export async function clickSwitcherEdge(page: Page): Promise<void> {
	const box = await quickSwitcher(page).boundingBox();
	if (!box) throw new Error("The quick switcher is not open");
	await page.mouse.click(box.x + box.width / 2, box.y + 0.5);
}

/** Excalidraw's field for a link, which its own Ctrl+K opens on a selected shape. */
export function editorLinkField(page: Page) {
	return editor(page).getByPlaceholder("Type or paste your link here");
}

/** Excalidraw's rectangle tool, whose shortcut is the key R. */
export function rectangleTool(page: Page) {
	return page.getByRole("radio", { name: "Rectangle" });
}

async function editorBox(page: Page) {
	const box = await editor(page).boundingBox();
	if (!box) throw new Error("The editor is not visible.");
	return box;
}

/** Draws a rectangle in the middle of the canvas. */
export async function drawRectangle(page: Page): Promise<void> {
	// Excalidraw hides the radio input behind its label, so click the label.
	await rectangleTool(page).locator("xpath=..").click();
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

/** A tag on a drawing's card, as the button that puts it in the filter or takes it out. */
export function cardTagToggle(page: Page, name: string, label: string) {
	return drawingList(page)
		.getByRole("toolbar", { name: `Tags of ${name}`, exact: true })
		.getByRole("button", { name: `Filter by ${label}`, exact: true });
}

/** The "Filter by" row under the header, with the tags filtered by most recently. */
export function filterRow(page: Page) {
	return page.getByRole("toolbar", { name: "Filter by", exact: true });
}

/** A tag in the "Filter by" row. */
export function filterRowTag(page: Page, label: string) {
	return filterRow(page).getByRole("button", {
		name: `Filter by ${label}`,
		exact: true,
	});
}

/** The button at the end of the "Filter by" row that empties the filter. */
export function clearFilterInRow(page: Page) {
	return filterRow(page)
		.locator("xpath=..")
		.getByRole("button", { name: "Clear filter", exact: true });
}
