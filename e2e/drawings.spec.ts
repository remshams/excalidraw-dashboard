import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
	createDrawingThroughApi,
	deleteDrawingThroughApi,
	storedPreviewType,
	storedScene,
	storedShapeTypes,
	storeSceneThroughApi,
} from "./drawings-api.ts";
import {
	clickBesideSwitcher,
	createDrawing,
	deleteDrawing,
	dismissErrorMessage,
	drawingCardLink,
	drawingCards,
	drawRectangle,
	editorLinkField,
	editorMenuItem,
	errorMessage,
	expectAtDrawingPath,
	expectCardShowsPreview,
	expectColorScheme,
	expectDrawingOpen,
	expectLandingPage,
	goBack,
	goToAllDrawings,
	openApp,
	openDrawingFromCard,
	openEditorMenu,
	pressSwitcherShortcut,
	quickSwitcher,
	rectangleTool,
	renameDrawing,
	searchDrawings,
	searchField,
	searchStatus,
	selectAllShapes,
	selectedShapeActions,
	switchDrawingButton,
	switcherRow,
	switcherRows,
	switcherSearch,
} from "./drawings-ui.ts";

// The tests share one server and database. A unique name keeps each test's
// drawings apart from the others and from earlier runs, such as "Plan 1a2b3c4d".
function uniqueName(base: string): string {
	return `${base} ${randomUUID().slice(0, 8)}`;
}

test("create a drawing", async ({ page }) => {
	const name = uniqueName("Plan");

	await test.step(`create a drawing named ${name}`, async () => {
		await openApp(page);
		await createDrawing(page, name);
	});

	await test.step(`${name} is open in the editor`, async () => {
		await expectDrawingOpen(page, name);
	});

	await test.step(`${name} has a card on the landing page`, async () => {
		await goToAllDrawings(page);
		await expect(drawingCardLink(page, name)).toBeVisible();
	});
});

test("open a drawing from its card", async ({ page, request }) => {
	const name = uniqueName("Card");
	let id = "";

	await test.step(`a drawing named ${name} exists`, async () => {
		id = await createDrawingThroughApi(request, name);
	});

	await test.step(`open ${name} from its card on the landing page`, async () => {
		await openApp(page);
		await openDrawingFromCard(page, name);
	});

	await test.step(`${name} is open in the editor, at its path`, async () => {
		await expectDrawingOpen(page, name);
		await expectAtDrawingPath(page, id);
	});

	await test.step("go back to all drawings", async () => {
		await goToAllDrawings(page);
	});

	await test.step(`the landing page shows ${name} again`, async () => {
		await expectLandingPage(page);
		await expect(drawingCardLink(page, name)).toBeVisible();
	});
});

test("a drawing survives a reload", async ({ page, request }) => {
	const name = uniqueName("Sketch");
	let id = "";

	await test.step(`draw a rectangle in a new drawing named ${name}`, async () => {
		await openApp(page);
		id = await createDrawing(page, name);
		await drawRectangle(page);
	});

	await test.step("the rectangle is saved", async () => {
		await expect
			.poll(() => storedShapeTypes(request, id))
			.toEqual(["rectangle"]);
	});

	await test.step(`${name} opens again after a reload`, async () => {
		await page.reload();
		await expectDrawingOpen(page, name);
	});

	await test.step("the rectangle is still there", async () => {
		// Excalidraw shows the panel for selected shapes only if the scene has some.
		await expect(selectedShapeActions(page)).toHaveCount(0);
		await selectAllShapes(page);
		await expect(selectedShapeActions(page)).toBeVisible();
	});
});

test("leaving a drawing stores its preview", async ({ page, request }) => {
	const name = uniqueName("Preview");
	let id = "";

	await test.step(`draw a rectangle in a new drawing named ${name}`, async () => {
		await openApp(page);
		id = await createDrawing(page, name);
		await drawRectangle(page);
		await expect
			.poll(() => storedShapeTypes(request, id))
			.toEqual(["rectangle"]);
	});

	await test.step(`${name} has no preview while it's open`, async () => {
		expect(await storedPreviewType(request, id)).toBeNull();
	});

	await test.step("go back to all drawings", async () => {
		await goToAllDrawings(page);
	});

	await test.step(`${name} has a PNG preview`, async () => {
		await expect.poll(() => storedPreviewType(request, id)).toBe("image/png");
	});

	await test.step(`${name}'s card shows the preview`, async () => {
		await expectCardShowsPreview(page, request, name);
	});
});

