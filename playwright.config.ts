import { defineConfig, devices } from "@playwright/test";

const port = 3101;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
	testDir: "e2e",
	// The tests share one server and database; serial runs keep their data apart.
	workers: 1,
	forbidOnly: Boolean(process.env.CI),
	retries: 0,
	reporter: [["list"], ["html", { open: "never" }]],
	use: {
		baseURL,
		trace: "retain-on-failure",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		// A fresh database per run, kept afterwards in .e2e-data/ for debugging.
		command: "rm -rf .e2e-data && pnpm build && node src/server/index.ts",
		url: baseURL,
		reuseExistingServer: false,
		timeout: 120_000,
		env: {
			PORT: String(port),
			DATA_DIR: ".e2e-data",
			NODE_ENV: "production",
		},
	},
});
