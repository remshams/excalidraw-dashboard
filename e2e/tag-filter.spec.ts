import { expect, test } from "@playwright/test";
import {
	assignTagsThroughApi,
	createDrawingThroughApi,
} from "./drawings-api.ts";
import {
	cardTagToggle,
	clearFilterButton,
	drawingCardLink,
	drawingCards,
	expectDrawingOpen,
	filterRowTag,
	filterRowTags,
	goToAllDrawings,
	openDrawingFromCard,
	searchDrawings,
	searchField,
	taggedCardLink,
} from "./drawings-ui.ts";
import { createTagThroughApi } from "./tags-api.ts";
import {
	tagsButton,
	tagsButtonCounting,
	tagTray,
	trayTagToggle,
} from "./tags-ui.ts";
import { uniqueName } from "./unique-name.ts";

test("filter by two tags and search, open a drawing and find both still set on return", async ({
	page,
	request,
}) => {
	const work = uniqueName("Work");
	const home = uniqueName("Home");
	const other = uniqueName("Other");
	const prefix = uniqueName("Filtered");
	const planAtWork = `${prefix} plan at work`;
	const planAtHome = `${prefix} plan at home`;
	const notesAtWork = `${prefix} notes at work`;
	const otherPlan = `${prefix} other plan`;
	const query = `${prefix} plan`;

	await test.step(`four drawings carry ${work}, ${home} or ${other}`, async () => {
		const workId = await createTagThroughApi(request, work, "blue");
		const homeId = await createTagThroughApi(request, home, "green");
		const otherId = await createTagThroughApi(request, other, "red");
		const tagged: [string, string][] = [
			[planAtWork, workId],
			[planAtHome, homeId],
			[notesAtWork, workId],
			[otherPlan, otherId],
		];
		for (const [name, tagId] of tagged) {
			const drawingId = await createDrawingThroughApi(request, name);
			await assignTagsThroughApi(request, drawingId, [tagId]);
		}
		await page.goto("/");
	});

	await test.step(`click ${work} on a card: only the drawings with ${work} show`, async () => {
		await cardTagToggle(page, planAtWork, work).click();
		await expect(cardTagToggle(page, planAtWork, work)).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await expect(filterRowTag(page, work)).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await expect(drawingCards(page)).toHaveCount(3);
		await expect(taggedCardLink(page, notesAtWork, [work])).toBeVisible();
	});

	await test.step(`add ${home} in the Tags tray: the drawings with either show`, async () => {
		await tagsButtonCounting(page, 1).click();
		await trayTagToggle(page, home).click();
		await expect(trayTagToggle(page, home)).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await page.keyboard.press("Escape");
		await expect(tagTray(page)).toBeHidden();
		await expect(tagsButtonCounting(page, 2)).toBeVisible();
		await expect(drawingCards(page)).toHaveCount(4);
	});

	await test.step(`search for “${query}”: the plans with ${work} or ${home} show`, async () => {
		await searchDrawings(page, query);
		await expect(drawingCards(page)).toHaveCount(3);
		await expect(taggedCardLink(page, planAtWork, [work])).toBeVisible();
		await expect(taggedCardLink(page, planAtHome, [home])).toBeVisible();
	});

	await test.step(`open ${planAtWork} and go back to all drawings`, async () => {
		await openDrawingFromCard(page, `${planAtWork}, tags: ${work}`);
		await expectDrawingOpen(page, planAtWork);
		await goToAllDrawings(page);
	});

	await test.step("the filter and the search are still set, and the same cards show", async () => {
		await expect(searchField(page)).toHaveValue(query);
		await expect(filterRowTag(page, work)).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await expect(filterRowTag(page, home)).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await expect(drawingCards(page)).toHaveCount(3);
		await expect(taggedCardLink(page, planAtWork, [work])).toBeVisible();
		await expect(taggedCardLink(page, planAtHome, [home])).toBeVisible();
	});

	await test.step("a reload clears the filter and the search, and the row still shows the tags", async () => {
		await page.reload();
		await expect(searchField(page)).toHaveValue("");
		await expect(tagsButton(page)).toBeVisible();
		await expect(filterRowTag(page, work)).toHaveAttribute(
			"aria-pressed",
			"false",
		);
		await expect(filterRowTag(page, home)).toHaveAttribute(
			"aria-pressed",
			"false",
		);
		await expect(taggedCardLink(page, otherPlan, [other])).toBeVisible();
	});
});

