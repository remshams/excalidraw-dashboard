import type { Context } from "hono";

/** Why a request body was refused, as the text of a 400 response. */
export type Invalid = { invalid: string };

/** The JSON body, or undefined if it isn't valid JSON. */
export const readJson = (c: Context): Promise<unknown> =>
	c.req.json().catch(() => undefined);
