import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOpenDrawingId } from "./use-open-drawing-id.ts";

const goTo = (url: string) => window.history.replaceState(null, "", url);
const historyLength = () => window.history.length;

beforeEach(() => goTo("/"));
afterEach(() => vi.restoreAllMocks());

describe("useOpenDrawingId", () => {
	it("has no open drawing at /", () => {
		const { result } = renderHook(() => useOpenDrawingId());

		expect(result.current[0]).toBeNull();
	});

	it("reads the open drawing from its path", () => {
		goTo("/drawings/abc");

		const { result } = renderHook(() => useOpenDrawingId());

		expect(result.current[0]).toBe("abc");
	});

	it.each(["/drawings/", "/drawings/abc/extra", "/other", "/drawings/%E0"])(
		"has no open drawing at %s",
		(path) => {
			goTo(path);

			const { result } = renderHook(() => useOpenDrawingId());

			expect(result.current[0]).toBeNull();
		},
	);

	it("opens a drawing with a new history entry", () => {
		const { result } = renderHook(() => useOpenDrawingId());
		const before = historyLength();

		act(() => result.current[1]("abc"));

		expect(result.current[0]).toBe("abc");
		expect(window.location.pathname).toBe("/drawings/abc");
		expect(historyLength()).toBe(before + 1);
	});

	it("closes the drawing by going to /", () => {
		goTo("/drawings/abc");
		const { result } = renderHook(() => useOpenDrawingId());

		act(() => result.current[1](null));

		expect(result.current[0]).toBeNull();
		expect(window.location.pathname).toBe("/");
	});

	it("adds no history entry for the drawing that is already open", () => {
		goTo("/drawings/abc");
		const { result } = renderHook(() => useOpenDrawingId());
		const before = historyLength();

		act(() => result.current[1]("abc"));

		expect(historyLength()).toBe(before);
	});

	it("encodes and decodes the ID in the path", () => {
		const { result } = renderHook(() => useOpenDrawingId());

		act(() => result.current[1]("a b/c"));

		expect(window.location.pathname).toBe("/drawings/a%20b%2Fc");
		expect(renderHook(() => useOpenDrawingId()).result.current[0]).toBe(
			"a b/c",
		);
	});

	it("follows the back and forward buttons", () => {
		const { result } = renderHook(() => useOpenDrawingId());

		act(() => {
			goTo("/drawings/abc");
			window.dispatchEvent(new PopStateEvent("popstate"));
		});

		expect(result.current[0]).toBe("abc");
	});

	it("turns an old #<id> link into the drawing's path", () => {
		goTo("/#abc");
		const before = historyLength();

		const { result } = renderHook(() => useOpenDrawingId());

		expect(result.current[0]).toBe("abc");
		expect(window.location.pathname).toBe("/drawings/abc");
		expect(window.location.hash).toBe("");
		expect(historyLength()).toBe(before);
	});

	it("turns an old #<id> entry reached through the history into its path", () => {
		const { result } = renderHook(() => useOpenDrawingId());

		act(() => {
			goTo("/#abc");
			window.dispatchEvent(new PopStateEvent("popstate"));
		});

		expect(result.current[0]).toBe("abc");
		expect(window.location.pathname).toBe("/drawings/abc");
	});

	it("leaves a hash on another path alone", () => {
		goTo("/drawings/abc#note");

		const { result } = renderHook(() => useOpenDrawingId());

		expect(result.current[0]).toBe("abc");
		expect(window.location.hash).toBe("#note");
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
});
