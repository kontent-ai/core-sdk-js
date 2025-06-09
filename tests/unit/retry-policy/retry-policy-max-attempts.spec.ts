import { afterAll, describe, expect, it, vi } from "vitest";
import { getFetchJsonMock } from "../../../lib/devkit/test.utils.js";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { RetryStrategyOptions } from "../../../lib/models/core.models.js";
import { toRequiredRetryStrategyOptions } from "../../../lib/utils/retry.utils.js";

const testCases: readonly Required<RetryStrategyOptions>[] = [
	toRequiredRetryStrategyOptions({
		maxAttempts: 0,
		defaultDelayBetweenRequestsMs: 0,
		logRetryAttempt: false,
		canRetryError: () => true,
	}),
	toRequiredRetryStrategyOptions({
		maxAttempts: 1,
		defaultDelayBetweenRequestsMs: 0,
		logRetryAttempt: false,
		canRetryError: () => true,
	}),
	toRequiredRetryStrategyOptions({
		maxAttempts: 2,
		defaultDelayBetweenRequestsMs: 0,
		logRetryAttempt: false,
		canRetryError: () => true,
	}),
	toRequiredRetryStrategyOptions({
		maxAttempts: 5,
		defaultDelayBetweenRequestsMs: 0,
		logRetryAttempt: false,
		canRetryError: () => true,
	}),
];

describe("Retry policy - max attempts", async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	for (const [maxAttempts, retryStrategy] of Object.entries(testCases)) {
		global.fetch = getFetchJsonMock({
			json: {},
			status: 500,
		});

		const { success, error } = await getDefaultHttpService({
			retryStrategy,
		}).requestAsync({
			// we need valid url
			url: "https://domain.com",
			method: "GET",
			body: null,
		});

		it("Success should be false", () => {
			expect(success).toBe(false);
		});

		it("Error should be defined", () => {
			expect(error).toBeDefined();
		});

		it(`Should retry '${maxAttempts}' times`, () => {
			expect(error?.retryAttempt).toStrictEqual(retryStrategy.maxAttempts);
		});
	}
});
