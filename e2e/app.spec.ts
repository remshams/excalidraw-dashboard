import { expect, test } from "@playwright/test";
import { openApp } from "./drawings-ui.ts";

test("the browser tab shows the Excalidraw logo", async ({ page, request }) => {
	let href: string | null = null;

	await test.step("open the app", async () => {
		await openApp(page);
	});

	await test.step("the page names an SVG icon", async () => {
		// The icon link sits in the document head, which has no roles.
		const icon = page.locator('head link[rel="icon"]');
		await expect(icon).toHaveAttribute("type", "image/svg+xml");
		href = await icon.getAttribute("href");
	});

	await test.step("the server serves the icon as an SVG image", async () => {
		const response = await request.get(href ?? "");
		expect(response.status()).toBe(200);
		expect(response.headers()["content-type"]).toContain("image/svg+xml");
		expect(await response.text()).toContain("<svg");
	});
});
