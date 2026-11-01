import { useSyncExternalStore } from "react";

const DARK = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void): () => void {
	const query = window.matchMedia(DARK);
	query.addEventListener("change", onChange);
	return () => query.removeEventListener("change", onChange);
}

function currentScheme(): "light" | "dark" {
	return window.matchMedia(DARK).matches ? "dark" : "light";
}

/** The operating system's color scheme, updated when the user changes it. */
export function useColorScheme(): "light" | "dark" {
	return useSyncExternalStore(subscribe, currentScheme);
}
