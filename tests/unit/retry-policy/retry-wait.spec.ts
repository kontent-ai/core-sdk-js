import { describe, expect, it } from "vitest";
import { waitBeforeNextRetry } from "../../../lib/utils/retry.utils.js";

describe("Retry wait", () => {
	it("Should wait before the next retry with no abort signal", async () => {
		const start = performance.now();
		const retryInMs = 200;

		const { isAborted } = await waitBeforeNextRetry({ retryInMs });

		const duration = Math.round(performance.now() - start);

		expect(duration).toBeGreaterThanOrEqual(retryInMs);
		expect(isAborted).toBe(false);
	});

	it("Should not wait before the next retry with abort signal", async () => {
		const abortController = new AbortController();
		const start = performance.now();
		const retryInMs = 200;
		const abortAfterMs = 50;
		const expectedDurationMin = abortAfterMs;

		// some leeway for the test to pass
		const expectedDurationMax = abortAfterMs * 2;

		const [{ isAborted }] = await Promise.all([
			waitBeforeNextRetry({ retryInMs, abortSignal: abortController.signal }),
			new Promise((resolve) => {
				setTimeout(() => {
					abortController.abort();
					resolve(true);
				}, abortAfterMs);
			}),
		]);

		const duration = Math.round(performance.now() - start);

		expect(isAborted).toBe(true);
		expect(duration).toBeGreaterThanOrEqual(expectedDurationMin);
		expect(duration).toBeLessThanOrEqual(expectedDurationMax);
	});
});
