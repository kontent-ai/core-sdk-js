import { afterAll, describe, expect, it, vi } from "vitest";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { RetryStrategyOptions } from "../../../lib/models/core.models.js";
import { mockGlobalFetchJsonResponse } from "../../../lib/testkit/testkit.utils.js";

const testRetryStrategies: readonly RetryStrategyOptions[] = [
	{
		maxRetries: 0,
		getDelayBetweenRetriesMs: () => 0,
		canRetryError: () => true,
	},
	{
		maxRetries: 1,
		getDelayBetweenRetriesMs: () => 0,
		canRetryError: () => true,
	},
	{
		maxRetries: 2,
		getDelayBetweenRetriesMs: () => 0,
		canRetryError: () => true,
	},
	{
		maxRetries: 5,
		getDelayBetweenRetriesMs: () => 0,
		canRetryError: () => true,
	},
];

describe("Retry policy - max retries", async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	for (const [maxRetries, retryStrategy] of Object.entries(testRetryStrategies)) {
		mockGlobalFetchJsonResponse({
			jsonResponse: {},
			statusCode: 500,
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
			expect(error?.details.retryAttempt).toStrictEqual(retryStrategy.maxRetries);
		});
	}
});
