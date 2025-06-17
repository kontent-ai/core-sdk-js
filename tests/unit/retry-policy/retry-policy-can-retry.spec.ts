import { afterAll, describe, expect, it, vi } from "vitest";
import type { FetchResponse } from "../../../lib/devkit/devkit.models.js";
import { getFetchJsonMock } from "../../../lib/devkit/test.utils.js";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { RetryStrategyOptions } from "../../../lib/models/core.models.js";
import { toRequiredRetryStrategyOptions } from "../../../lib/utils/retry.utils.js";

const testCases: readonly {
	readonly title: string;
	readonly canRetryError: NonNullable<RetryStrategyOptions["canRetryError"]>;
	readonly maxRetries: number;
	readonly expectedRetries: number;
	readonly fetchResponse: FetchResponse;
}[] = [
	{
		title: "Default retry - Can retry",
		canRetryError: toRequiredRetryStrategyOptions({}).canRetryError,
		maxRetries: 1,
		expectedRetries: 1,
		fetchResponse: {
			statusCode: 500,
			json: {},
		},
	},
	{
		title: `Default retry - Can't retry`,
		canRetryError: toRequiredRetryStrategyOptions({}).canRetryError,
		maxRetries: 0,
		expectedRetries: 0,
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

		global.fetch = getFetchJsonMock({
			json: testCase.fetchResponse.json,
			status: testCase.fetchResponse.statusCode,
		});

		const { success, error } = await getDefaultHttpService({
			retryStrategy: toRequiredRetryStrategyOptions({
				canRetryError: testCase.canRetryError,
				getDelayBetweenRetriesMs: () => 0,
				maxRetries: testCase.maxRetries,
				logRetryAttempt: false,
			}),
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
			expect(error?.retryAttempt).toBe(testCase.expectedRetries);
		});
	});
}
