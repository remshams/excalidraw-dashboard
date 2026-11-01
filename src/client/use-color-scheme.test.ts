import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useColorScheme } from "./use-color-scheme.ts";

/** A system setting the test can change, behind `window.matchMedia`. */
function fakeSystemScheme(initial: "light" | "dark") {
	let dark = initial === "dark";
	const listeners = new Set<() => void>();
	vi.stubGlobal("matchMedia", (query: string) => ({
		get matches() {
			return query === "(prefers-color-scheme: dark)" && dark;
		},
		addEventListener: (_type: "change", listener: () => void) =>
			listeners.add(listener),
		removeEventListener: (_type: "change", listener: () => void) =>
			listeners.delete(listener),
	}));
	return {
		listeners,
		change(scheme: "light" | "dark") {
			dark = scheme === "dark";
			for (const listener of listeners) listener();
		},
	};
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("useColorScheme", () => {
	it("returns light when the system is light", () => {
		fakeSystemScheme("light");
		const { result } = renderHook(() => useColorScheme());
		expect(result.current).toBe("light");
	});

	it("returns dark when the system is dark", () => {
		fakeSystemScheme("dark");
		const { result } = renderHook(() => useColorScheme());
		expect(result.current).toBe("dark");
	});

	it("follows the system when it changes", () => {
		const system = fakeSystemScheme("light");
		const { result } = renderHook(() => useColorScheme());

		act(() => system.change("dark"));
		expect(result.current).toBe("dark");

		act(() => system.change("light"));
		expect(result.current).toBe("light");
	});

	it("stops listening when unmounted", () => {
		const system = fakeSystemScheme("light");
		const { unmount } = renderHook(() => useColorScheme());
		expect(system.listeners.size).toBe(1);

		unmount();
		expect(system.listeners.size).toBe(0);
	});
});
