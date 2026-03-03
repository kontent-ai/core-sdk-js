import { describe, expect, it } from "vitest";
import type { RetryStrategyOptions } from "../../../lib/models/core.models.js";
import type { FetchResponse } from "../../../lib/testkit/testkit.models.js";
import { getTestHttpServiceWithJsonResponse } from "../../../lib/testkit/testkit.utils.js";
import { resolveDefaultRetryStrategyOptions } from "../../../lib/utils/retry.utils.js";

type TestCase = RetryStrategyOptions & {
	readonly title: string;
	readonly expectedRetries: number;
	readonly fetchResponse: FetchResponse;
};

const testCases: readonly TestCase[] = [
	{
		title: "By default unhandled errors are not retried even if max retries is > 0",
		canRetryUnhandledError: resolveDefaultRetryStrategyOptions({}).canRetryUnhandledError,
		maxRetries: 5,
		expectedRetries: 0,
		fetchResponse: {
			statusCode: 500,
			json: {},
		},
	},
	{
		title: `Can't retry if canRetryUnhandledError returns false`,
		canRetryUnhandledError: () => false,
		maxRetries: 5,
		expectedRetries: 0,
		fetchResponse: {
			statusCode: 500,
			json: {},
		},
	},
	{
		title: "Can retry when unhandled errors are set to be retried via custom callback",
		canRetryUnhandledError: () => true,
		maxRetries: 1,
		expectedRetries: 1,
		fetchResponse: {
			statusCode: 500,
			json: {},
		},
	},
];

for (const testCase of testCases) {
	describe(testCase.title, async () => {
		const { success, error } = await getTestHttpServiceWithJsonResponse({
			jsonResponse: testCase.fetchResponse.json,
			statusCode: testCase.fetchResponse.statusCode,
			retryStrategy: testCase,
			isValidResponse: false,
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
			console.log(error);
			expect(error?.details.retryAttempt).toBe(testCase.expectedRetries);
		});
	});
}
