import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	define: {
		// Excalidraw reads this flag at runtime.
		"process.env.IS_PREACT": JSON.stringify("false"),
	},
	server: {
		proxy: { "/api": "http://localhost:3001" },
	},
	test: {
		coverage: {
			provider: "v8",
			include: ["src/**/*.{ts,tsx}"],
			reporter: ["text-summary", "json"],
		},
		projects: [
			{
				extends: true,
				test: {
					name: "client",
					environment: "jsdom",
					include: ["src/client/**/*.test.{ts,tsx}"],
					setupFiles: ["src/client/test-setup.ts"],
				},
			},
			{
				test: {
					name: "server",
					environment: "node",
					include: ["src/server/**/*.test.ts"],
				},
			},
		],
	},
});
