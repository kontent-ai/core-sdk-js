import { afterAll, describe, expect, it, vi } from "vitest";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { RetryStrategyOptions } from "../../../lib/models/core.models.js";
import { getFetchJsonMock } from "../../../lib/testkit/test.utils.js";
import { toRequiredRetryStrategyOptions } from "../../../lib/utils/retry.utils.js";

const testCases: readonly Required<RetryStrategyOptions>[] = [
	toRequiredRetryStrategyOptions({
		maxRetries: 0,
		getDelayBetweenRetriesMs: () => 0,
		logRetryAttempt: false,
		canRetryError: () => true,
	}),
	toRequiredRetryStrategyOptions({
		maxRetries: 1,
		getDelayBetweenRetriesMs: () => 0,
		logRetryAttempt: false,
		canRetryError: () => true,
	}),
	toRequiredRetryStrategyOptions({
		maxRetries: 2,
		getDelayBetweenRetriesMs: () => 0,
		logRetryAttempt: false,
		canRetryError: () => true,
	}),
	toRequiredRetryStrategyOptions({
		maxRetries: 5,
		getDelayBetweenRetriesMs: () => 0,
		logRetryAttempt: false,
		canRetryError: () => true,
	}),
];

describe("Retry policy - max retries", async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	for (const [maxRetries, retryStrategy] of Object.entries(testCases)) {
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

		it(`Should retry '${maxRetries}' times`, () => {
			expect(error?.retryAttempt).toStrictEqual(retryStrategy.maxRetries);
		});
	}
});
