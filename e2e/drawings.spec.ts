import { test } from "@playwright/test";
import {
	createDrawing,
	createDrawingThroughApi,
	deleteDrawing,
	drawRectangle,
	expectEditorClosed,
	expectListed,
	expectNoError,
	expectNotListed,
	expectOpen,
	expectRectangleSaved,
	expectShapeShown,
	openApp,
	reload,
	renameDrawing,
	uniqueName,
} from "./steps.ts";

test("create a drawing", async ({ page }) => {
	const name = uniqueName("Plan");

	await openApp(page);
	await createDrawing(page, name);
	await expectListed(page, name);
	await expectOpen(page, name);
});

test("a drawing survives a reload", async ({ page, request }) => {
	const name = uniqueName("Sketch");

	await openApp(page);
	const id = await createDrawing(page, name);
	await drawRectangle(page);
	await expectRectangleSaved(request, id);
	await reload(page);
	await expectOpen(page, name);
	await expectShapeShown(page);
});

test("rename a drawing", async ({ page }) => {
	const name = uniqueName("Draft");
	const newName = uniqueName("Final");

	await openApp(page);
	await createDrawing(page, name);
	await renameDrawing(page, name, newName);
	await expectListed(page, newName);
	await expectNotListed(page, name);
	await reload(page);
	await expectListed(page, newName);
	await expectNotListed(page, name);
});

test("delete a drawing", async ({ page }) => {
	const kept = uniqueName("Keeper");
	const name = uniqueName("Scratch");

	await openApp(page);
	await createDrawing(page, kept);
	await createDrawing(page, name);
	await deleteDrawing(page, name);
	await expectNotListed(page, name);
	await expectEditorClosed(page);
	await expectNoError(page);
	await reload(page);
	// The list is empty until it loads; the kept drawing shows that it has.
	await expectListed(page, kept);
	await expectNotListed(page, name);
});

test("open a drawing from the URL", async ({ page, request }) => {
	const name = uniqueName("Linked");

	const id = await createDrawingThroughApi(request, name);
	await openApp(page, id);
	await expectOpen(page, name);
});
