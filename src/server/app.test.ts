import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { request, setUpTestApi } from "./test-api.ts";

const staticDir = mkdtempSync(join(tmpdir(), "client-build-"));
writeFileSync(join(staticDir, "index.html"), "<p>client</p>");
afterAll(() => rmSync(staticDir, { recursive: true }));

setUpTestApi({ staticDir });

describe("client build", () => {
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
