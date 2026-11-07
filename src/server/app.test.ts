import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { rebuildApp, request, setUpTestApi } from "./test-api.ts";

setUpTestApi();

describe("client build", () => {
	let staticDir: string;

	beforeEach(() => {
		staticDir = mkdtempSync(join(tmpdir(), "client-build-"));
		writeFileSync(join(staticDir, "index.html"), "<p>client</p>");
		rebuildApp({ staticDir });
	});

	afterEach(() => rmSync(staticDir, { recursive: true }));

	it("serves the client for a drawing's path", async () => {
		const response = await request("/drawings/some-id");

		expect(response.status).toBe(200);
		expect(await response.text()).toBe("<p>client</p>");
	});

	it("answers an unknown API path with 404, not the client", async () => {
		const response = await request("/api/unknown");

		expect(response.status).toBe(404);
		expect(await response.text()).not.toContain("client");
	});
});
