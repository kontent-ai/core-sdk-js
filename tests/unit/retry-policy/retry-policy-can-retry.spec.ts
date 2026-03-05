import { describe, expect, it } from "vitest";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { RetryStrategyOptions } from "../../../lib/models/core.models.js";
import { resolveDefaultRetryStrategyOptions } from "../../../lib/utils/retry.utils.js";

type TestCase = RetryStrategyOptions & {
	readonly title: string;
	readonly expectedRetries: number;
};

const testCases: readonly TestCase[] = [
	{
		title: "By default unhandled errors are not retried even if max retries is > 0",
		canRetryUnhandledError: resolveDefaultRetryStrategyOptions({}).canRetryUnhandledError,
		maxRetries: 5,
		expectedRetries: 0,
	},
	{
		title: `Can't retry if canRetryUnhandledError returns false`,
		canRetryUnhandledError: () => false,
		maxRetries: 5,
		expectedRetries: 0,
	},
	{
		title: "Can retry when unhandled errors are set to be retried via custom callback",
		canRetryUnhandledError: () => true,
		maxRetries: 1,
		expectedRetries: 1,
	},
	{
		title: "Can retry, but should not retry because max retries is 0",
		expectedRetries: 0,
		maxRetries: 0,
		canRetryUnhandledError: () => true,
	},
	{
		title: "Should retry 2 times",
		expectedRetries: 2,
		maxRetries: 2,
		canRetryUnhandledError: () => true,
	},
	{
		title: "Should retry 5 times",
		expectedRetries: 5,
		maxRetries: 5,
		canRetryUnhandledError: () => true,
	},
];

for (const testCase of testCases) {
	describe(testCase.title, async () => {
		const { success, error } = await getDefaultHttpService({
			retryStrategy: testCase,
			adapter: {
				executeRequestAsync: () => {
					throw new Error("Testing unhandled error");
				},
			},
		}).requestAsync({
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

		it(`Should retry '${testCase.expectedRetries}' times`, () => {
			expect(error?.retryAttempt).toBe(testCase.expectedRetries);
		});
	});
}
