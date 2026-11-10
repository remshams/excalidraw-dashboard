import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "./database.ts";
import { openDrawingStore } from "./drawing-store.ts";
import { openTagStore } from "./tag-store.ts";

let file: string;

beforeEach(() => {
	file = join(mkdtempSync(join(tmpdir(), "database-")), "drawings.db");
});

afterEach(() => {
	rmSync(join(file, ".."), { recursive: true, force: true });
});

/** Writes a database as a version without numbered migrations left it. */
function createUnversionedDatabase(withPreviews: boolean): void {
	const db = new DatabaseSync(file);
	const previewColumns = withPreviews
		? ", preview BLOB, preview_updated_at TEXT"
		: "";
	db.exec(`
		CREATE TABLE drawings (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			scene TEXT,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL${previewColumns}
		);
		INSERT INTO drawings (id, name, scene, created_at, updated_at)
			VALUES ('old', 'Old plan', '{}', '2026-01-01', '2026-01-02');
	`);
	db.close();
}

const userVersion = (db: DatabaseSync): number =>
	(db.prepare("PRAGMA user_version").get() as { user_version: number })
		.user_version;

const columnTypes = (db: DatabaseSync): Record<string, string> =>
	Object.fromEntries(
		db
			.prepare("PRAGMA table_info(drawings)")
			.all()
			.map((column) => [column.name, column.type]),
	);

/** Uses every part of the current schema on the drawing with ID "old". */
function expectCurrentSchema(db: DatabaseSync): void {
	const drawings = openDrawingStore(db);
	const tags = openTagStore(db);
	const tag = tags.create({ label: "Work", color: "blue" });
	if (tag === "label-taken") throw new Error("label taken");

	const preview = drawings.setPreview("old", new Uint8Array([137, 80]));
	const tagged = drawings.setTags("old", [tag.id]);

	expect(userVersion(db)).toBe(3);
	expect(drawings.get("old")).toMatchObject({
		name: "Old plan",
		scene: "{}",
		updatedAt: "2026-01-02",
	});
	expect(preview?.previewUpdatedAt).toEqual(expect.any(String));
	expect(drawings.getPreview("old")).toEqual(new Uint8Array([137, 80]));
	expect(tagged).toMatchObject({ tagIds: [tag.id], updatedAt: "2026-01-02" });
	expect(columnTypes(db)).toMatchObject({
		preview: "BLOB",
		preview_updated_at: "TEXT",
	});
}

/** Writes a database at version 2, with three tags and no creation times. */
function createVersion2Database(): void {
	const db = new DatabaseSync(file);
	db.exec(`
		CREATE TABLE tags (
			id TEXT PRIMARY KEY,
			label TEXT NOT NULL,
			label_key TEXT NOT NULL UNIQUE,
			color TEXT NOT NULL
		);
		INSERT INTO tags (id, label, label_key, color) VALUES
			('first', 'Zebra', 'zebra', 'red'),
			('second', 'Apple', 'apple', 'blue'),
			('third', 'Mango', 'mango', 'green');
		PRAGMA user_version = 2;
	`);
	db.close();
}

describe("database", () => {
	it("creates the schema in a new database", () => {
		const db = openDatabase(file);

		expect(userVersion(db)).toBe(3);
		expect(openDrawingStore(db).list()).toEqual([]);
		expect(openTagStore(db).list()).toEqual([]);
		db.close();
	});

	it.each([
		["from before previews", false],
		["with previews from before tags", true],
	])("upgrades a database %s and keeps its drawings", (_, withPreviews) => {
		createUnversionedDatabase(withPreviews);

		const db = openDatabase(file);

		expectCurrentSchema(db);
		db.close();
	});

	it("opens an upgraded database again without changes", () => {
		createUnversionedDatabase(false);
		openDatabase(file).close();

		const db = openDatabase(file);

		expect(userVersion(db)).toBe(3);
		expect(openDrawingStore(db).list()).toHaveLength(1);
		db.close();
	});

	it("gives existing tags creation times in insertion order", () => {
		createVersion2Database();

		const db = openDatabase(file);
		const tags = db
			.prepare("SELECT id, created_at FROM tags ORDER BY created_at DESC")
			.all() as { id: string; created_at: string }[];

		expect(userVersion(db)).toBe(3);
		expect(tags.map(({ id }) => id)).toEqual(["third", "second", "first"]);
		for (const { created_at } of tags) {
			expect(new Date(created_at).toISOString()).toBe(created_at);
		}
		db.close();
	});
});
