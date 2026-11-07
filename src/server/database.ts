import { DatabaseSync } from "node:sqlite";

type Migration = (db: DatabaseSync) => void;

/**
 * Migration 1 brings every database from before numbered migrations to the
 * same schema: a new one, one from before previews and one with previews.
 */
function createDrawings(db: DatabaseSync): void {
	db.exec(`
		CREATE TABLE IF NOT EXISTS drawings (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			scene TEXT,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			preview BLOB,
			preview_updated_at TEXT
		);
	`);
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

/** `label_key` is the label in lower case, so the database keeps labels unique when case is ignored. */
function createTags(db: DatabaseSync): void {
	db.exec(`
		CREATE TABLE tags (
			id TEXT PRIMARY KEY,
			label TEXT NOT NULL,
			label_key TEXT NOT NULL UNIQUE,
			color TEXT NOT NULL
		);
		CREATE TABLE drawing_tags (
			drawing_id TEXT NOT NULL REFERENCES drawings (id) ON DELETE CASCADE,
			tag_id TEXT NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
			PRIMARY KEY (drawing_id, tag_id)
		) WITHOUT ROWID;
		CREATE INDEX drawing_tags_tag_id ON drawing_tags (tag_id);
	`);
}

/** Migration n is at index n - 1. Append new ones; never change one that shipped. */
const MIGRATIONS: Migration[] = [createDrawings, createTags];

/** Runs `work` in a transaction and rolls it back if `work` throws. */
export function inTransaction<T>(db: DatabaseSync, work: () => T): T {
	db.exec("BEGIN");
	try {
		const result = work();
		db.exec("COMMIT");
		return result;
	} catch (error) {
		db.exec("ROLLBACK");
		throw error;
	}
}

const SQLITE_CONSTRAINT_FOREIGNKEY = 787;
const SQLITE_CONSTRAINT_UNIQUE = 2067;

const hasErrorCode = (error: unknown, code: number): boolean =>
	(error as { errcode?: unknown } | null)?.errcode === code;

/** True if a statement failed because a foreign key points nowhere. */
export const isForeignKeyError = (error: unknown): boolean =>
	hasErrorCode(error, SQLITE_CONSTRAINT_FOREIGNKEY);

/** True if a statement failed because a UNIQUE column already holds the value. */
export const isUniqueError = (error: unknown): boolean =>
	hasErrorCode(error, SQLITE_CONSTRAINT_UNIQUE);

function migrate(db: DatabaseSync): void {
	const { user_version: version } = db.prepare("PRAGMA user_version").get() as {
		user_version: number;
	};
	MIGRATIONS.slice(version).forEach((migration, index) => {
		inTransaction(db, () => {
			migration(db);
			db.exec(`PRAGMA user_version = ${version + index + 1}`);
		});
	});
}

/**
 * Opens the SQLite database at `file`, or an in-memory one for `":memory:"`,
 * and brings its schema up to date. See ADR 0002.
 */
export function openDatabase(file: string): DatabaseSync {
	// The cascades on drawing_tags need SQLite to enforce foreign keys.
	const db = new DatabaseSync(file, { enableForeignKeyConstraints: true });
	// WAL belongs to the file, not the schema, and can't change inside a transaction.
	db.exec("PRAGMA journal_mode = WAL");
	migrate(db);
	return db;
}