test("filter by tags with the keyboard alone", async ({ page, request }) => {
	const name = uniqueName("Plan");
	const first = uniqueName("A first");
	const second = uniqueName("B second");

	await test.step(`${name} carries ${first} and ${second}, and ${first} is the newer tag`, async () => {
		const drawingId = await createDrawingThroughApi(request, name);
		// The row shows the newer tag first. Its label sorts first too, so a tie
		// in creation time gives the same order.
		const secondId = await createTagThroughApi(request, second);
		const firstId = await createTagThroughApi(request, first);
		await assignTagsThroughApi(request, drawingId, [firstId, secondId]);
		await page.goto("/");
	});

	await test.step("Tab from the card reaches its first tag, and Enter puts it in the filter", async () => {
		await drawingCardLink(page, `${name}, tags: ${first}, ${second}`).focus();
		await page.keyboard.press("Tab");
		await expect(cardTagToggle(page, name, first)).toBeFocused();
		await page.keyboard.press("Enter");
		await expect(cardTagToggle(page, name, first)).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await expect(cardTagToggle(page, name, first)).toBeFocused();
	});

	await test.step("the right arrow reaches the second tag, and Space adds it too", async () => {
		await page.keyboard.press("ArrowRight");
		await expect(cardTagToggle(page, name, second)).toBeFocused();
		await page.keyboard.press("Space");
		await expect(cardTagToggle(page, name, second)).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await expect(tagsButtonCounting(page, 2)).toBeVisible();
	});

	await test.step("Tab from the Tags button reaches the row, and the arrows move along it", async () => {
		await tagsButtonCounting(page, 2).focus();
		await page.keyboard.press("Tab");
		await expect(filterRowTag(page, first)).toBeFocused();
		await page.keyboard.press("ArrowRight");
		await expect(filterRowTag(page, second)).toBeFocused();
		await page.keyboard.press("Enter");
		await expect(filterRowTag(page, second)).toHaveAttribute(
			"aria-pressed",
			"false",
		);
		await expect(filterRowTag(page, second)).toBeFocused();
	});

	await test.step("Tab reaches Clear filter, and Enter empties the filter and focuses the row's first tag", async () => {
		await page.keyboard.press("Tab");
		await expect(clearFilterButton(page)).toBeFocused();
		await page.keyboard.press("Enter");
		await expect(filterRowTag(page, first)).toHaveAttribute(
			"aria-pressed",
			"false",
		);
		await expect(clearFilterButton(page)).toHaveCount(0);
		await expect(tagsButton(page)).toBeVisible();
		await expect(filterRowTag(page, first)).toBeFocused();
	});
});

test("the Filter by row shows every tag, newest created first", async ({
	page,
	request,
}) => {
	// A label that sorts first breaks a tie in creation time the same way.
	const older = uniqueName("B older");
	const newer = uniqueName("A newer");

	await test.step(`${older} exists and the page loads`, async () => {
		await createTagThroughApi(request, older);
		await page.goto("/");
	});

	await test.step(`the row shows ${older} first, unpressed, without a selection`, async () => {
		await expect(filterRowTags(page).first()).toHaveAccessibleName(
			`Filter by ${older}`,
		);
		await expect(filterRowTag(page, older)).toHaveAttribute(
			"aria-pressed",
			"false",
		);
		await expect(clearFilterButton(page)).toHaveCount(0);
	});

	await test.step(`${newer} is created through the API and shows first after a reload`, async () => {
		await createTagThroughApi(request, newer);
		await page.reload();
		await expect(filterRowTags(page).nth(0)).toHaveAccessibleName(
			`Filter by ${newer}`,
		);
		await expect(filterRowTags(page).nth(1)).toHaveAccessibleName(
			`Filter by ${older}`,
		);
	});

	await test.step(`selecting ${older} and clearing the filter moves no tag`, async () => {
		await filterRowTag(page, older).click();
		await expect(filterRowTag(page, older)).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await expect(filterRowTags(page).nth(0)).toHaveAccessibleName(
			`Filter by ${newer}`,
		);
		await expect(filterRowTags(page).nth(1)).toHaveAccessibleName(
			`Filter by ${older}`,
		);
		await clearFilterButton(page).click();
		await expect(filterRowTags(page).nth(0)).toHaveAccessibleName(
			`Filter by ${newer}`,
		);
		await expect(filterRowTags(page).nth(1)).toHaveAccessibleName(
			`Filter by ${older}`,
		);
	});
});
