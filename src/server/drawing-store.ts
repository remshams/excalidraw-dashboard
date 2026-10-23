import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import type { Drawing, DrawingSummary } from "../shared/types.ts";

type Row = {
	id: string;
	name: string;
	scene: string | null;
	created_at: string;
	updated_at: string;
	has_preview: number;
};

const toSummary = (row: Row): DrawingSummary => ({
	id: row.id,
	name: row.name,
	createdAt: row.created_at,
	updatedAt: row.updated_at,
	hasPreview: row.has_preview === 1,
});

const SUMMARY_COLUMNS =
	"id, name, created_at, updated_at, preview IS NOT NULL AS has_preview";

const SCHEMA = `
	PRAGMA journal_mode = WAL;
	CREATE TABLE IF NOT EXISTS drawings (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		scene TEXT,
		preview BLOB,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL
	);
`;

/** Adds columns that databases created by earlier versions lack. */
function migrate(db: DatabaseSync) {
	const columns = db.prepare("PRAGMA table_info(drawings)").all();
	if (!columns.some((column) => column.name === "preview")) {
		db.exec("ALTER TABLE drawings ADD COLUMN preview BLOB");
	}
}

/** Opens the SQLite database at `file`, or an in-memory one for `":memory:"`. */
export function openDrawingStore(file: string) {
	const db = new DatabaseSync(file);
	db.exec(SCHEMA);
	migrate(db);

	const listStmt = db.prepare(
		`SELECT ${SUMMARY_COLUMNS} FROM drawings ORDER BY name COLLATE NOCASE`,
	);
	const getStmt = db.prepare(
		`SELECT ${SUMMARY_COLUMNS}, scene FROM drawings WHERE id = ?`,
	);
	const getPreviewStmt = db.prepare(
		"SELECT preview FROM drawings WHERE id = ?",
	);
	const setPreviewStmt = db.prepare(
		"UPDATE drawings SET preview = ?, updated_at = ? WHERE id = ?",
	);
	const insertStmt = db.prepare(
		"INSERT INTO drawings (id, name, scene, created_at, updated_at) VALUES (?, ?, NULL, ?, ?)",
	);
	const updateStmt = db.prepare(
		"UPDATE drawings SET name = COALESCE(?, name), scene = COALESCE(?, scene), updated_at = ? WHERE id = ?",
	);
	const deleteStmt = db.prepare("DELETE FROM drawings WHERE id = ?");

	const summaryIfChanged = (changes: number | bigint, id: string) =>
		changes === 0 ? undefined : toSummary(getStmt.get(id) as Row);

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
			return {
				id,
				name,
				scene: null,
				createdAt: now,
				updatedAt: now,
				hasPreview: false,
			};
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
			return summaryIfChanged(result.changes, id);
		},

		/** The PNG preview, or undefined if the drawing or its preview is missing. */
		getPreview(id: string): Uint8Array | undefined {
			const row = getPreviewStmt.get(id) as
				| { preview: Uint8Array | null }
				| undefined;
			return row?.preview ?? undefined;
		},

		/** Stores a PNG preview, or removes it for null. Counts as an update. */
		setPreview(
			id: string,
			preview: Uint8Array | null,
		): DrawingSummary | undefined {
			const result = setPreviewStmt.run(preview, new Date().toISOString(), id);
			return summaryIfChanged(result.changes, id);
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
