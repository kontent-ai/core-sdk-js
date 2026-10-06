import { describe, expect, it } from "vitest";
import { getTestHttpServiceWithJsonResponse } from "../../../lib/testkit/testkit.utils.js";

const notFoundStatus = 404;

describe("Http service - retry strategy options resolution", () => {
	it("Should resolve retry strategy options once per service and reuse them for all requests", async () => {
		const httpService = getTestHttpServiceWithJsonResponse({ jsonResponse: null, statusCode: notFoundStatus });

		const { error: firstError } = await httpService.request({ url: "https://domain.com/1", method: "GET" });
		const { error: secondError } = await httpService.request({ url: "https://domain.com/2", method: "GET" });

		expect(firstError?.retryStrategyOptions).toBeDefined();
		expect(secondError?.retryStrategyOptions).toBe(firstError?.retryStrategyOptions);
	});

	it("Should resolve separate retry strategy options for each service", async () => {
		const firstService = getTestHttpServiceWithJsonResponse({
			jsonResponse: null,
			statusCode: notFoundStatus,
			retryStrategy: { maxRetries: 1 },
		});
		const secondService = getTestHttpServiceWithJsonResponse({
			jsonResponse: null,
			statusCode: notFoundStatus,
			retryStrategy: { maxRetries: 2 },
		});

		const { error: firstError } = await firstService.request({ url: "https://domain.com", method: "GET" });
		const { error: secondError } = await secondService.request({ url: "https://domain.com", method: "GET" });

		expect(firstError?.retryStrategyOptions?.maxRetries).toBe(1);
		expect(secondError?.retryStrategyOptions?.maxRetries).toBe(2);
	});
});
