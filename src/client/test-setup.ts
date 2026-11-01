import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom has no matchMedia. Components see a light system unless a test stubs it.
window.matchMedia = (query: string) =>
	({
		matches: false,
		media: query,
		addEventListener: () => {},
		removeEventListener: () => {},
	}) as unknown as MediaQueryList;

afterEach(cleanup);