test("reopening a drawing right after leaving it shows its last edits", async ({
	page,
	request,
}) => {
	const name = uniqueName("Return");
	let id = "";

	await test.step(`draw a rectangle in a new drawing named ${name}`, async () => {
		await openApp(page);
		id = await createDrawing(page, name);
		await drawRectangle(page);
	});

	await test.step("go back to all drawings, which saves the rectangle", async () => {
		await goToAllDrawings(page);
		await expect
			.poll(() => storedShapeTypes(request, id))
			.toEqual(["rectangle"]);
	});

	await test.step(`open ${name} again from its card`, async () => {
		await openDrawingFromCard(page, name);
		await expectDrawingOpen(page, name);
	});

	await test.step("the rectangle is there, and stays stored", async () => {
		// Excalidraw shows the panel for selected shapes only if the scene has some.
		await selectAllShapes(page);
		await expect(selectedShapeActions(page)).toBeVisible();
		await expect
			.poll(() => storedShapeTypes(request, id))
			.toEqual(["rectangle"]);
	});
});

test("opening a drawing without a preview stores one", async ({
	context,
	page,
	request,
}) => {
	const source = uniqueName("Source");
	const name = uniqueName("Copy");
	let scene = "";
	let id = "";

	await test.step(`draw a rectangle in a new drawing named ${source}`, async () => {
		await openApp(page);
		const sourceId = await createDrawing(page, source);
		await drawRectangle(page);
		await expect
			.poll(() => storedShapeTypes(request, sourceId))
			.toEqual(["rectangle"]);
		scene = (await storedScene(request, sourceId)) ?? "";
	});

	await test.step(`store the scene in a new drawing named ${name} through the API`, async () => {
		id = await createDrawingThroughApi(request, name);
		await storeSceneThroughApi(request, id, scene);
		expect(await storedPreviewType(request, id)).toBeNull();
	});

	const tab = await context.newPage();

	await test.step(`open ${name} in a new tab`, async () => {
		await openApp(tab, id);
		await expectDrawingOpen(tab, name);
	});

	await test.step(`${name} has a PNG preview while it's still open`, async () => {
		await expect.poll(() => storedPreviewType(request, id)).toBe("image/png");
		await expectDrawingOpen(tab, name);
	});
});

test("rename a drawing", async ({ page }) => {
	const name = uniqueName("Draft");
	const newName = uniqueName("Final");

	await test.step(`rename a new drawing from ${name} to ${newName}`, async () => {
		await openApp(page);
		await createDrawing(page, name);
		await goToAllDrawings(page);
		await renameDrawing(page, name, newName);
	});

	await test.step(`the landing page shows ${newName} instead of ${name}`, async () => {
		await expect(drawingCardLink(page, newName)).toBeVisible();
		await expect(drawingCardLink(page, name)).toHaveCount(0);
	});

	await test.step(`${newName} keeps its name after a reload`, async () => {
		await page.reload();
		// The list is empty until it loads; the new name shows that it has.
		await expect(drawingCardLink(page, newName)).toBeVisible();
		await expect(drawingCardLink(page, name)).toHaveCount(0);
	});
});

test("delete a drawing", async ({ page }) => {
	const kept = uniqueName("Keeper");
	const name = uniqueName("Scratch");

	await test.step(`create drawings named ${kept} and ${name}`, async () => {
		await openApp(page);
		await createDrawing(page, kept);
		await goToAllDrawings(page);
		await createDrawing(page, name);
	});

	await test.step(`go back and delete ${name} right after drawing in it`, async () => {
		// Within the one second save delay, so leaving the editor saves the edit.
		await drawRectangle(page);
		await goToAllDrawings(page);
		await deleteDrawing(page, name);
	});

	await test.step(`${name} is gone and no error is shown`, async () => {
		await expect(drawingCardLink(page, name)).toHaveCount(0);
		await expectLandingPage(page);
		await expect(errorMessage(page)).toHaveCount(0);
	});

	await test.step(`${name} is still gone after a reload`, async () => {
		await page.reload();
		// The list is empty until it loads; the kept drawing shows that it has.
		await expect(drawingCardLink(page, kept)).toBeVisible();
		await expect(drawingCardLink(page, name)).toHaveCount(0);
	});
});

