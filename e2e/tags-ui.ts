import type { Page } from "@playwright/test";

// The Tags tray as a user sees it: where things are and what a user does. Tests
// group these calls into named steps with `test.step`.

/** The Tags button next to the landing page's search. */
export function tagsButton(page: Page) {
	return page.getByRole("button", { name: "Tags", exact: true });
}

/** The open tray. */
export function tagTray(page: Page) {
	return page.getByRole("dialog", { name: "Tags" });
}

/** The tray's field that finds a tag by its label. */
export function findTagField(page: Page) {
	return tagTray(page).getByRole("searchbox", { name: "Find a tag" });
}

/** A tag's row in the tray. */
export function tagRow(page: Page, label: string) {
	return tagTray(page)
		.getByRole("list", { name: "Tags" })
		.getByRole("listitem")
		.filter({ hasText: label });
}

/** The tray's message, such as that no tag has the text. */
export function tagTrayStatus(page: Page) {
	return tagTray(page).getByRole("status");
}

/** Presses on the page beside the tray, in the corner away from it. */
export async function pressBesideTagTray(page: Page): Promise<void> {
	await page.mouse.click(5, 5);
}
