import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NEW_SCRATCHPAD, useOpenDrawingId } from "./use-open-drawing-id.ts";

const goTo = (url: string) => window.history.replaceState(null, "", url);
const historyLength = () => window.history.length;

beforeEach(() => goTo("/"));
afterEach(() => vi.restoreAllMocks());

describe("useOpenDrawingId", () => {
	it("has no open drawing at /", () => {
		const { result } = renderHook(() => useOpenDrawingId());

		expect(result.current.openId).toBeNull();
	});

	it("reads the open drawing from its path", () => {
		goTo("/drawings/abc");

		const { result } = renderHook(() => useOpenDrawingId());

		expect(result.current.openId).toBe("abc");
	});

	it.each(["/drawings/", "/drawings/abc/extra", "/other", "/drawings/%E0"])(
		"has no open drawing at %s",
		(path) => {
			goTo(path);

			const { result } = renderHook(() => useOpenDrawingId());

			expect(result.current.openId).toBeNull();
		},
	);

	it("opens a drawing with a new history entry", () => {
		const { result } = renderHook(() => useOpenDrawingId());
		const before = historyLength();

		act(() => result.current.openDrawing("abc"));

		expect(result.current.openId).toBe("abc");
		expect(window.location.pathname).toBe("/drawings/abc");
		expect(historyLength()).toBe(before + 1);
	});

	it("closes the drawing by going to /", () => {
		goTo("/drawings/abc");
		const { result } = renderHook(() => useOpenDrawingId());

		act(() => result.current.openDrawing(null));

		expect(result.current.openId).toBeNull();
		expect(window.location.pathname).toBe("/");
	});

	it("adds no history entry for the drawing that is already open", () => {
		goTo("/drawings/abc");
		const { result } = renderHook(() => useOpenDrawingId());
		const before = historyLength();

		act(() => result.current.openDrawing("abc"));

		expect(historyLength()).toBe(before);
	});

	it("encodes and decodes the ID in the path", () => {
		const { result } = renderHook(() => useOpenDrawingId());

		act(() => result.current.openDrawing("a b/c"));

		expect(window.location.pathname).toBe("/drawings/a%20b%2Fc");
		expect(renderHook(() => useOpenDrawingId()).result.current.openId).toBe(
			"a b/c",
		);
	});

	it("follows the back and forward buttons", () => {
		const { result } = renderHook(() => useOpenDrawingId());

		act(() => {
			goTo("/drawings/abc");
			window.dispatchEvent(new PopStateEvent("popstate"));
		});

		expect(result.current.openId).toBe("abc");
	});

	it("stops following the history once unmounted", () => {
		const add = vi.spyOn(window, "addEventListener");
		const remove = vi.spyOn(window, "removeEventListener");
		const { unmount } = renderHook(() => useOpenDrawingId());
		const listener = add.mock.calls.find(([type]) => type === "popstate")?.[1];

		unmount();

		expect(listener).toBeDefined();
		expect(remove).toHaveBeenCalledWith("popstate", listener);
	});

	describe("a new scratchpad", () => {
		const uuid =
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

		it("opens at /drawings/new with an ID of its own", () => {
			const { result } = renderHook(() => useOpenDrawingId());

			act(() => result.current.openDrawing(NEW_SCRATCHPAD));

			expect(window.location.pathname).toBe("/drawings/new");
			expect(result.current.openId).toMatch(uuid);
			expect(result.current.isNew).toBe(true);
		});

		it("starts at /drawings/new after a reload", () => {
			goTo("/drawings/new");

			const { result } = renderHook(() => useOpenDrawingId());

			expect(result.current.openId).toMatch(uuid);
			expect(result.current.isNew).toBe(true);
		});

		it("gets a different ID each time", () => {
			const { result } = renderHook(() => useOpenDrawingId());

			act(() => result.current.openDrawing(NEW_SCRATCHPAD));
			const first = result.current.openId;
			act(() => result.current.openDrawing(null));
			act(() => result.current.openDrawing(NEW_SCRATCHPAD));

			expect(result.current.openId).not.toBe(first);
		});

		it("takes its own path in place of /drawings/new once stored", () => {
			const { result } = renderHook(() => useOpenDrawingId());
			act(() => result.current.openDrawing(NEW_SCRATCHPAD));
			const id = result.current.openId ?? "";
			const before = historyLength();

			act(() => result.current.markStored(id));

			expect(window.location.pathname).toBe(`/drawings/${id}`);
			expect(historyLength()).toBe(before);
			// The editor stays on the scratchpad it started.
			expect(result.current.openId).toBe(id);
			expect(result.current.isNew).toBe(true);
		});

		it("leaves the path alone for a drawing that isn't the new one", () => {
			goTo("/drawings/abc");
			const { result } = renderHook(() => useOpenDrawingId());

			act(() => result.current.markStored("abc"));
			act(() => result.current.markStored("other"));

			expect(window.location.pathname).toBe("/drawings/abc");
			expect(result.current.isNew).toBe(false);
		});

		it("leaves the path of the next new scratchpad alone when the last one is stored late", () => {
			const { result } = renderHook(() => useOpenDrawingId());
			act(() => result.current.openDrawing(NEW_SCRATCHPAD));
			// What the closed editor holds on to until its first save answers.
			const markEarlier = result.current.markStored;
			const earlier = result.current.openId ?? "";
			act(() => result.current.openDrawing(null));
			act(() => result.current.openDrawing(NEW_SCRATCHPAD));

			act(() => markEarlier(earlier));

			expect(window.location.pathname).toBe("/drawings/new");
		});

		it("leaves the path alone once the user has left the scratchpad", () => {
			const { result } = renderHook(() => useOpenDrawingId());
			act(() => result.current.openDrawing(NEW_SCRATCHPAD));
			const id = result.current.openId ?? "";
			act(() => result.current.openDrawing(null));

			act(() => result.current.markStored(id));

			expect(window.location.pathname).toBe("/");
		});
	});
});
