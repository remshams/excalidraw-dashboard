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
	createDrawing,
	deleteDrawing,
	dismissErrorMessage,
	drawingButton,
	drawRectangle,
	editorMenuItem,
	errorMessage,
	expectAtDrawingPath,
	expectColorScheme,
	expectDrawingOpen,
	goBack,
	noDrawingOpenHint,
	openApp,
	openDrawingFromList,
	openEditorMenu,
	openOldLink,
	renameDrawing,
	selectAllShapes,
	selectedShapeActions,
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

	await test.step(`${name} is in the list and open in the editor`, async () => {
		await expect(drawingButton(page, name)).toBeVisible();
		await expectDrawingOpen(page, name);
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
	const other = uniqueName("Elsewhere");
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

	await test.step(`switch to a new drawing named ${other}`, async () => {
		await createDrawing(page, other);
		await expectDrawingOpen(page, other);
	});

	await test.step(`${name} has a PNG preview`, async () => {
		await expect.poll(() => storedPreviewType(request, id)).toBe("image/png");
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
		await renameDrawing(page, name, newName);
	});

	await test.step(`the list shows ${newName} instead of ${name}`, async () => {
		await expect(drawingButton(page, newName)).toBeVisible();
		await expect(drawingButton(page, name)).toHaveCount(0);
	});

	await test.step(`${newName} keeps its name after a reload`, async () => {
		await page.reload();
		// The list is empty until it loads; the new name shows that it has.
		await expect(drawingButton(page, newName)).toBeVisible();
		await expect(drawingButton(page, name)).toHaveCount(0);
	});
});

test("delete a drawing", async ({ page }) => {
	const kept = uniqueName("Keeper");
	const name = uniqueName("Scratch");

	await test.step(`create drawings named ${kept} and ${name}`, async () => {
		await openApp(page);
		await createDrawing(page, kept);
		await createDrawing(page, name);
	});

	await test.step(`delete ${name} right after drawing in it`, async () => {
		// Within the one second save delay, so closing the editor saves the edit.
		await drawRectangle(page);
		await deleteDrawing(page, name);
	});

	await test.step(`${name} is gone and no error is shown`, async () => {
		await expect(drawingButton(page, name)).toHaveCount(0);
		await expect(noDrawingOpenHint(page)).toBeVisible();
		// Closing the editor sent its last save, which fails. Nothing waits for that
		// response; locally it arrives before this check.
		await expect(errorMessage(page)).toHaveCount(0);
	});

	await test.step(`${name} is still gone after a reload`, async () => {
		await page.reload();
		// The list is empty until it loads; the kept drawing shows that it has.
		await expect(drawingButton(page, kept)).toBeVisible();
		await expect(drawingButton(page, name)).toHaveCount(0);
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

test("an old link with the drawing in the hash still opens it", async ({
	page,
	request,
}) => {
	const name = uniqueName("Bookmark");
	let id = "";

	await test.step(`a drawing named ${name} exists`, async () => {
		id = await createDrawingThroughApi(request, name);
	});

	await test.step("open a link with the drawing's ID in the hash", async () => {
		await openOldLink(page, id);
	});

	await test.step(`${name} is open, at its path`, async () => {
		await expectDrawingOpen(page, name);
		await expectAtDrawingPath(page, id);
	});
});

test("the back button returns to the previous drawing", async ({
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

	await test.step(`open ${first}, then ${second} from the list`, async () => {
		await openApp(page, firstId);
		await expectDrawingOpen(page, first);
		await openDrawingFromList(page, second);
		await expectDrawingOpen(page, second);
	});

	await test.step("go back in the browser", async () => {
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

	await test.step("the drawing list and the editor are dark", async () => {
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

	await test.step("the drawing list and the editor turn light", async () => {
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