test("search the drawings by name", async ({ page, request }) => {
	// Both names share the unique tag, and only this test's drawings contain it,
	// so the search finds nothing else.
	const pond = uniqueName("Pond");
	const tag = pond.slice("Pond ".length);
	const patio = `Patio ${tag}`;

	await test.step(`drawings named ${pond} and ${patio} exist`, async () => {
		await createDrawingThroughApi(request, pond);
		await createDrawingThroughApi(request, patio);
		await openApp(page);
	});

	await test.step(`searching for "pond ${tag}" shows only ${pond} and the blank sheet`, async () => {
		await searchDrawings(page, `pond ${tag}`);
		await expect(drawingCards(page)).toHaveText(["New drawing", pond]);
		await expect(searchStatus(page)).toBeEmpty();
	});

	await test.step("searching for an unknown name says no drawing has it", async () => {
		await searchDrawings(page, `Pool ${tag}`);
		await expect(drawingCards(page)).toHaveText(["New drawing"]);
		await expect(searchStatus(page)).toHaveText(
			`No drawing is named “Pool ${tag}”.`,
		);
	});

	await test.step(`open ${pond} from the search and go back to all drawings`, async () => {
		await searchDrawings(page, pond);
		await openDrawingFromCard(page, pond);
		await expectDrawingOpen(page, pond);
		await goToAllDrawings(page);
	});

	await test.step("the search is empty and the landing page shows every drawing again", async () => {
		await expect(searchField(page)).toHaveValue("");
		await expect(drawingCardLink(page, pond)).toBeVisible();
		await expect(drawingCardLink(page, patio)).toBeVisible();
	});
});

test("open a drawing from the URL", async ({ page, request }) => {
	const name = uniqueName("Linked");
	let id = "";

	await test.step(`a drawing named ${name} exists`, async () => {
		id = await createDrawingThroughApi(request, name);
	});

	await test.step("open the app with the drawing's ID in the URL", async () => {
		await openApp(page, id);
	});

	await test.step(`${name} is open in the editor`, async () => {
		await expectDrawingOpen(page, name);
	});
});

test("the back button retraces the drawings and the landing page", async ({
	page,
	request,
}) => {
	const first = uniqueName("First");
	const second = uniqueName("Second");
	let firstId = "";

	await test.step(`drawings named ${first} and ${second} exist`, async () => {
		firstId = await createDrawingThroughApi(request, first);
		await createDrawingThroughApi(request, second);
	});

	await test.step(`open ${first}, then ${second} through the landing page`, async () => {
		await openApp(page, firstId);
		await expectDrawingOpen(page, first);
		await goToAllDrawings(page);
		await openDrawingFromCard(page, second);
		await expectDrawingOpen(page, second);
	});

	await test.step("go back in the browser", async () => {
		await goBack(page);
	});

	await test.step("the landing page shows again", async () => {
		await expectLandingPage(page);
	});

	await test.step("go back in the browser once more", async () => {
		await goBack(page);
	});

	await test.step(`${first} is open again, at its path`, async () => {
		await expectDrawingOpen(page, first);
		await expectAtDrawingPath(page, firstId);
	});
});

test("follow the system's dark mode", async ({ page, request }) => {
	const name = uniqueName("Night");
	let id = "";

	await test.step(`a drawing named ${name} exists`, async () => {
		id = await createDrawingThroughApi(request, name);
	});

	await test.step(`open ${name} while the system is in dark mode`, async () => {
		await page.emulateMedia({ colorScheme: "dark" });
		await openApp(page, id);
		await expectDrawingOpen(page, name);
	});

	await test.step("the editor's bar and the editor are dark", async () => {
		await expectColorScheme(page, "dark");
	});

	await test.step("the editor's menu has no theme switch", async () => {
		await openEditorMenu(page);
		await expect(editorMenuItem(page, "Light mode")).toHaveCount(0);
		await expect(editorMenuItem(page, "Dark mode")).toHaveCount(0);
	});

	await test.step("switch the system to light mode", async () => {
		await page.emulateMedia({ colorScheme: "light" });
	});

	await test.step("the editor's bar and the editor turn light", async () => {
		await expectColorScheme(page, "light");
	});
});

test("a failed save shows an error above the editor", async ({
	page,
	request,
}) => {
	const name = uniqueName("Orphan");
	let id = "";

	await test.step(`open a drawing named ${name}`, async () => {
		id = await createDrawingThroughApi(request, name);
		await openApp(page, id);
		await expectDrawingOpen(page, name);
	});

	await test.step(`another tab deletes ${name}`, async () => {
		await deleteDrawingThroughApi(request, id);
	});

	await test.step("draw a rectangle, which can't be saved", async () => {
		await drawRectangle(page);
	});

	await test.step("the app says the save failed", async () => {
		await expect(errorMessage(page)).toContainText("failed with 404");
	});

	await test.step("dismiss the message", async () => {
		await dismissErrorMessage(page);
		await expect(errorMessage(page)).toHaveCount(0);
	});
});

