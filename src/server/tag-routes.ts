import { type Context, Hono } from "hono";
import {
	isTagColor,
	MAX_TAG_LABEL_LENGTH,
	type TagRequest,
	tagLabelProblem,
} from "../shared/tags.ts";
import { type Invalid, readJson } from "./request.ts";
import type { TagStore } from "./tag-store.ts";

const LABEL_PROBLEMS = {
	empty: "A tag needs a label",
	"too-long": `A tag label has at most ${MAX_TAG_LABEL_LENGTH} characters`,
};

/** The tag from a POST or PUT body, with a trimmed label, or why it is invalid. */
function parseTagRequest(body: unknown): TagRequest | Invalid {
	const { label, color } = (body ?? {}) as Partial<Record<string, unknown>>;
	if (typeof label !== "string") {
		return { invalid: "Send the tag as JSON with a label and a color" };
	}
	const problem = tagLabelProblem(label);
	if (problem) return { invalid: LABEL_PROBLEMS[problem] };
	if (!isTagColor(color)) return { invalid: "Unknown tag colour" };
	return { label: label.trim(), color };
}

const labelTaken = (c: Context, { label }: TagRequest) =>
	c.text(`A tag named "${label}" already exists`, 409);

/** The HTTP routes of the tag aggregate, mounted at `/api/tags`. */
export function tagRoutes(tags: TagStore) {
	return new Hono()
		.get("/", (c) => c.json(tags.list()))
		.post("/", async (c) => {
			const request = parseTagRequest(await readJson(c));
			if ("invalid" in request) return c.text(request.invalid, 400);
			const tag = tags.create(request);
			return tag === "label-taken" ? labelTaken(c, request) : c.json(tag, 201);
		})
		.put("/:id", async (c) => {
			const request = parseTagRequest(await readJson(c));
			if ("invalid" in request) return c.text(request.invalid, 400);
			const tag = tags.update(c.req.param("id"), request);
			if (tag === "label-taken") return labelTaken(c, request);
			return tag ? c.json(tag) : c.notFound();
		})
		.delete("/:id", (c) =>
			tags.delete(c.req.param("id")) ? c.body(null, 204) : c.notFound(),
		);
}
