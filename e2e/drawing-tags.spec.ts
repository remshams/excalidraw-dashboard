import { expect, test } from "@playwright/test";
import {
	assignTagsThroughApi,
	createDrawingThroughApi,
	storedSummary,
} from "./drawings-api.ts";
import {
	changeTagsButton,
	drawingCardLink,
	drawingTagsDialog,
	findTagToAddField,
	hiddenTagCount,
	openDrawingTags,
	taggedCardLink,
	tagOnDrawing,
	tagToAdd,
} from "./drawings-ui.ts";
import { createTagThroughApi, storedTagByLabel } from "./tags-api.ts";
import { uniqueName } from "./unique-name.ts";

test("tag a drawing from its card and see the tag after a reload", async ({
	page,
	request,
}) => {
	const name = uniqueName("Plan");
	const work = uniqueName("Work");
	const home = uniqueName("Home");
	let drawingId = "";
	let workId = "";

	await test.step(`${name} has no tags, and ${work} and ${home} exist`, async () => {
		drawingId = await createDrawingThroughApi(request, name);
		workId = await createTagThroughApi(request, work, "blue");
		await createTagThroughApi(request, home, "green");
		await page.goto("/");
	});

	await test.step(`add ${work} and ${home} from the card`, async () => {
		await openDrawingTags(page, name);
		await tagToAdd(page, name, work).click();
		await tagToAdd(page, name, home).click();
		await expect(tagOnDrawing(page, name, work)).toBeVisible();
		await expect(tagOnDrawing(page, name, home)).toBeVisible();
	});

	await test.step(`take ${home} off again and close the dialog`, async () => {
		await tagOnDrawing(page, name, home).click();
		await expect(tagToAdd(page, name, home)).toBeVisible();
		await drawingTagsDialog(page, name)
			.getByRole("button", { name: "Done" })
			.click();
		await expect(drawingTagsDialog(page, name)).toBeHidden();
	});

	await test.step(`the card shows ${work}, also after a reload`, async () => {
		await expect(taggedCardLink(page, name, [work])).toBeVisible();
		await page.reload();
		await expect(taggedCardLink(page, name, [work])).toBeVisible();
	});

	await test.step(`the server stores ${work} only`, async () => {
		const summary = await storedSummary(request, drawingId);
		expect(summary?.tagIds).toEqual([workId]);
	});
});

test("change a drawing's tags by keyboard alone", async ({ page, request }) => {
	const name = uniqueName("Plan");
	const work = uniqueName("Work");
	const garden = uniqueName("Garden");
	let drawingId = "";

	await test.step(`${name} has no tags, and ${work} exists`, async () => {
		drawingId = await createDrawingThroughApi(request, name);
		await createTagThroughApi(request, work);
		await page.goto("/");
	});

	await test.step("Tab from the card reaches Change tags, and Enter opens the dialog", async () => {
		await drawingCardLink(page, name).focus();
		await page.keyboard.press("Tab");
		await expect(changeTagsButton(page, name)).toBeFocused();
		await page.keyboard.press("Enter");
		await expect(findTagToAddField(page, name)).toBeFocused();
	});

	await test.step(`typing ${work} and Enter adds it`, async () => {
		await page.keyboard.type(work);
		await page.keyboard.press("Enter");
		await expect(tagOnDrawing(page, name, work)).toBeVisible();
		await expect(findTagToAddField(page, name)).toHaveValue("");
	});

	await test.step(`Enter on ${garden}, which no tag has, opens the form, and Enter creates it`, async () => {
		await page.keyboard.type(garden);
		await page.keyboard.press("Enter");
		const label = drawingTagsDialog(page, name).getByRole("textbox", {
			name: "Label",
		});
		await expect(label).toBeFocused();
		await expect(label).toHaveValue(garden);
		await page.keyboard.press("Enter");
		await expect(tagOnDrawing(page, name, garden)).toBeVisible();
		await expect(findTagToAddField(page, name)).toBeFocused();
	});

	await test.step("Escape closes the dialog and returns to the card", async () => {
		await page.keyboard.press("Escape");
		await expect(drawingTagsDialog(page, name)).toBeHidden();
		await expect(changeTagsButton(page, name)).toBeFocused();
		await expect(
			taggedCardLink(page, name, [garden, work].sort()),
		).toBeVisible();
	});

	await test.step("the server stores both tags on the drawing", async () => {
		const gardenTag = await storedTagByLabel(request, garden);
		const summary = await storedSummary(request, drawingId);
		expect(summary?.tagIds).toHaveLength(2);
		expect(summary?.tagIds).toContain(gardenTag?.id);
	});
});

test("a card shows its first three tags and counts the rest", async ({
	page,
	request,
}) => {
	const name = uniqueName("Plan");
	const labels = ["A", "B", "C", "D"].map((letter) =>
		uniqueName(`Tag ${letter}`),
	);

	await test.step(`${name} has four tags`, async () => {
		const drawingId = await createDrawingThroughApi(request, name);
		const ids = [];
		for (const label of labels) {
			ids.push(await createTagThroughApi(request, label));
		}
		await assignTagsThroughApi(request, drawingId, ids);
		await page.goto("/");
	});

	await test.step("the card names all four and shows +1 for the fourth", async () => {
		await expect(taggedCardLink(page, name, labels)).toBeVisible();
		await expect(hiddenTagCount(page, name, 1)).toBeVisible();
	});
});
