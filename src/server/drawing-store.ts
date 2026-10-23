import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import type { Drawing, DrawingSummary } from "../shared/types.ts";

type Row = {
	id: string;
	name: string;
	scene: string | null;
	created_at: string;
	updated_at: string;
};

const toSummary = (row: Row): DrawingSummary => ({
	id: row.id,
	name: row.name,
	createdAt: row.created_at,
	updatedAt: row.updated_at,
});

const SCHEMA = `
	PRAGMA journal_mode = WAL;
	CREATE TABLE IF NOT EXISTS drawings (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		scene TEXT,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL
	);
`;

/** Opens the SQLite database at `file`, or an in-memory one for `":memory:"`. */
export function openDrawingStore(file: string) {
	const db = new DatabaseSync(file);
	db.exec(SCHEMA);

	const listStmt = db.prepare(
		"SELECT id, name, created_at, updated_at FROM drawings ORDER BY name COLLATE NOCASE",
	);
	const getStmt = db.prepare("SELECT * FROM drawings WHERE id = ?");
	const insertStmt = db.prepare(
		"INSERT INTO drawings (id, name, scene, created_at, updated_at) VALUES (?, ?, NULL, ?, ?)",
	);
	const updateStmt = db.prepare(
		"UPDATE drawings SET name = COALESCE(?, name), scene = COALESCE(?, scene), updated_at = ? WHERE id = ?",
	);
	const deleteStmt = db.prepare("DELETE FROM drawings WHERE id = ?");

	return {
		list(): DrawingSummary[] {
			return (listStmt.all() as Row[]).map(toSummary);
		},

		get(id: string): Drawing | undefined {
			const row = getStmt.get(id) as Row | undefined;
			return row && { ...toSummary(row), scene: row.scene };
		},

		create(name: string): Drawing {
			const id = randomUUID();
			const now = new Date().toISOString();
			insertStmt.run(id, name, now, now);
			return { id, name, scene: null, createdAt: now, updatedAt: now };
		},

		update(
			id: string,
			changes: { name?: string; scene?: string },
		): DrawingSummary | undefined {
			const result = updateStmt.run(
				changes.name ?? null,
				changes.scene ?? null,
				new Date().toISOString(),
				id,
			);
			if (result.changes === 0) return undefined;
			return toSummary(getStmt.get(id) as Row);
		},

		delete(id: string): boolean {
			return deleteStmt.run(id).changes > 0;
		},

		close(): void {
			db.close();
		},
	};
}

export type DrawingStore = ReturnType<typeof openDrawingStore>;
