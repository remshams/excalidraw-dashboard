import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createDrawingThroughApi, storedShapeTypes } from "./drawings-api.ts";
import {
	createDrawing,
	deleteDrawing,
	drawingButton,
	drawRectangle,
	errorMessage,
	expectDrawingOpen,
	noDrawingOpenHint,
	openApp,
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
