import { expect, test } from "@playwright/test";
import {
	assignTagsThroughApi,
	createDrawingThroughApi,
} from "./drawings-api.ts";
import { searchField } from "./drawings-ui.ts";
import { createTagThroughApi } from "./tags-api.ts";
import {
	findTagField,
	pressBesideTagTray,
	tagRow,
	tagsButton,
	tagTray,
	tagTrayStatus,
} from "./tags-ui.ts";
import { uniqueName } from "./unique-name.ts";

test("the tray lists tags with their colour and drawing count", async ({
	page,
	request,
}) => {
	const carried = uniqueName("Work");
	const unused = uniqueName("Garden");
	const drawing = uniqueName("Plan");

	await test.step(`${carried} is on a drawing, ${unused} on none`, async () => {
		const carriedId = await createTagThroughApi(request, carried, "blue");
		await createTagThroughApi(request, unused, "green");
		const drawingId = await createDrawingThroughApi(request, drawing);
		await assignTagsThroughApi(request, drawingId, [carriedId]);
	});

	await test.step("open the tray", async () => {
		await page.goto("/");
		await tagsButton(page).click();
		await expect(tagTray(page)).toBeVisible();
	});

	await test.step("each row shows the colour and the count", async () => {
		const row = tagRow(page, carried);
		await expect(row.getByRole("img", { name: "Blue" })).toBeVisible();
		await expect(row).toContainText("1 drawing");
		const other = tagRow(page, unused);
		await expect(other.getByRole("img", { name: "Green" })).toBeVisible();
		await expect(other).toContainText("0 drawings");
	});

	await test.step("the page stays in view behind a clear backdrop", async () => {
		await expect(
			page.getByRole("heading", { name: "Drawings" }),
		).toBeInViewport();
		const backdrop = await tagTray(page).evaluate(
			(tray) => getComputedStyle(tray, "::backdrop").backgroundColor,
		);
		expect(backdrop).toBe("rgba(0, 0, 0, 0)");
	});
});

test("the tray hangs below the Tags button", async ({ page }) => {
	await test.step("open the tray", async () => {
		await page.goto("/");
		await tagsButton(page).click();
	});

	await test.step("its top edge is just under the button and their right edges line up", async () => {
		const button = await tagsButton(page).boundingBox();
		const tray = await tagTray(page).boundingBox();
		if (!button || !tray) throw new Error("Both should be on the page");
		expect(tray.y).toBeGreaterThanOrEqual(button.y + button.height);
		expect(tray.y).toBeLessThan(button.y + button.height + 16);
		expect(tray.x + tray.width).toBeCloseTo(button.x + button.width, 0);
	});
});

test("the tray spans the page's content at phone width", async ({ page }) => {
	await test.step("open the tray at phone width", async () => {
		await page.setViewportSize({ width: 600, height: 700 });
		await page.goto("/");
		await tagsButton(page).click();
	});

	await test.step("it reaches from the search field's left edge to the button's right edge", async () => {
		const tray = await tagTray(page).boundingBox();
		const search = await searchField(page).boundingBox();
		const button = await tagsButton(page).boundingBox();
		if (!tray || !search || !button) {
			throw new Error("All of them should be on the page");
		}
		expect(tray.x).toBeCloseTo(search.x, 0);
		expect(tray.x + tray.width).toBeCloseTo(button.x + button.width, 0);
	});
});

test("the tray fits a short window that can't scroll", async ({
	page,
	request,
}) => {
	await test.step("a window too short for the page and ten tags", async () => {
		await createDrawingThroughApi(request, uniqueName("Plan"));
		for (let index = 0; index < 10; index++) {
			await createTagThroughApi(request, uniqueName("Short"));
		}
		await page.setViewportSize({ width: 1280, height: 320 });
		await page.goto("/");
		await tagsButton(page).click();
	});

	await test.step("the whole tray is in the window", async () => {
		await expect(tagTray(page)).toBeInViewport({ ratio: 1 });
	});

	await test.step("the last row can be scrolled to", async () => {
		const lastRow = tagTray(page).getByRole("listitem").last();
		await lastRow.scrollIntoViewIfNeeded();
		await expect(lastRow).toBeInViewport({ ratio: 1 });
	});

	await test.step("the wheel over the page leaves the tray where it is", async () => {
		const before = await tagTray(page).boundingBox();
		await page.mouse.move(5, 5);
		await page.mouse.wheel(0, 500);
		await page.waitForTimeout(100);
		expect(await tagTray(page).boundingBox()).toEqual(before);
	});
});

test("find a tag in the tray", async ({ page, request }) => {
	const wanted = uniqueName("Wanted");
	const other = uniqueName("Other");

	await test.step(`tags ${wanted} and ${other} exist`, async () => {
		await createTagThroughApi(request, wanted);
		await createTagThroughApi(request, other);
		await page.goto("/");
		await tagsButton(page).click();
	});

	await test.step("the find field narrows the rows", async () => {
		await findTagField(page).fill(wanted.toUpperCase());
		await expect(tagRow(page, wanted)).toBeVisible();
		await expect(tagRow(page, other)).toHaveCount(0);
	});

	await test.step("a text no tag has says so", async () => {
		const missing = uniqueName("Missing");
		await findTagField(page).fill(missing);
		await expect(tagTrayStatus(page)).toHaveText(
			`No tag is called “${missing}”.`,
		);
	});
});

test("the tray works by keyboard alone", async ({ page, request }) => {
	const label = uniqueName("Work");

	await test.step(`tag ${label} exists`, async () => {
		await createTagThroughApi(request, label);
		await page.goto("/");
	});

	await test.step("Enter on the Tags button opens the tray on its find field", async () => {
		await tagsButton(page).focus();
		await page.keyboard.press("Enter");
		await expect(tagTray(page)).toBeVisible();
		await expect(findTagField(page)).toBeFocused();
	});

	await test.step("the first Escape clears the find text and keeps the tray", async () => {
		await page.keyboard.type("no such tag");
		await page.keyboard.press("Escape");
		await expect(findTagField(page)).toHaveValue("");
		await expect(tagTray(page)).toBeVisible();
	});

	await test.step("the next Escape closes it and returns the focus", async () => {
		await page.keyboard.press("Escape");
		await expect(tagTray(page)).toBeHidden();
		await expect(tagsButton(page)).toBeFocused();
	});
});

test("a press beside the tray closes it", async ({ page }) => {
	await test.step("open the tray", async () => {
		await page.goto("/");
		await tagsButton(page).click();
		await expect(tagTray(page)).toBeVisible();
	});

	await test.step("press beside it", async () => {
		await pressBesideTagTray(page);
		await expect(tagTray(page)).toBeHidden();
		await expect(tagsButton(page)).toBeFocused();
	});
});
