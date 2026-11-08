import { expect, test } from "@playwright/test";
import {
	assignTagsThroughApi,
	createDrawingThroughApi,
	storedSummary,
} from "./drawings-api.ts";
import { searchField } from "./drawings-ui.ts";
import {
	createTagThroughApi,
	deleteTagThroughApi,
	storedTag,
	storedTagByLabel,
} from "./tags-api.ts";
import {
	findTagField,
	pressBesideTagTray,
	tagColor,
	tagFormError,
	tagLabelField,
	tagRow,
	tagsButton,
	tagTray,
	tagTrayStatus,
	trayButton,
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

	await test.step("New tag at its foot is in the window", async () => {
		await expect(trayButton(page, "New tag")).toBeInViewport({ ratio: 1 });
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

test("create, rename, recolour and delete a tag", async ({ page }) => {
	const label = uniqueName("Garden");
	const renamed = uniqueName("Allotment");

	await test.step("open the tray", async () => {
		await page.goto("/");
		await tagsButton(page).click();
	});

	await test.step(`create ${label} in green`, async () => {
		await trayButton(page, "New tag").click();
		await tagLabelField(page).fill(label);
		await tagColor(page, "Green").check();
		await trayButton(page, "Create tag").click();
		await expect(tagTrayStatus(page)).toHaveText(`${label} created.`);
		await expect(
			tagRow(page, label).getByRole("img", { name: "Green" }),
		).toBeVisible();
	});

	await test.step(`rename it to ${renamed} and recolour it pink`, async () => {
		await trayButton(page, `Change ${label}`).click();
		await tagLabelField(page).fill(renamed);
		await tagColor(page, "Pink").check();
		await trayButton(page, "Save tag").click();
		await expect(tagTrayStatus(page)).toHaveText(`${renamed} saved.`);
		await expect(
			tagRow(page, renamed).getByRole("img", { name: "Pink" }),
		).toBeVisible();
		await expect(tagRow(page, label)).toHaveCount(0);
	});

	await test.step("the changes survive a reload", async () => {
		await page.reload();
		await tagsButton(page).click();
		await expect(
			tagRow(page, renamed).getByRole("img", { name: "Pink" }),
		).toBeVisible();
	});

	await test.step("delete it after answering the question", async () => {
		await trayButton(page, `Change ${renamed}`).click();
		await trayButton(page, "Delete…").click();
		await expect(tagTray(page)).toContainText("No drawing has it.");
		await trayButton(page, "Delete tag").click();
		await expect(tagTrayStatus(page)).toHaveText(`${renamed} deleted.`);
		await expect(tagRow(page, renamed)).toHaveCount(0);
	});
});

test("look after a tag by keyboard alone", async ({ page, request }) => {
	const first = uniqueName("Aardvark");
	const label = uniqueName("Garden");
	const renamed = uniqueName("Allotment");

	await test.step("open the tray with a tag in it", async () => {
		await createTagThroughApi(request, first);
		await page.goto("/");
		await tagsButton(page).focus();
		await page.keyboard.press("Enter");
		await expect(findTagField(page)).toBeFocused();
	});

	await test.step("Enter on a text nothing matches opens the form with it", async () => {
		await page.keyboard.type(label);
		await page.keyboard.press("Enter");
		await expect(tagLabelField(page)).toBeFocused();
		await expect(tagLabelField(page)).toHaveValue(label);
		expect(await storedTagByLabel(request, label)).toBeUndefined();
	});

	await test.step("Tab reaches the colours, and arrows change them", async () => {
		await page.keyboard.press("Tab");
		await expect(tagColor(page, "Blue")).toBeFocused();
		await page.keyboard.press("ArrowRight");
		await expect(tagColor(page, "Violet")).toBeChecked();
	});

	await test.step("Enter creates it and focuses its pencil", async () => {
		await page.keyboard.press("Enter");
		await expect(trayButton(page, `Change ${label}`)).toBeFocused();
		await expect(findTagField(page)).toHaveValue("");
	});

	await test.step("Enter on the pencil opens the form, Escape returns to it", async () => {
		await page.keyboard.press("Enter");
		await expect(tagLabelField(page)).toBeFocused();
		await page.keyboard.press("Escape");
		await expect(trayButton(page, `Change ${label}`)).toBeFocused();
	});

	await test.step("rename it", async () => {
		await page.keyboard.press("Enter");
		await page.keyboard.press("ControlOrMeta+A");
		await page.keyboard.type(renamed);
		await page.keyboard.press("Enter");
		await expect(trayButton(page, `Change ${renamed}`)).toBeFocused();
	});

	await test.step("the arrow keys go between the find field and the rows", async () => {
		await page.keyboard.press("Shift+Tab");
		await expect(findTagField(page)).toBeFocused();
		await page.keyboard.type(renamed);
		await page.keyboard.press("ArrowDown");
		await expect(trayButton(page, `Change ${renamed}`)).toBeFocused();
		await page.keyboard.press("ArrowUp");
		await expect(findTagField(page)).toBeFocused();
		await page.keyboard.press("ArrowDown");
	});

	await test.step("Tab reaches Delete…, and the question focuses Keep it", async () => {
		await page.keyboard.press("Enter");
		await page.keyboard.press("Tab");
		await page.keyboard.press("Tab");
		await page.keyboard.press("Tab");
		await page.keyboard.press("Tab");
		await expect(trayButton(page, "Delete…")).toBeFocused();
		await page.keyboard.press("Enter");
		await expect(trayButton(page, "Keep it")).toBeFocused();
	});

	await test.step("Escape leaves the question first", async () => {
		await page.keyboard.press("Escape");
		await expect(tagLabelField(page)).toBeFocused();
	});

	await test.step("deleting focuses the find field", async () => {
		for (let press = 0; press < 4; press++) await page.keyboard.press("Tab");
		await page.keyboard.press("Enter");
		await page.keyboard.press("Shift+Tab");
		await expect(trayButton(page, "Delete tag")).toBeFocused();
		await page.keyboard.press("Enter");
		await expect(tagTrayStatus(page)).toHaveText(`${renamed} deleted.`);
		await expect(findTagField(page)).toBeFocused();
	});

	await test.step("Escape closes the tray and returns to the Tags button", async () => {
		await page.keyboard.press("Escape");
		await expect(tagTray(page)).toBeHidden();
		await expect(tagsButton(page)).toBeFocused();
	});
});

test("deleting a tag names its drawing and removes it from there", async ({
	page,
	request,
}) => {
	const label = uniqueName("Work");
	let tagId = "";
	let drawingId = "";

	await test.step(`${label} is on a drawing`, async () => {
		tagId = await createTagThroughApi(request, label);
		drawingId = await createDrawingThroughApi(request, uniqueName("Plan"));
		await assignTagsThroughApi(request, drawingId, [tagId]);
		await page.goto("/");
		await tagsButton(page).click();
	});

	await test.step("the question names one drawing", async () => {
		await trayButton(page, `Change ${label}`).click();
		await trayButton(page, "Delete…").click();
		await expect(tagTray(page)).toContainText(
			"It is removed from 1 drawing. The drawings stay.",
		);
	});

	await test.step("after deleting, the drawing stays without the tag", async () => {
		await trayButton(page, "Delete tag").click();
		await expect(tagTrayStatus(page)).toHaveText(`${label} deleted.`);
		expect(await storedTag(request, tagId)).toBeUndefined();
		const summary = await storedSummary(request, drawingId);
		expect(summary?.tagIds).toEqual([]);
	});
});

test("the form explains a rejected label", async ({ page, request }) => {
	const taken = uniqueName("Taken");

	await test.step(`tag ${taken} exists`, async () => {
		await createTagThroughApi(request, taken);
		await page.goto("/");
		await tagsButton(page).click();
		await trayButton(page, "New tag").click();
	});

	await test.step("an empty label", async () => {
		await trayButton(page, "Create tag").click();
		await expect(tagFormError(page)).toHaveText("A tag needs a label");
		await expect(tagLabelField(page)).toBeFocused();
	});

	await test.step("a label that is too long", async () => {
		await tagLabelField(page).fill("x".repeat(31));
		await trayButton(page, "Create tag").click();
		await expect(tagFormError(page)).toHaveText(
			"A tag label has at most 30 characters",
		);
	});

	await test.step("a label another tag has, in any case", async () => {
		const shouted = taken.toUpperCase();
		await tagLabelField(page).fill(shouted);
		await expect(tagFormError(page)).toHaveCount(0);
		await trayButton(page, "Create tag").click();
		await expect(tagFormError(page)).toHaveText(
			`A tag named "${shouted}" already exists`,
		);
	});
});

test("another tab's changes reach the form", async ({ page, request }) => {
	const label = uniqueName("Elsewhere");
	const doomed = uniqueName("Doomed");
	let doomedId = "";

	await test.step("the tray is open when another tab changes the tags", async () => {
		doomedId = await createTagThroughApi(request, doomed);
		await page.goto("/");
		await tagsButton(page).click();
		await expect(tagRow(page, doomed)).toBeVisible();
		await createTagThroughApi(request, label);
	});

	await test.step("the server's answer shows in the form, and the tag joins the list", async () => {
		await trayButton(page, "New tag").click();
		await tagLabelField(page).fill(label);
		await trayButton(page, "Create tag").click();
		await expect(tagFormError(page)).toHaveText(
			`A tag named "${label}" already exists`,
		);
		await trayButton(page, "Cancel").click();
		await expect(tagRow(page, label)).toBeVisible();
	});

	await test.step("saving a tag deleted elsewhere goes back to the list", async () => {
		await trayButton(page, `Change ${doomed}`).click();
		await deleteTagThroughApi(request, doomedId);
		await trayButton(page, "Save tag").click();
		await expect(tagTrayStatus(page)).toHaveText(
			"This tag was deleted elsewhere.",
		);
		await expect(tagRow(page, doomed)).toHaveCount(0);
	});
});

test("the tray keeps New tag in a short window after a change", async ({
	page,
	request,
}) => {
	const label = uniqueName("Changed");

	await test.step("a list too long for the window", async () => {
		for (let index = 0; index < 30; index++) {
			await createTagThroughApi(request, uniqueName("Many"));
		}
		await createTagThroughApi(request, label);
		await page.setViewportSize({ width: 1366, height: 500 });
		await page.goto("/");
		await tagsButton(page).click();
	});

	await test.step("New tag is in the window", async () => {
		await expect(trayButton(page, "New tag")).toBeInViewport({ ratio: 1 });
	});

	await test.step("so it stays when a status line joins it", async () => {
		await trayButton(page, `Change ${label}`).click();
		await trayButton(page, "Save tag").click();
		await expect(tagTrayStatus(page)).toHaveText(`${label} saved.`);
		await expect(trayButton(page, "New tag")).toBeInViewport({ ratio: 1 });
	});
});

test("a long label ends in an ellipsis on a phone", async ({
	page,
	request,
}) => {
	const label = uniqueName("W".repeat(21));

	await test.step("a label as wide as a label gets, on a phone", async () => {
		await createTagThroughApi(request, label);
		await page.setViewportSize({ width: 390, height: 760 });
		await page.goto("/");
		await tagsButton(page).click();
		await trayButton(page, `Change ${label}`).click();
		await trayButton(page, "Delete…").click();
	});

	await test.step("the question's tag stays inside the tray", async () => {
		const tray = await tagTray(page).boundingBox();
		const mark = await tagTray(page).getByText(label).boundingBox();
		if (!tray || !mark) throw new Error("Both should be on the page");
		expect(mark.x).toBeGreaterThanOrEqual(tray.x);
		expect(mark.x + mark.width).toBeLessThanOrEqual(tray.x + tray.width);
	});

	await test.step("the message about a taken label stays inside the tray", async () => {
		await trayButton(page, "Keep it").click();
		await trayButton(page, "Cancel").click();
		await trayButton(page, "New tag").click();
		await tagLabelField(page).fill(label);
		await trayButton(page, "Create tag").click();
		const tray = await tagTray(page).boundingBox();
		const error = await tagFormError(page).boundingBox();
		if (!tray || !error) throw new Error("Both should be on the page");
		expect(error.x + error.width).toBeLessThanOrEqual(tray.x + tray.width);
		const scrollWidth = await tagFormError(page).evaluate(
			(message) => message.scrollWidth - message.clientWidth,
		);
		expect(scrollWidth).toBe(0);
	});
});

test("a press under the tray's sheet closes it", async ({ page }) => {
	await test.step("open the tray in a tall window", async () => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto("/");
		await tagsButton(page).click();
		await expect(tagTray(page)).toBeVisible();
	});

	await test.step("press at the window's foot, straight below the tray", async () => {
		const button = await tagsButton(page).boundingBox();
		if (!button) throw new Error("The button should be on the page");
		await page.mouse.click(button.x, 890);
		await expect(tagTray(page)).toBeHidden();
		await expect(tagsButton(page)).toBeFocused();
	});
});

test("a failed change stays in the form and can be tried again", async ({
	page,
}) => {
	const label = uniqueName("Retry");

	await test.step("the server fails while a new tag is sent", async () => {
		await page.route("**/api/tags", (route) =>
			route.request().method() === "POST"
				? route.fulfill({ status: 500, body: "Boom" })
				: route.continue(),
		);
		await page.goto("/");
		await tagsButton(page).click();
		await trayButton(page, "New tag").click();
		await tagLabelField(page).fill(label);
		await trayButton(page, "Create tag").click();
	});

	await test.step("the form says so and keeps the label", async () => {
		await expect(tagFormError(page)).toHaveText(
			"The change failed. Try again.",
		);
		await expect(tagLabelField(page)).toHaveValue(label);
		await expect(tagLabelField(page)).toBeFocused();
	});

	await test.step("trying again after the server recovers creates the tag", async () => {
		await page.unroute("**/api/tags");
		await page.keyboard.press("Enter");
		await expect(tagTrayStatus(page)).toHaveText(`${label} created.`);
		await expect(page.getByRole("alert")).toHaveCount(0);
	});
});

test("the form fits a short window", async ({ page }) => {
	await test.step("open a new tag in a short window", async () => {
		await page.setViewportSize({ width: 1280, height: 320 });
		await page.goto("/");
		await tagsButton(page).click();
		await trayButton(page, "New tag").click();
	});

	await test.step("the buttons can be scrolled to", async () => {
		const create = trayButton(page, "Create tag");
		await create.scrollIntoViewIfNeeded();
		await expect(create).toBeInViewport({ ratio: 1 });
	});
});