test("switching drawings with the quick switcher keeps the last edit", async ({
	page,
	request,
}) => {
	const first = uniqueName("Switch first");
	const second = uniqueName("Switch second");
	const secondId = await createDrawingThroughApi(request, second);
	let firstId = "";

	await test.step(`create ${first} and draw in it`, async () => {
		await openApp(page);
		firstId = await createDrawing(page, first);
		await drawRectangle(page);
	});

	await test.step(`switch to ${second} right away with the shortcut`, async () => {
		await pressSwitcherShortcut(page);
		await page.keyboard.type(second);
		await expect(switcherRows(page)).toHaveCount(1);
		await page.keyboard.press("Enter");
	});

	await test.step(`${second} is open and the switcher is closed`, async () => {
		await expectDrawingOpen(page, second);
		await expectAtDrawingPath(page, secondId);
		await expect(quickSwitcher(page)).toHaveCount(0);
	});

	await test.step(`${first} kept the rectangle and shows it on its card`, async () => {
		await expect
			.poll(() => storedShapeTypes(request, firstId))
			.toEqual(["rectangle"]);
		await goToAllDrawings(page);
		await expectCardShowsPreview(page, request, first);
	});

	await test.step(`the switcher marks ${second} as open`, async () => {
		await openDrawingFromCard(page, second);
		await expectDrawingOpen(page, second);
		await switchDrawingButton(page).click();
		await expect(switcherRow(page, second)).toContainText("Open");
		await expect(switcherRow(page, first)).not.toContainText("Open");
	});

	await test.step(`clicking ${first} opens it`, async () => {
		await switcherRow(page, first).click();
		await expectDrawingOpen(page, first);
		await expectAtDrawingPath(page, firstId);
	});
});

test("the quick switcher creates a drawing from the typed name", async ({
	page,
}) => {
	const name = uniqueName("Switch new");

	await test.step("open a drawing and the switcher", async () => {
		await openApp(page);
		await createDrawing(page, uniqueName("Switch start"));
		await switchDrawingButton(page).click();
	});

	await test.step(`choose the create row for ${name}`, async () => {
		await switcherSearch(page).fill(`  ${name}  `);
		await switcherRow(page, `Create “${name}”`).click();
	});

	await test.step(`${name} is open, and has a card on the landing page`, async () => {
		await expectDrawingOpen(page, name);
		await goToAllDrawings(page);
		await expect(drawingCardLink(page, name)).toBeVisible();
	});
});

test("the quick switcher closes and keeps keys from Excalidraw", async ({
	page,
}) => {
	await test.step("open a drawing with a selected shape", async () => {
		await openApp(page);
		await createDrawing(page, uniqueName("Switch keys"));
		await drawRectangle(page);
		await selectAllShapes(page);
	});

	await test.step("the shortcut opens the switcher instead of Excalidraw's link field", async () => {
		await pressSwitcherShortcut(page);
		await expect(quickSwitcher(page)).toBeVisible();
		await expect(switcherSearch(page)).toBeFocused();
		await expect(editorLinkField(page)).toHaveCount(0);
	});

	await test.step("the shortcut closes the switcher again", async () => {
		await pressSwitcherShortcut(page);
		await expect(quickSwitcher(page)).toHaveCount(0);
	});

	await test.step("a key typed in the switcher doesn't pick Excalidraw's tool", async () => {
		await pressSwitcherShortcut(page);
		await page.keyboard.press("r");
		await expect(switcherSearch(page)).toHaveValue("r");
		await expect(rectangleTool(page)).not.toBeChecked();
	});

	await test.step("Tab keeps the focus in the search field", async () => {
		await page.keyboard.press("Tab");
		await expect(switcherSearch(page)).toBeFocused();
	});

	await test.step("Escape closes the switcher and gives the button its focus back", async () => {
		await page.keyboard.press("Escape");
		await switchDrawingButton(page).click();
		await page.keyboard.press("Escape");
		await expect(quickSwitcher(page)).toHaveCount(0);
		await expect(switchDrawingButton(page)).toBeFocused();
	});

	await test.step("a click outside closes the switcher and gives the button its focus back", async () => {
		await switchDrawingButton(page).click();
		await clickBesideSwitcher(page);
		await expect(quickSwitcher(page)).toHaveCount(0);
		await expect(switchDrawingButton(page)).toBeFocused();
	});

	await test.step("on the landing page the shortcut opens nothing", async () => {
		await goToAllDrawings(page);
		await pressSwitcherShortcut(page);
		await expect(quickSwitcher(page)).toHaveCount(0);
	});
});
