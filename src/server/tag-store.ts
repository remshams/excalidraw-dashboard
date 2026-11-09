import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { type Tag, type TagRequest, tagLabelKey } from "#shared/tags.ts";
import { isUniqueError } from "./database.ts";

/**
 * The repository of the tag aggregate. It checks that labels are unique when
 * case is ignored. Callers check the label and colour rules first and pass a
 * trimmed label. `db` must come from `openDatabase`.
 */
export function openTagStore(db: DatabaseSync) {
	const listStmt = db.prepare(
		"SELECT id, label, color FROM tags ORDER BY label_key",
	);
	const insertStmt = db.prepare(
		"INSERT INTO tags (id, label, label_key, color) VALUES (?, ?, ?, ?)",
	);
	const updateStmt = db.prepare(
		"UPDATE tags SET label = ?, label_key = ?, color = ? WHERE id = ?",
	);
	const deleteStmt = db.prepare("DELETE FROM tags WHERE id = ?");

	/** Runs a write and turns a taken label into "label-taken". */
	const unlessLabelTaken = <T>(write: () => T): T | "label-taken" => {
		try {
			return write();
		} catch (error) {
			if (isUniqueError(error)) return "label-taken";
			throw error;
		}
	};

	return {
		/** Every tag, sorted by label with case ignored. */
		list(): Tag[] {
			return listStmt.all() as Tag[];
		},

		create({ label, color }: TagRequest): Tag | "label-taken" {
			const tag = { id: randomUUID(), label, color };
			return unlessLabelTaken(() => {
				insertStmt.run(tag.id, label, tagLabelKey(label), color);
				return tag;
			});
		},

		/** Returns undefined for an unknown tag. */
		update(
			id: string,
			{ label, color }: TagRequest,
		): Tag | undefined | "label-taken" {
			const tag = { id, label, color };
			return unlessLabelTaken(() =>
				updateStmt.run(label, tagLabelKey(label), color, id).changes === 0
					? undefined
					: tag,
			);
		},

		/** Deletes the tag; the database removes it from every drawing. */
		delete(id: string): boolean {
			return deleteStmt.run(id).changes > 0;
		},
	};
}

export type TagStore = ReturnType<typeof openTagStore>;
