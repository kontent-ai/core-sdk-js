import { describe, expect, it } from "vitest";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { RetryStrategyOptions } from "../../../lib/models/core.models.js";

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
	for (const [, retryStrategy] of Object.entries(testRetryStrategies)) {
		const { success, error } = await getDefaultHttpService({
			retryStrategy,
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

		it("Error should be of unknown type", () => {
			expect(error?.details.reason).toBe("unknown");
		});

		it("Success should be false", () => {
			expect(success).toBe(false);
		});

		it("Error should be defined", () => {
			expect(error).toBeDefined();
		});

		it(`Should retry '${retryStrategy.maxRetries}' times`, () => {
			expect(error?.retryAttempt).toStrictEqual(retryStrategy.maxRetries);
		});
	}
});
