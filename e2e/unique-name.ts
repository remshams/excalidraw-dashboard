import { randomUUID } from "node:crypto";

/**
 * The tests share one database, so every drawing and tag gets a name no other
 * test uses. The result stays far below the 30 characters a tag label may have.
 */
export function uniqueName(base: string): string {
	return `${base} ${randomUUID().slice(0, 8)}`;
}
