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

afterEach(() => {
	rmSync(dir, { recursive: true, force: true });
});

/** Creates a database file with the schema from before previews. */
function createOldDatabase(file: string): void {
	const db = new DatabaseSync(file);
	db.exec(`
		CREATE TABLE drawings (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			scene TEXT,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);
		INSERT INTO drawings VALUES ('old', 'Old plan', '{}', '2026-01-01', '2026-01-02');
	`);
	db.close();
}

describe("drawing store", () => {
	it("adds the preview columns to a database from before previews", () => {
		const file = join(dir, "drawings.db");
		createOldDatabase(file);

		const store = openDrawingStore(file);
		const before = store.get("old");
		const after = store.setPreview("old", new Uint8Array([137, 80, 78, 71]));

		expect(before).toMatchObject({
			name: "Old plan",
			scene: "{}",
			previewUpdatedAt: null,
		});
		expect(after?.previewUpdatedAt).toEqual(expect.any(String));
		expect(after?.updatedAt).toBe("2026-01-02");
		expect(store.getPreview("old")).toEqual(new Uint8Array([137, 80, 78, 71]));
		store.close();
	});

	it("gives the added columns their types", () => {
		const file = join(dir, "drawings.db");
		createOldDatabase(file);
		openDrawingStore(file).close();

		const db = new DatabaseSync(file);
		const types = Object.fromEntries(
			db
				.prepare("PRAGMA table_info(drawings)")
				.all()
				.map((column) => [column.name, column.type]),
		);
		db.close();

		expect(types).toMatchObject({
			preview: "BLOB",
			preview_updated_at: "TEXT",
		});
	});

	it("opens an upgraded database again without changes", () => {
		const file = join(dir, "drawings.db");
		createOldDatabase(file);
		openDrawingStore(file).close();

		const store = openDrawingStore(file);

		expect(store.list()).toHaveLength(1);
		store.close();
	});
});
