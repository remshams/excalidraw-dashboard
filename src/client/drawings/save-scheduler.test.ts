import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSaveScheduler } from "./save-scheduler.ts";

describe("createSaveScheduler", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it("saves the latest scene once the delay passes without changes", () => {
		const save = vi.fn();
		const scheduler = createSaveScheduler(save, 1000, null);

		scheduler.schedule("a");
		vi.advanceTimersByTime(999);
		scheduler.schedule("b");
		vi.advanceTimersByTime(999);
		expect(save).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1);
		expect(save).toHaveBeenCalledExactlyOnceWith("b");
	});

	it("skips a scene equal to the stored one", () => {
		const save = vi.fn();
		const scheduler = createSaveScheduler(save, 1000, "stored");

		scheduler.schedule("stored");
		vi.runAllTimers();

		expect(save).not.toHaveBeenCalled();
	});

	it("skips a scene equal to the last saved one", () => {
		const save = vi.fn();
		const scheduler = createSaveScheduler(save, 1000, null);

		scheduler.schedule("a");
		vi.runAllTimers();
		scheduler.schedule("a");
		vi.runAllTimers();

		expect(save).toHaveBeenCalledOnce();
	});

	it("saves a pending scene immediately on flush", () => {
		const save = vi.fn();
		const scheduler = createSaveScheduler(save, 1000, null);

		scheduler.schedule("a");
		scheduler.flush();
		vi.runAllTimers();

		expect(save).toHaveBeenCalledExactlyOnceWith("a");
	});

	it("does nothing on flush without a pending scene", () => {
		const save = vi.fn();

		createSaveScheduler(save, 1000, null).flush();

		expect(save).not.toHaveBeenCalled();
	});
});
