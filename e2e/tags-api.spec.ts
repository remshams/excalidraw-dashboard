import { expect, test } from "@playwright/test";
import {
	assignTagsThroughApi,
	createDrawingThroughApi,
	storedSummary,
} from "./drawings-api.ts";
import {
	changeTagThroughApi,
	createTagThroughApi,
	deleteTagThroughApi,
	storedTag,
} from "./tags-api.ts";
import { uniqueName } from "./unique-name.ts";

test("create, rename and delete a tag", async ({ request }) => {
	const label = uniqueName("Work");
	const renamed = uniqueName("Job");
	let id = "";

	await test.step(`create a blue tag named ${label}`, async () => {
		id = await createTagThroughApi(request, label, "blue");
	});

	await test.step(`the tag list has ${label}`, async () => {
		expect(await storedTag(request, id)).toEqual({ id, label, color: "blue" });
	});

	await test.step(`rename the tag to ${renamed} and make it red`, async () => {
		await changeTagThroughApi(request, id, renamed, "red");
		expect(await storedTag(request, id)).toEqual({
			id,
			label: renamed,
			color: "red",
		});
	});

	await test.step("delete the tag", async () => {
		await deleteTagThroughApi(request, id);
		expect(await storedTag(request, id)).toBeUndefined();
	});
});

test("assign tags to a drawing", async ({ request }) => {
	const name = uniqueName("Plan");
	let drawingId = "";
	let tagIds: string[] = [];
	let updatedAt = "";

	await test.step(`a drawing named ${name} and two tags exist`, async () => {
		drawingId = await createDrawingThroughApi(request, name);
		tagIds = [
			await createTagThroughApi(request, uniqueName("Work")),
			await createTagThroughApi(request, uniqueName("Draft"), "orange"),
		];
		updatedAt = (await storedSummary(request, drawingId))?.updatedAt ?? "";
	});

	await test.step(`give ${name} both tags`, async () => {
		await assignTagsThroughApi(request, drawingId, tagIds);
	});

	await test.step(`${name} lists both tags and wasn't edited`, async () => {
		expect(await storedSummary(request, drawingId)).toMatchObject({
			tagIds: [...tagIds].sort(),
			updatedAt,
		});
	});

	await test.step("delete one tag", async () => {
		await deleteTagThroughApi(request, tagIds[0]);
	});

	await test.step(`${name} keeps only the other tag`, async () => {
		expect((await storedSummary(request, drawingId))?.tagIds).toEqual([
			tagIds[1],
		]);
	});
});
