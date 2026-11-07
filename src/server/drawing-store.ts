import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import type { Drawing, DrawingSummary } from "../shared/drawings.ts";

type Row = {
	id: string;
	name: string;
	scene: string | null;
	created_at: string;
	updated_at: string;
	preview_updated_at: string | null;
};

const toSummary = (row: Row): DrawingSummary => ({
	id: row.id,
	name: row.name,
	createdAt: row.created_at,
	updatedAt: row.updated_at,
	previewUpdatedAt: row.preview_updated_at,
});

// Every query but the preview's own names its columns, so the blob is read only
// when a client asks for the image.
const SUMMARY_COLUMNS = "id, name, created_at, updated_at, preview_updated_at";

const SCHEMA = `
	PRAGMA journal_mode = WAL;
	CREATE TABLE IF NOT EXISTS drawings (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		scene TEXT,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL,
		preview BLOB,
		preview_updated_at TEXT
	);
`;

/**
 * Adds the columns that databases created before previews lack. Safe to run on
 * every start. Switch to numbered migrations with `PRAGMA user_version` once a
 * second schema change comes along; this becomes migration 1.
 */
function addMissingColumns(db: DatabaseSync): void {
	const columns = new Set(
		db
			.prepare("PRAGMA table_info(drawings)")
			.all()
			.map((column) => column.name),
	);
	for (const [name, type] of [
		["preview", "BLOB"],
		["preview_updated_at", "TEXT"],
	]) {
		if (!columns.has(name)) {
			db.exec(`ALTER TABLE drawings ADD COLUMN ${name} ${type}`);
		}
	}
}

/** Opens the SQLite database at `file`, or an in-memory one for `":memory:"`. */
export function openDrawingStore(file: string) {
	const db = new DatabaseSync(file);
	db.exec(SCHEMA);
	addMissingColumns(db);

	const listStmt = db.prepare(
		`SELECT ${SUMMARY_COLUMNS} FROM drawings ORDER BY name COLLATE NOCASE`,
	);
	const getStmt = db.prepare(
		`SELECT ${SUMMARY_COLUMNS}, scene FROM drawings WHERE id = ?`,
	);
	const insertStmt = db.prepare(
		"INSERT INTO drawings (id, name, scene, created_at, updated_at) VALUES (?, ?, NULL, ?, ?)",
	);
	const updateStmt = db.prepare(
		"UPDATE drawings SET name = COALESCE(?, name), scene = COALESCE(?, scene), updated_at = ? WHERE id = ?",
	);
	const deleteStmt = db.prepare("DELETE FROM drawings WHERE id = ?");
	const getPreviewStmt = db.prepare(
		"SELECT preview FROM drawings WHERE id = ?",
	);
	const setPreviewStmt = db.prepare(
		"UPDATE drawings SET preview = ?, preview_updated_at = ? WHERE id = ?",
	);

	const summary = (id: string): DrawingSummary =>
		toSummary(getStmt.get(id) as Row);

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
				previewUpdatedAt: null,
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
			return result.changes === 0 ? undefined : summary(id);
		},

		/** The PNG preview, or undefined if the drawing or its preview is missing. */
		getPreview(id: string): Uint8Array | undefined {
			const row = getPreviewStmt.get(id) as
				| { preview: Uint8Array | null }
				| undefined;
			return row?.preview ?? undefined;
		},

		/**
		 * Stores a PNG preview, or removes it for null. Changes `previewUpdatedAt`,
		 * not `updatedAt`: a new preview is not an edit of the drawing.
		 */
		setPreview(
			id: string,
			preview: Uint8Array | null,
		): DrawingSummary | undefined {
			const result = setPreviewStmt.run(
				preview,
				preview ? new Date().toISOString() : null,
				id,
			);
			return result.changes === 0 ? undefined : summary(id);
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
