import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Tag } from "../../../../shared/tags.ts";
import * as api from "../../api.ts";
import { useTags } from "./use-tags.ts";

vi.mock("../../api.ts");

const tag = (label: string): Tag => ({ id: label, label, color: "blue" });

beforeEach(() => vi.resetAllMocks());

describe("useTags", () => {
	it("sorts the loaded tags by label, ignoring case and accents", async () => {
		vi.mocked(api.listTags).mockResolvedValue([
			tag("apple"),
			tag("Work"),
			tag("Ärger"),
			tag("Zoo"),
			tag("banana"),
		]);

		const { result } = renderHook(() => useTags(vi.fn()));

		await waitFor(() => expect(result.current.tags).toHaveLength(5));
		expect(result.current.tags?.map(({ label }) => label)).toEqual([
			"apple",
			"Ärger",
			"banana",
			"Work",
			"Zoo",
		]);
	});

	it("reports a failed load and has no list", async () => {
		const failure = new Error("offline");
		vi.mocked(api.listTags).mockRejectedValue(failure);
		const onError = vi.fn();

		const { result } = renderHook(() => useTags(onError));

		await waitFor(() => expect(onError).toHaveBeenCalledWith(failure));
		expect(result.current.tags).toBeNull();
	});
});
