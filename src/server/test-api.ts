import type { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach } from "vitest";
import type { Drawing } from "#shared/drawings.ts";
import type { Tag } from "#shared/tags.ts";
import { createApp } from "./app.ts";
import { openDatabase } from "./database.ts";
import { openDrawingStore } from "./drawing-store.ts";
import { openTagStore } from "./tag-store.ts";

// Helpers for the server tests, which call the API through `app.request`
// against an in-memory database.

let db: DatabaseSync;
let app: ReturnType<typeof createApp>;

/**
 * Gives each test of the file a fresh in-memory database and an app on it,
 * created with `options`, such as a client build to serve.
 */
export function setUpTestApi(options?: Parameters<typeof createApp>[1]): void {
	beforeEach(() => {
		db = openDatabase(":memory:");
		app = createApp(
			{ drawings: openDrawingStore(db), tags: openTagStore(db) },
			options,
		);
	});
	afterEach(() => db.close());
}

/** The test's database, to check what the API stored. */
export const testDb = (): DatabaseSync => db;

/** A raw request to the app, for bodies and headers `send` doesn't cover. */
export const request = (path: string, init?: RequestInit) =>
	app.request(path, init);

/** Sends a JSON request to the API; `path` is relative to `/api`. */
export const send = (method: string, path: string, body?: unknown) =>
	request(`/api${path}`, {
		method,
		headers: { "Content-Type": "application/json" },
		body: body === undefined ? undefined : JSON.stringify(body),
	});

/** Sends `body` unchanged as a JSON request, for bodies that aren't valid JSON. */
export const sendRaw = (method: string, path: string, body: string) =>
	request(`/api${path}`, {
		method,
		headers: { "Content-Type": "application/json" },
		body,
	});

export const create = async (name: string): Promise<Drawing> =>
	(await send("POST", "/drawings", { name })).json();

export const createTag = async (label: string, color = "blue"): Promise<Tag> =>
	(await send("POST", "/tags", { label, color })).json();

export const putTags = (id: string, tagIds: unknown) =>
	send("PUT", `/drawings/${id}/tags`, { tagIds });

export const tagIdsOf = async (id: string): Promise<string[]> =>
	((await (await send("GET", `/drawings/${id}`)).json()) as Drawing).tagIds;
