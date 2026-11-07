import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { Drawing, DrawingSummary } from "../shared/drawings.ts";
import { inTransaction, isForeignKeyError } from "./database.ts";

type Row = {
	id: string;
	name: string;
	scene: string | null;
	created_at: string;
	updated_at: string;
	preview_updated_at: string | null;
	/** A JSON array of the drawing's tag IDs. */
	tag_ids: string;
};

const toSummary = (row: Row): DrawingSummary => ({
	id: row.id,
	name: row.name,
	createdAt: row.created_at,
	updatedAt: row.updated_at,
	previewUpdatedAt: row.preview_updated_at,
	tagIds: JSON.parse(row.tag_ids),
});

// Every query but the preview's own names its columns, so the blob is read only
// when a client asks for the image.
const SUMMARY_COLUMNS = `id, name, created_at, updated_at, preview_updated_at,
	(SELECT json_group_array(tag_id) FROM (
		SELECT tag_id FROM drawing_tags WHERE drawing_id = drawings.id ORDER BY tag_id
	)) AS tag_ids`;

/**
 * The repository of the drawing aggregate: drawings with their scene, preview
 * and set of tag IDs. `db` must come from `openDatabase`.
 */
export function openDrawingStore(db: DatabaseSync) {
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
	const clearTagsStmt = db.prepare(
		"DELETE FROM drawing_tags WHERE drawing_id = ?",
	);
	const addTagStmt = db.prepare(
		"INSERT OR IGNORE INTO drawing_tags (drawing_id, tag_id) VALUES (?, ?)",
	);

	const summary = (id: string): DrawingSummary | undefined => {
		const row = getStmt.get(id) as Row | undefined;
		return row && toSummary(row);
	};

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
				tagIds: [],
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

		/**
		 * Replaces the drawing's set of tags. Leaves `updatedAt` alone, as a new
		 * preview does. Returns undefined for an unknown drawing and
		 * "unknown-tag" if a tag ID names no tag; either way nothing changes.
		 */
		setTags(
			id: string,
			tagIds: string[],
		): DrawingSummary | undefined | "unknown-tag" {
			if (!summary(id)) return undefined;
			try {
				inTransaction(db, () => {
					clearTagsStmt.run(id);
					for (const tagId of tagIds) addTagStmt.run(id, tagId);
				});
			} catch (error) {
				if (isForeignKeyError(error)) return "unknown-tag";
				throw error;
			}
			return summary(id);
		},

		/** Deletes the drawing; the database removes its tag assignments with it. */
		delete(id: string): boolean {
			return deleteStmt.run(id).changes > 0;
		},
	};
}

export type DrawingStore = ReturnType<typeof openDrawingStore>;
