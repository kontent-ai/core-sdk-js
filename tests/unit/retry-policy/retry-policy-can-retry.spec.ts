import { afterAll, describe, expect, it, vi } from "vitest";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { RetryStrategyOptions } from "../../../lib/models/core.models.js";
import type { FetchResponse } from "../../../lib/testkit/testkit.models.js";
import { mockGlobalFetchJsonResponse } from "../../../lib/testkit/testkit.utils.js";
import { resolveRetryStrategyOptions } from "../../../lib/utils/retry.utils.js";

type TestCase = RetryStrategyOptions & {
	readonly title: string;
	readonly expectedRetries: number;
	readonly fetchResponse: FetchResponse;
};

const testCases: readonly TestCase[] = [
	{
		title: "Default retry - Can retry",
		canRetryError: resolveRetryStrategyOptions({}).canRetryError,
		maxRetries: 1,
		expectedRetries: 1,
		getDelayBetweenRetriesMs: () => 0,
		fetchResponse: {
			statusCode: 500,
			json: {},
		},
	},
	{
		title: `Default retry - Can't retry`,
		canRetryError: resolveRetryStrategyOptions({}).canRetryError,
		maxRetries: 0,
		expectedRetries: 0,
		getDelayBetweenRetriesMs: () => 0,
		fetchResponse: {
			statusCode: 400,
			json: {},
		},
	},
	{
		title: `Custom retry - Can't retry`,
		canRetryError: () => false,
		maxRetries: 1,
		expectedRetries: 0,
		getDelayBetweenRetriesMs: () => 0,
		fetchResponse: {
			statusCode: 500,
			json: {},
		},
	},
	{
		title: "Custom retry - Can retry",
		canRetryError: () => true,
		maxRetries: 1,
		expectedRetries: 1,
		getDelayBetweenRetriesMs: () => 0,
		fetchResponse: {
			statusCode: 500,
			json: {},
		},
	},
];

for (const testCase of testCases) {
	describe(testCase.title, async () => {
		afterAll(() => {
			vi.resetAllMocks();
		});

		mockGlobalFetchJsonResponse({
			jsonResponse: testCase.fetchResponse.json,
			statusCode: testCase.fetchResponse.statusCode,
		});

		const { success, error } = await getDefaultHttpService({
			retryStrategy: testCase,
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

		it(`Should retry '${testCase.expectedRetries}' times`, () => {
			expect(error?.details.retryAttempt).toBe(testCase.expectedRetries);
		});
	});
}
