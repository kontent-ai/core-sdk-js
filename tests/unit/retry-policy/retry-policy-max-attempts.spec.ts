import { describe, expect, it } from "vitest";
import type { RetryStrategyOptions } from "../../../lib/models/core.models.js";
import { getTestHttpServiceWithJsonResponse } from "../../../lib/testkit/testkit.utils.js";

const testRetryStrategies: readonly RetryStrategyOptions[] = [
	{
		maxRetries: 0,
		canRetryUnhandledError: () => true,
	},
	{
		maxRetries: 1,
		canRetryUnhandledError: () => true,
	},
	{
		maxRetries: 2,
		canRetryUnhandledError: () => true,
	},
	{
		maxRetries: 5,
		canRetryUnhandledError: () => true,
	},
];

describe("Retry policy - max retries", async () => {
	for (const [maxRetries, retryStrategy] of Object.entries(testRetryStrategies)) {
		const { success, error } = await getTestHttpServiceWithJsonResponse({
			jsonResponse: {},
			statusCode: 500,
			retryStrategy,
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

		it(`Should retry '${maxRetries}' times`, () => {
			expect(error?.retryAttempt).toStrictEqual(retryStrategy.maxRetries);
		});
	}
});
