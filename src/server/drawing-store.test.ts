import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDrawingStore } from "./drawing-store.ts";

let dir: string;

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), "drawing-store-"));
});

afterEach(() => rmSync(dir, { recursive: true }));

describe("openDrawingStore", () => {
	it("adds the preview column to a database without one", () => {
		const file = join(dir, "drawings.db");
		const old = new DatabaseSync(file);
		old.exec(`
			CREATE TABLE drawings (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				scene TEXT,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			);
			INSERT INTO drawings VALUES ('1', 'Plan', '{}', '', '');
		`);
		old.close();

		const store = openDrawingStore(file);
		const summary = store.setPreview("1", new Uint8Array([1]));
		store.close();

		expect(summary).toMatchObject({ name: "Plan", hasPreview: true });
	});
});
