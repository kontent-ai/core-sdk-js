import { afterEach, describe, expect, it, vi } from "vitest";
import { isBlob, sleep } from "../../../lib/utils/core.utils.js";

describe("isBlob", () => {
	it("Should return false for null", () => {
		expect(isBlob(null)).toBe(false);
	});

	it("Should return false for a plain object that does not resemble a Blob", () => {
		expect(isBlob({ name: "file.txt" })).toBe(false);
	});

	it("Should return true for a real Blob instance", () => {
		expect(isBlob(new Blob(["content"], { type: "text/plain" }))).toBe(true);
	});

	it("Should return true for a duck-typed object with arrayBuffer function and numeric size", () => {
		const blobLike = {
			arrayBuffer: async () => await Promise.resolve(new ArrayBuffer(0)),
			size: 0,
		};

		expect(isBlob(blobLike)).toBe(true);
	});
});

describe("sleep", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("Should resolve after the given time when no abort signal is provided", async () => {
		vi.useFakeTimers();
		const onResolved = vi.fn();

		const sleepPromise = sleep(1000).then(onResolved);

		await vi.advanceTimersByTimeAsync(999);
		expect(onResolved).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		await sleepPromise;
		expect(onResolved).toHaveBeenCalledOnce();
	});

	it("Should resolve immediately without scheduling a timer when the signal is already aborted", async () => {
		vi.useFakeTimers();
		const abortController = new AbortController();
		abortController.abort();

		await sleep(1000, abortController.signal);

		expect(vi.getTimerCount()).toBe(0);
	});

	it("Should resolve and clear the timer when aborted during the sleep", async () => {
		vi.useFakeTimers();
		const abortController = new AbortController();

		const sleepPromise = sleep(60_000, abortController.signal);
		expect(vi.getTimerCount()).toBe(1);

		abortController.abort();
		await sleepPromise;

		expect(vi.getTimerCount()).toBe(0);
	});

	it("Should remove the abort listener once the sleep completes", async () => {
		vi.useFakeTimers();
		const abortController = new AbortController();
		const removeEventListenerSpy = vi.spyOn(abortController.signal, "removeEventListener" satisfies keyof AbortSignal);

		const sleepPromise = sleep(1000, abortController.signal);
		await vi.advanceTimersByTimeAsync(1000);
		await sleepPromise;

		expect(removeEventListenerSpy).toHaveBeenCalledOnce();
	});
});
