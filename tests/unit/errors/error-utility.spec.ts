import { describe, expect, it } from "vitest";
import { createSdkError, isKontent404Error } from "../../../lib/utils/error.utils.js";

describe("isKontent404Error utility function", () => {
	it("Is Kontent AI not found error should be false", () => {
		expect(
			isKontent404Error(
				createSdkError({
					message: "",
					url: "",
					reason: "notFound",
					isValidResponse: false,
					status: 404,
					statusText: "",
					responseHeaders: [],
					retryAttempt: undefined,
					retryStrategyOptions: undefined,
					kontentErrorResponse: undefined,
				}),
			),
		).toBe(true);
	});

	it("Is Kontent AI not found error should be false", () => {
		expect(
			isKontent404Error(
				createSdkError({
					message: "",
					url: "",
					reason: "invalidResponse",
					isValidResponse: false,
					status: 404,
					statusText: "",
					responseHeaders: [],
					retryAttempt: undefined,
					retryStrategyOptions: undefined,
					kontentErrorResponse: undefined,
				}),
			),
		).toBe(false);
	});
});
