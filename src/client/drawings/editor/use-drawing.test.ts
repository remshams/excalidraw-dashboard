import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Drawing } from "#shared/drawings.ts";
import * as api from "../api.ts";
import { useDrawing } from "./use-drawing.ts";

vi.mock("../api.ts");

const plan = (name = "Plan"): Drawing => ({
	id: "1",
	name,
	scene: null,
	createdAt: "",
	updatedAt: "",
	previewUpdatedAt: null,
	tagIds: [],
});

/** A load the test finishes by hand, to control when its response arrives. */
function slowLoad() {
	let finish: {
		load: (drawing: Drawing) => void;
		fail: (error: Error) => void;
	} = { load: () => {}, fail: () => {} };
	vi.mocked(api.getDrawing).mockImplementationOnce(
		() =>
			new Promise<Drawing>((resolve, reject) => {
				finish = { load: resolve, fail: reject };
			}),
	);
	return () => finish;
}

const pending = () =>
	vi.mocked(api.getDrawing).mockImplementationOnce(() => new Promise(() => {}));

const render = (id: string | null) => {
	const onError = vi.fn();
	const hook = renderHook(({ open }) => useDrawing(open, onError), {
		initialProps: { open: id },
	});
	return { ...hook, onError };
};

beforeEach(() => {
	vi.mocked(api.getDrawing).mockReset();
});

describe("useDrawing", () => {
	it("loads the drawing with the given ID", async () => {
		vi.mocked(api.getDrawing).mockResolvedValue(plan());

		const { result } = render("1");

		expect(result.current).toEqual({ drawing: null, failed: false });
		await vi.waitFor(() => expect(result.current.drawing).toEqual(plan()));
		expect(result.current.failed).toBe(false);
	});

	it("reports a failed load", async () => {
		const error = new Error("GET /drawings/1 failed with 404");
		vi.mocked(api.getDrawing).mockRejectedValue(error);

		const { result, onError } = render("1");

		await vi.waitFor(() => expect(result.current.failed).toBe(true));
		expect(result.current.drawing).toBeNull();
		expect(onError).toHaveBeenCalledExactlyOnceWith(error);
	});

	it("ignores a load that finishes after the drawing closed", async () => {
		const finish = slowLoad();
		const { result, rerender } = render("1");
		rerender({ open: null });
		pending();
		rerender({ open: "1" });

		await act(async () => finish().load(plan("Plan, before the last edits")));

		expect(result.current).toEqual({ drawing: null, failed: false });
	});

	it("ignores a failure that arrives after the drawing closed", async () => {
		const finish = slowLoad();
		const { result, rerender } = render("1");
		rerender({ open: null });
		pending();
		rerender({ open: "1" });

		await act(async () => finish().fail(new Error("offline")));

		expect(result.current).toEqual({ drawing: null, failed: false });
	});
});
