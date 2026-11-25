import { expect, test } from "@playwright/test";
import {
	createScratchpadThroughApi,
	storedName,
	storedScratchpadCount,
	storedShapeTypes,
} from "./drawings-api.ts";
import {
	discardAllScratchpads,
	discardButton,
	discardOpenScratchpad,
	discardScratchpadFromCard,
	drawingCardLink,
	drawRectangle,
	expectDrawingOpen,
	expectLandingPage,
	expectScratchpadOpen,
	goToAllDrawings,
	openApp,
	saveAsDrawingButton,
	saveOpenScratchpad,
	saveScratchpadFromCard,
	scratchpadCard,
	scratchpadsRow,
	selectAllShapes,
	selectedShapeActions,
	startScratchpad,
	storedScratchpadId,
} from "./drawings-ui.ts";
import { uniqueName } from "./unique-name.ts";

test("draw in a new scratchpad and save it as a drawing", async ({
	page,
	request,
}) => {
	const name = uniqueName("Idea");
	let id = "";

	await test.step("start a new drawing, which opens a scratchpad without asking for a name", async () => {
		await openApp(page);
		await startScratchpad(page);
		await expect(page).toHaveURL(/\/drawings\/new$/);
		await expect(saveAsDrawingButton(page)).toHaveCount(0);
	});

	await test.step("draw a rectangle, which stores the scratchpad without a name", async () => {
		await drawRectangle(page);
		id = await storedScratchpadId(page);
		await expect
			.poll(() => storedShapeTypes(request, id))
			.toEqual(["rectangle"]);
		expect(await storedName(request, id)).toBeNull();
	});

	await test.step(`save it as ${name}`, async () => {
		await saveOpenScratchpad(page, name);
		await expectDrawingOpen(page, name);
		await expect(discardButton(page)).toHaveCount(0);
		await expect.poll(() => storedName(request, id)).toBe(name);
	});

	await test.step(`${name} is a drawing on the landing page, not a scratchpad`, async () => {
		await goToAllDrawings(page);
		await expect(drawingCardLink(page, name)).toBeVisible();
		await expect(scratchpadCard(page, id)).toHaveCount(0);
	});
});

test("discard a scratchpad from the editor", async ({ page, request }) => {
	let id = "";

	await test.step("draw a rectangle in a new scratchpad", async () => {
		await openApp(page);
		await startScratchpad(page);
		await drawRectangle(page);
		id = await storedScratchpadId(page);
	});

	await test.step("discard it", async () => {
		await discardOpenScratchpad(page);
	});

	await test.step("the landing page shows, and the server no longer has it", async () => {
		await expectLandingPage(page);
		await expect(scratchpadCard(page, id)).toHaveCount(0);
		await expect.poll(() => storedName(request, id)).toBeUndefined();
	});
});

test("a scratchpad left without a decision stays in the Scratchpads row", async ({
	page,
	request,
}) => {
	let id = "";

	await test.step("draw a rectangle in a new scratchpad and go back to all drawings", async () => {
		await openApp(page);
		await startScratchpad(page);
		await drawRectangle(page);
		id = await storedScratchpadId(page);
		await goToAllDrawings(page);
	});

	await test.step("its card is in the Scratchpads row, also after a reload", async () => {
		await expect(scratchpadCard(page, id)).toBeVisible();
		await page.reload();
		await expect(scratchpadCard(page, id)).toBeVisible();
	});

	await test.step("it opens again from its card with the rectangle", async () => {
		await scratchpadCard(page, id).getByRole("link").click();
		await expectScratchpadOpen(page);
		await selectAllShapes(page);
		await expect(selectedShapeActions(page)).toBeVisible();
		expect(await storedName(request, id)).toBeNull();
	});
});

test("leaving a new scratchpad before drawing stores nothing", async ({
	page,
	request,
}) => {
	let before = 0;

	await test.step("start a new scratchpad and go straight back", async () => {
		before = await storedScratchpadCount(request);
		await openApp(page);
		await startScratchpad(page);
		await goToAllDrawings(page);
	});

	await test.step("the server has no new scratchpad", async () => {
		expect(await storedScratchpadCount(request)).toBe(before);
	});

	await test.step("the back button starts a new scratchpad again", async () => {
		await page.goBack();
		await expectScratchpadOpen(page);
		await expect(page).toHaveURL(/\/drawings\/new$/);
	});
});

test("save and discard scratchpads from their cards", async ({
	page,
	request,
}) => {
	const name = uniqueName("Kept");
	let saved = "";
	let discarded = "";

	await test.step("two scratchpads exist", async () => {
		saved = await createScratchpadThroughApi(request);
		discarded = await createScratchpadThroughApi(request);
		await openApp(page);
	});

	await test.step(`save one as ${name} from its card`, async () => {
		await saveScratchpadFromCard(page, saved, name);
		await expect(drawingCardLink(page, name)).toBeVisible();
		await expect(scratchpadCard(page, saved)).toHaveCount(0);
	});

	await test.step("discard the other from its card", async () => {
		await discardScratchpadFromCard(page, discarded);
		await expect(scratchpadCard(page, discarded)).toHaveCount(0);
	});

	await test.step("the server has the saved one under its name and not the discarded one", async () => {
		await expect.poll(() => storedName(request, saved)).toBe(name);
		await expect.poll(() => storedName(request, discarded)).toBeUndefined();
	});
});

test("discard all scratchpads", async ({ page, request }) => {
	const name = uniqueName("Stays");
	let ids: string[] = [];

	await test.step(`two scratchpads and a drawing named ${name} exist`, async () => {
		ids = [
			await createScratchpadThroughApi(request),
			await createScratchpadThroughApi(request),
		];
		await openApp(page);
		await startScratchpad(page);
		await drawRectangle(page);
		await saveOpenScratchpad(page, name);
		await expectDrawingOpen(page, name);
		await goToAllDrawings(page);
	});

	await test.step("discard all scratchpads", async () => {
		await discardAllScratchpads(page);
	});

	await test.step(`the row is gone, ${name} stays, and the server has no scratchpads`, async () => {
		await expect(scratchpadsRow(page)).toHaveCount(0);
		await expect(drawingCardLink(page, name)).toBeVisible();
		for (const id of ids) {
			await expect.poll(() => storedName(request, id)).toBeUndefined();
		}
	});
});
