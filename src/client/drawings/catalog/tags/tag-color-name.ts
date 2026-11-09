import type { TagColor } from "#shared/tags.ts";

/** A colour as a user reads it, such as "Blue". */
export const tagColorName = (color: TagColor): string =>
	color[0].toUpperCase() + color.slice(1);
